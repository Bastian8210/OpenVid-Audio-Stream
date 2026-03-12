OpenVid – Stream Windows Audio to iPhone
<p align="center"> <img src="openvid/assets/openvid-banner.svg" alt="OpenVid banner" width="100%" /> </p> <p align="center"> <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" alt="Python" /> <img src="https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white" alt="Windows" /> <img src="https://img.shields.io/badge/Client-iOS%20Safari-000000?logo=apple&logoColor=white" alt="iOS Safari" /> <img src="https://img.shields.io/badge/WebRTC-Low%20Latency-FF6B00?logo=webrtc&logoColor=white" alt="WebRTC" /> </p>

OpenVid lets you stream your Windows system audio or microphone to an iPhone using Safari, with near‑zero latency. Perfect for remote monitoring, streaming, or mobile listening.

🔍 Discover OpenVid

Keywords: Windows audio streaming, iPhone audio, WebRTC audio, loopback, virtual audio cable, low latency streaming.

Use Cases: Stream PC audio to mobile, monitor music or game audio on your phone, remote audio testing.

No iPhone app required: Works fully in Safari.

Why OpenVid?

Fast: WebRTC + Opus codec ensures ultra-low latency.

Simple: One Python service, one Safari page.

Flexible: Stream via Wi-Fi or USB tethered. Capture mic or system audio.

Zero iPhone installs: Works in any modern Safari browser.

Quick Start (No venv)
cd python_service
pip install -r requirements.txt
python app.py --source loopback

The server prints Host page (open on PC) and Listen page (open on iPhone).

Scan the QR code from the host page to your iPhone. Tap Start Stream to begin.

Optional: Setup Loopback

If your system lacks a loopback device (e.g., no Stereo Mix):

Install a virtual audio cable.

VB‑Audio Virtual Cable: https://vb-audio.com/Cable/

Set it as the default output device. This ensures a reliable loopback source.

How OpenVid Works

PC captures audio via sounddevice.

Audio is sent over WebRTC using the Opus codec.

iOS Safari plays the audio after user interaction.

Usage

List devices:

python app.py --list-devices

Stream system audio:

python app.py --source loopback --device <index>

Stream microphone:

python app.py --source mic

Adjust latency:

python app.py --blocksize 480

Arguments

Argument	Description
`--source mic	loopback`
--device	Sounddevice index
`--channels 1	2`
--blocksize	Smaller = lower latency, may glitch; larger = more stable
Troubleshooting

No audio on iPhone: Make sure Start Stream is tapped.

No loopback device: Enable Stereo Mix or install a virtual audio cable.

Silent capture: Check the Stereo Mix meter while audio plays.

Glitches: Increase --blocksize (e.g., 960 → 1920).

Screen sleep: Keep the iPhone awake to prevent audio pause.

Compatibility

Sender: Windows 10 / 11

Receiver: iOS Safari

Note: OpenVid works on your local network. Streaming over the internet requires a TURN server.

Keywords for Search

Windows audio streaming, iPhone Safari audio, WebRTC audio stream, loopback audio, virtual audio cable, low latency audio, PC to iPhone audio.
