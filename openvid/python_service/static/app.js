const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const audioEl = document.getElementById("player");
const qrLinkEl = document.getElementById("qrLink");
const qrImage = document.getElementById("qrImage");
const debugEl = document.getElementById("debugLog");

let pc = null;
let playbackStream = null;
let audioContext = null;
let audioSourceNode = null;
let audioGainNode = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function logDebug(message) {
  if (!debugEl) return;
  const now = new Date().toLocaleTimeString();
  debugEl.textContent = `[${now}] ${message}\n` + debugEl.textContent;
}

function setQrLink(url) {
  if (!qrLinkEl) return;
  const linkUrl = url || window.location.origin;
  qrLinkEl.textContent = "";
  const link = document.createElement("a");
  link.href = linkUrl;
  link.textContent = linkUrl;
  link.className = "qr-link";
  link.target = "_blank";
  link.rel = "noopener";
  qrLinkEl.appendChild(link);
}

function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext) {
    audioContext = new Ctx();
  }
  return audioContext;
}

function attachAudioContext() {
  const ctx = getAudioContext();
  if (!ctx || !playbackStream) return;
  if (playbackStream.getAudioTracks().length === 0) {
    return;
  }
  if (!audioGainNode) {
    audioGainNode = ctx.createGain();
    audioGainNode.gain.value = 1.0;
    audioGainNode.connect(ctx.destination);
  }
  if (!audioSourceNode) {
    audioSourceNode = ctx.createMediaStreamSource(playbackStream);
    audioSourceNode.connect(audioGainNode);
  }
}

async function unlockAudioContext() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (_) {
      // Ignore resume errors; user may need to tap again.
    }
  }
}

function prepareAudioPlayback() {
  if (!audioEl) return;
  audioEl.muted = false;
  audioEl.volume = 1.0;
  if (!playbackStream) {
    playbackStream = new MediaStream();
  }
  if (audioEl.srcObject !== playbackStream) {
    audioEl.srcObject = playbackStream;
  }
  logDebug("Audio element prepared");
}

async function loadConfig() {
  try {
    const resp = await fetch("/config");
    if (!resp.ok) return;
    const cfg = await resp.json();
    metaEl.textContent = `Source: ${cfg.source} · ${cfg.sampleRate / 1000} kHz · ${cfg.channels} ch`;
    logDebug("Config loaded");
    setQrLink(cfg.displayUrl || window.location.origin);
    if (qrImage && cfg.displayUrl) {
      qrImage.alt = `QR code for ${cfg.displayUrl}`;
    }
  } catch (_) {
    // Ignore config fetch errors for offline setup.
  }
}

async function startStream() {
  if (pc) return;
  setStatus("Connecting...");
  logDebug("Start pressed");
  startBtn.disabled = true;
  prepareAudioPlayback();
  await unlockAudioContext();
  audioEl.play().catch(() => {
    setStatus("Tap to enable audio");
    logDebug("Audio play rejected");
  });

  pc = new RTCPeerConnection({ iceServers: [] });
  const connection = pc;
  connection.addTransceiver("audio", { direction: "recvonly" });

  const waitForIce = () =>
    new Promise((resolve) => {
      if (connection.iceGatheringState === "complete") {
        resolve();
        return;
      }
      const timeout = setTimeout(resolve, 2000);
      const handler = () => {
        if (connection.iceGatheringState === "complete") {
          clearTimeout(timeout);
          connection.removeEventListener("icegatheringstatechange", handler);
          resolve();
        }
      };
      connection.addEventListener("icegatheringstatechange", handler);
    });

  connection.ontrack = (event) => {
    prepareAudioPlayback();
    if (event.track && playbackStream) {
      const exists = playbackStream.getTracks().some((track) => track.id === event.track.id);
      if (!exists) {
        playbackStream.addTrack(event.track);
      }
    }
    attachAudioContext();
    audioEl.play().catch(() => {});
  };

  connection.onconnectionstatechange = () => {
    const state = connection.connectionState;
    if (state === "connected") {
      setStatus("Streaming");
    }
    if (state === "failed" || state === "disconnected" || state === "closed") {
      stopStream(connection);
    }
  };

  const offer = await connection.createOffer();
  await connection.setLocalDescription(offer);
  await waitForIce();
  logDebug(`ICE gathering state: ${connection.iceGatheringState}`);

  let answer;
  try {
    const resp = await fetch("/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(connection.localDescription),
    });

    if (!resp.ok) {
      const payload = await resp.json().catch(() => ({}));
      throw new Error(payload.error || `Connection failed (${resp.status})`);
    }

    answer = await resp.json();
    logDebug("Received answer");
  } catch (err) {
    setStatus(err.message || "Connection failed");
    logDebug(`Offer failed: ${err.message || err}`);
    startBtn.disabled = false;
    connection.close();
    if (pc === connection) {
      pc = null;
    }
    return;
  }

  await connection.setRemoteDescription(answer);
  stopBtn.disabled = false;
  setStatus("Streaming");
  logDebug("Streaming");
}

function stopStream(targetPc = pc) {
  if (!targetPc) return;
  targetPc.getSenders().forEach((sender) => sender.track && sender.track.stop());
  targetPc.close();
  if (pc === targetPc) {
    pc = null;
  }
  if (playbackStream) {
    playbackStream.getTracks().forEach((track) => track.stop());
  }
  playbackStream = null;
  if (audioSourceNode) {
    try {
      audioSourceNode.disconnect();
    } catch (_) {}
    audioSourceNode = null;
  }
  if (audioGainNode) {
    try {
      audioGainNode.disconnect();
    } catch (_) {}
    audioGainNode = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  audioEl.srcObject = null;
  setStatus("Idle");
  logDebug("Stopped");
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

window.addEventListener("error", (event) => {
  logDebug(`Error: ${event.message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  logDebug(`Promise rejection: ${event.reason}`);
});

startBtn.addEventListener("click", startStream);
stopBtn.addEventListener("click", stopStream);

setQrLink(window.location.origin);
loadConfig();

if (qrImage) {
  qrImage.addEventListener("error", () => {
    qrImage.style.display = "none";
    if (qrLinkEl && !qrLinkEl.textContent) {
      setQrLink(window.location.origin);
    }
  });
}
