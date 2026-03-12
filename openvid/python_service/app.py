import argparse
import asyncio
import io
import logging
import socket
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription
from rich.console import Console
from rich.logging import RichHandler
from rich.table import Table

from audio_source import AudioConfig, AudioSource, SoundDeviceStreamTrack, list_devices

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"

LOG = logging.getLogger("openvid")


async def index(request: web.Request) -> web.FileResponse:
    return web.FileResponse(STATIC_DIR / "index.html")


async def listen_page(request: web.Request) -> web.FileResponse:
    return web.FileResponse(STATIC_DIR / "listen.html")


def get_base_url(request: web.Request) -> str:
    request_url = str(request.url.with_path("/").with_query({}))
    if request.url.host not in ("127.0.0.1", "localhost"):
        return request_url

    app_url = request.app.get("display_url")
    if app_url:
        try:
            parsed = urlparse(app_url)
        except ValueError:
            parsed = None
        if parsed and parsed.hostname not in ("127.0.0.1", "localhost"):
            return app_url
    return request_url


def get_listen_url(request: web.Request) -> str:
    base = get_base_url(request)
    if not base.endswith("/"):
        base += "/"
    return f"{base}listen"


def render_peer_table(app: web.Application) -> Table:
    table = Table(title="Active Connections", header_style="bold cyan", show_lines=False)
    table.add_column("ID", justify="right", style="bold")
    table.add_column("State")
    table.add_column("Remote")
    table.add_column("Source")
    table.add_column("Channels", justify="right")
    table.add_column("Since")

    peers = list(app.get("peers", {}).values())
    if not peers:
        table.add_row("-", "idle", "-", "-", "-", "-")
        return table

    for peer in peers:
        table.add_row(
            str(peer["id"]),
            peer.get("state", "-"),
            peer.get("remote", "-"),
            peer.get("source", "-"),
            str(peer.get("channels", "-")),
            peer.get("since", "-"),
        )
    return table


def print_peer_table(app: web.Application) -> None:
    console: Console | None = app.get("console")
    if console is None:
        return
    console.print(render_peer_table(app))


