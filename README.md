# OpenVid Audio Stream

<p align="center">
  <img src="assets/openvid-banner.svg" alt="OpenVid banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Client-iOS%20Safari-000000?logo=apple&logoColor=white" alt="iOS Safari" />
  <img src="https://img.shields.io/badge/WebRTC-Low%20Latency-FF6B00?logo=webrtc&logoColor=white" alt="WebRTC" />
</p>

<p align="center">
  <b>Stream system audio from your Windows PC to your iPhone with near‑zero latency.</b>
</p>

---

## Why OpenVid
- **Fast**: WebRTC + Opus keeps latency tight.
- **Simple**: One local Python service, one Safari page.
- **Flexible**: Wi‑Fi or USB tethered, mic or loopback.
- **No installs on iPhone**: Pure Safari playback.

## Quick Start (No venv)
```powershell
cd python_service
pip install -r requirements.txt
python app.py --source loopback
```

The server prints:
- **Host page** (open on the PC)
- **Listen page** (open on the iPhone)

Open the host page on the PC and scan the QR to open the listen page on your iPhone. Tap **Start Stream** on the iPhone.

## Optional (Recommended for Loopback)
If your system has no loopback device (e.g., no Stereo Mix), install a virtual audio cable and set it as the default output device. This gives the app a reliable loopback source.

- VB‑Audio Virtual Cable: https://vb-audio.com/Cable/

## How It Works
1. PC captures audio with `sounddevice`.
2. WebRTC transports audio to iPhone using Opus.
3. iOS plays the stream after a user tap.

## Usage
List devices:
```powershell
python app.py --list-devices
```

Stream system audio:
```powershell
python app.py --source loopback --device <index>
```

Stream microphone:
```powershell
python app.py --source mic
```

Tune latency:
```powershell
python app.py --blocksize 480
```

Arguments:
- `--source mic|loopback` selects microphone vs system audio.
- `--device` chooses a specific sounddevice index.
- `--channels 1|2` selects mono or stereo capture.
- `--blocksize` controls latency. Smaller values reduce latency but may glitch.

## Troubleshooting
- **No audio on iPhone**: Make sure you tapped **Start Stream** on the iPhone.
- **No loopback device**: Enable Stereo Mix or install a virtual audio cable.
- **Silent capture**: Check the Stereo Mix level meter moves while audio plays.
- **Glitches**: Increase `--blocksize` (e.g. `960 -> 1920`).
- **Screen sleep**: Keep the iPhone screen awake to avoid audio pause.

## Compatibility
- Windows 10/11 (sender)
- iOS Safari (receiver)

## Notes
This is a local‑network tool. It does not require external STUN/TURN servers. For remote streaming across the internet, a TURN server would be required.

