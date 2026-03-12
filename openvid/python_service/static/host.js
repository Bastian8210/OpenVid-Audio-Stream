const statusEl = document.getElementById("status");
const hostMeta = document.getElementById("hostMeta");
const listenLinkEl = document.getElementById("listenLink");
const qrImage = document.getElementById("qrImage");

function setStatus(text) {
  if (statusEl) {
    statusEl.textContent = text;
  }
}

function setLink(el, url) {
  if (!el) return;
  el.textContent = "";
  const link = document.createElement("a");
  link.href = url;
  link.textContent = url;
  link.className = "qr-link";
  link.target = "_blank";
  link.rel = "noopener";
  el.appendChild(link);
}

async function loadConfig() {
  const fallbackBase = `${window.location.origin}/`;
  const fallbackListen = `${window.location.origin}/listen`;
  try {
    const resp = await fetch("/config");
    if (!resp.ok) throw new Error("config failed");
    const cfg = await resp.json();
    const baseUrl = cfg.displayUrl || fallbackBase;
    const listenUrl = cfg.listenUrl || fallbackListen;
    if (hostMeta) {
      hostMeta.textContent = `Host: ${baseUrl}`;
    }
    setLink(listenLinkEl, listenUrl);
    if (qrImage) {
      qrImage.alt = `QR code for ${listenUrl}`;
    }
  } catch (_) {
    if (hostMeta) {
      hostMeta.textContent = `Host: ${fallbackBase}`;
    }
    setLink(listenLinkEl, fallbackListen);
  }
}

setStatus("Ready");
loadConfig();