async def wait_for_ice_gathering_complete(pc: RTCPeerConnection, timeout: float = 2.0) -> None:
    if pc.iceGatheringState == "complete":
        return
    done = asyncio.Event()

    @pc.on("icegatheringstatechange")
    def on_ice_gathering_state_change() -> None:
        if pc.iceGatheringState == "complete":
            done.set()

    try:
        await asyncio.wait_for(done.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        pass


async def get_config(request: web.Request) -> web.Response:
    cfg: AudioConfig = request.app["audio_config"]
    return web.json_response(
        {
            "source": cfg.source,
            "channels": cfg.channels,
            "sampleRate": cfg.sample_rate,
            "blocksize": cfg.blocksize,
            "displayUrl": get_base_url(request),
            "listenUrl": get_listen_url(request),
        }
    )


async def qr_code(request: web.Request) -> web.Response:
    url = get_listen_url(request)
    try:
        import qrcode
        import qrcode.image.svg
    except Exception as exc:
        return web.Response(
            text=f"QR unavailable ({exc}). Open {url}",
            content_type="text/plain",
        )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(image_factory=qrcode.image.svg.SvgImage)
    buf = io.BytesIO()
    image.save(buf)
    return web.Response(text=buf.getvalue().decode("utf-8"), content_type="image/svg+xml")


async def offer(request: web.Request) -> web.Response:
    app = request.app
    lock: asyncio.Lock = app["conn_lock"]

    async with lock:
        active_pc = app.get("active_pc")
        if active_pc and active_pc.connectionState not in ("closed", "failed", "disconnected"):
            return web.json_response({"error": "busy"}, status=409)

        params = await request.json()
        offer_sdp = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        pc = RTCPeerConnection()
        app["active_pc"] = pc
        app["pcs"].add(pc)

        cfg: AudioConfig = app["audio_config"]
        peer_id = app["peer_counter"] + 1
        app["peer_counter"] = peer_id
        peername = request.transport.get_extra_info("peername") if request.transport else None
        remote = peername[0] if isinstance(peername, tuple) and peername else "-"
        app["peers"][pc] = {
            "id": peer_id,
            "state": "new",
            "remote": remote,
            "source": cfg.source,
            "channels": cfg.channels,
            "since": datetime.now().strftime("%H:%M:%S"),
        }

        source = AudioSource(cfg)
        try:
            source.start()
        except Exception as exc:
            await pc.close()
            app["pcs"].discard(pc)
            app["active_pc"] = None
            app["peers"].pop(pc, None)
            print_peer_table(app)
            return web.json_response({"error": f"Audio start failed: {exc}"}, status=500)
        app["sources"][pc] = source
        print_peer_table(app)

        track = SoundDeviceStreamTrack(source)
        pc.addTrack(track)

        @pc.on("connectionstatechange")
        async def on_connectionstatechange() -> None:
            if pc in app["peers"]:
                app["peers"][pc]["state"] = pc.connectionState
                print_peer_table(app)
            if pc.connectionState in ("failed", "closed", "disconnected"):
                await cleanup_peer(app, pc)

        await pc.setRemoteDescription(offer_sdp)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await wait_for_ice_gathering_complete(pc)

        LOG.info("WebRTC connection established")
        return web.json_response(
            {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
        )


async def cleanup_peer(app: web.Application, pc: RTCPeerConnection) -> None:
    source = app["sources"].pop(pc, None)
    if source:
        source.stop()
    if pc in app["pcs"]:
        app["pcs"].remove(pc)
    if app.get("active_pc") is pc:
        app["active_pc"] = None
    app["peers"].pop(pc, None)
    print_peer_table(app)
    await pc.close()


async def on_shutdown(app: web.Application) -> None:
    for pc in list(app["pcs"]):
        await cleanup_peer(app, pc)


def get_primary_ip() -> str:
    ip = "127.0.0.1"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
    except OSError:
        pass
    finally:
        sock.close()
    return ip


def build_app(config: AudioConfig) -> web.Application:
    app = web.Application()
    app["audio_config"] = config
    app["pcs"] = set()
    app["sources"] = {}
    app["active_pc"] = None
    app["conn_lock"] = asyncio.Lock()
    app["peers"] = {}
    app["peer_counter"] = 0

    app.router.add_get("/", index)
    app.router.add_get("/listen", listen_page)
    app.router.add_get("/config", get_config)
    app.router.add_get("/qr", qr_code)
    app.router.add_post("/offer", offer)
    app.router.add_static("/static", STATIC_DIR, show_index=False)

    app.on_shutdown.append(on_shutdown)
    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OpenVid low-latency audio streamer")
    parser.add_argument("--bind", default="0.0.0.0", help="Bind address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    parser.add_argument("--source", choices=["mic", "loopback"], default="loopback")
    parser.add_argument("--device", type=int, default=None, help="Sounddevice index")
    parser.add_argument("--channels", type=int, default=2, choices=[1, 2])
    parser.add_argument("--sample-rate", type=int, default=48000)
    parser.add_argument("--blocksize", type=int, default=960, help="Frames per chunk (default: 960)")
    parser.add_argument("--list-devices", action="store_true", help="List audio devices and exit")
    return parser.parse_args()


def main() -> None:
    console = Console()
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True)],
    )
    args = parse_args()

    if args.list_devices:
        print(list_devices())
        return

    config = AudioConfig(
        source=args.source,
        device=args.device,
        channels=args.channels,
        sample_rate=args.sample_rate,
        blocksize=args.blocksize,
    )

    primary_ip = get_primary_ip()
    base_url = f"http://{primary_ip}:{args.port}/"
    listen_url = f"{base_url}listen"

    app = build_app(config)
    app["console"] = console
    app["display_url"] = base_url
    app["listen_url"] = listen_url
    print_peer_table(app)

    hostname = socket.gethostname()
    LOG.info("OpenVid running.")
    LOG.info("  Host page:   %s", base_url)
    LOG.info("  Listen page: %s", listen_url)
    LOG.info("  http://%s.local:%d (if Bonjour/mDNS is available)", hostname, args.port)

    web.run_app(app, host=args.bind, port=args.port)


if __name__ == "__main__":
    main()
