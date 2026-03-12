import asyncio
import logging
import sys
from dataclasses import dataclass
from fractions import Fraction

import numpy as np
import sounddevice as sd
from aiortc import MediaStreamTrack
from av import AudioFrame


@dataclass
class AudioConfig:
    source: str = "mic"
    device: int | None = None
    channels: int = 2
    sample_rate: int = 48000
    blocksize: int = 960  # 20 ms at 48 kHz
    queue_size: int = 8


class AudioSource:
    def __init__(self, config: AudioConfig):
        self.config = config
        self._queue: asyncio.Queue[np.ndarray] = asyncio.Queue(maxsize=config.queue_size)
        self._loop = asyncio.get_running_loop()
        self._stream: sd.InputStream | None = None
        self._running = False

    def start(self) -> None:
        if self._running:
            return
        self._running = True

        loopback = self.config.source == "loopback"
        device = self._resolve_device(loopback)
        extra_settings = None

        if loopback and sys.platform == "win32":
            try:
                extra_settings = sd.WasapiSettings(loopback=True)
            except TypeError:
                # Older sounddevice builds do not expose the loopback flag.
                if self.config.device is None:
                    loopback_device = self._find_loopback_device(device)
                    if loopback_device is not None:
                        device = loopback_device
                    else:
                        raise RuntimeError(
                            "WASAPI loopback not supported by this sounddevice build. "
                            "Update sounddevice/PortAudio or choose a loopback device from --list-devices."
                        )
                # If the user explicitly selected a device, trust it even if we
                # cannot verify loopback support via the name.

        self._coerce_channels(device)

        self._stream = sd.InputStream(
            device=device,
            channels=self.config.channels,
            samplerate=self.config.sample_rate,
            blocksize=self.config.blocksize,
            dtype="int16",
            latency="low",
            callback=self._callback,
            extra_settings=extra_settings,
        )
        self._stream.start()

    def stop(self) -> None:
        self._running = False
        if self._stream is None:
            return
        try:
            self._stream.stop()
        finally:
            self._stream.close()
            self._stream = None

    def _resolve_device(self, loopback: bool) -> int | None:
        if self.config.device is not None:
            return self.config.device

        default_in, default_out = sd.default.device
        if loopback:
            device = default_out
        else:
            device = default_in

        if device is None or device == -1:
            return None
        return device

    def _coerce_channels(self, device: int | None) -> None:
        if device is None or device == -1:
            return
        try:
            info = sd.query_devices(device)
        except Exception:
            return
        max_in = int(info.get("max_input_channels") or 0)
        if max_in <= 0:
            return
        if self.config.channels > max_in:
            logging.getLogger("openvid").warning(
                "Requested %d channels but device supports %d. Using %d.",
                self.config.channels,
                max_in,
                max_in,
            )
            self.config.channels = max_in

    def _find_loopback_device(self, output_device: int | None) -> int | None:
        try:
            devices = sd.query_devices()
        except Exception:
            return None

        output_name = None
        output_hostapi = None
        if output_device is not None and output_device != -1:
            try:
                output_info = devices[output_device]
                output_name = output_info.get("name")
                output_hostapi = output_info.get("hostapi")
            except Exception:
                output_name = None
                output_hostapi = None

        for idx, dev in enumerate(devices):
            name = str(dev.get("name", ""))
            if dev.get("max_input_channels", 0) <= 0:
                continue
            if "loopback" not in name.lower():
                continue
            if output_hostapi is not None and dev.get("hostapi") != output_hostapi:
                continue
            if output_name and output_name not in name:
                continue
            return idx
        return None

    def _is_loopback_device(self, device: int | None) -> bool:
        if device is None or device == -1:
            return False
        try:
            name = str(sd.query_devices(device).get("name", ""))
        except Exception:
            return False
        return "loopback" in name.lower()

    def _callback(self, indata, frames, time_info, status) -> None:
        if not self._running:
            return
        data = np.ascontiguousarray(indata.copy())
        self._loop.call_soon_threadsafe(self._enqueue, data)

    def _enqueue(self, data: np.ndarray) -> None:
        if self._queue.full():
            try:
                self._queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        try:
            self._queue.put_nowait(data)
        except asyncio.QueueFull:
            pass

    async def read(self) -> np.ndarray:
        return await self._queue.get()


class SoundDeviceStreamTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self, source: AudioSource):
        super().__init__()
        self._source = source
        self._sample_rate = source.config.sample_rate
        self._channels = source.config.channels
        self._timestamp = 0
        self._time_base = Fraction(1, self._sample_rate)

    async def recv(self) -> AudioFrame:
        data = await self._source.read()
        packed = np.ascontiguousarray(data).reshape(1, -1)
        frame = AudioFrame.from_ndarray(
            packed,
            format="s16",
            layout="stereo" if self._channels == 2 else "mono",
        )
        frame.sample_rate = self._sample_rate
        frame.pts = self._timestamp
        frame.time_base = self._time_base
        self._timestamp += frame.samples
        return frame


def list_devices() -> str:
    lines = []
    for idx, dev in enumerate(sd.query_devices()):
        marker = " "
        if idx == sd.default.device[0]:
            marker = "i"
        if idx == sd.default.device[1]:
            marker = "o"
        lines.append(f"[{idx:02d}] ({marker}) {dev['name']}")
    return "\n".join(lines)
