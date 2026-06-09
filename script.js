/* =============================================
   GLITCH CLUB AARHUS — INDUSTRIAL JS
   ============================================= */

// ── Background canvas: static / concrete damage ───────────────
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx    = bgCanvas.getContext('2d');

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

let staticFrame = 0;

function drawStatic() {
  const W = bgCanvas.width;
  const H = bgCanvas.height;
  bgCtx.clearRect(0, 0, W, H);
  staticFrame++;

  // Sparse horizontal scan damage lines
  const lineCount = 4 + Math.floor(Math.random() * 5);
  for (let i = 0; i < lineCount; i++) {
    const y     = Math.random() * H;
    const len   = 30 + Math.random() * 200;
    const x     = Math.random() * (W - len);
    const alpha = 0.04 + Math.random() * 0.08;
    bgCtx.fillStyle = `rgba(212,255,0,${alpha})`;
    bgCtx.fillRect(x, y, len, 1 + Math.random());
  }

  // Occasional bright blowout strip
  if (Math.random() < 0.04) {
    const y = Math.random() * H;
    const h = 1 + Math.floor(Math.random() * 3);
    bgCtx.fillStyle = `rgba(212,255,0,${0.12 + Math.random() * 0.1})`;
    bgCtx.fillRect(0, y, W, h);
  }

  // Sparse dim grid
  bgCtx.strokeStyle = 'rgba(60,60,50,0.18)';
  bgCtx.lineWidth   = 1;
  const step = 80;
  for (let x = 0; x < W; x += step) {
    bgCtx.beginPath();
    bgCtx.moveTo(x, 0);
    bgCtx.lineTo(x, H);
    bgCtx.stroke();
  }
  for (let y = 0; y < H; y += step) {
    bgCtx.beginPath();
    bgCtx.moveTo(0, y);
    bgCtx.lineTo(W, y);
    bgCtx.stroke();
  }

  requestAnimationFrame(drawStatic);
}
drawStatic();

// ── Hero waveform: harsh sawtooth/square hybrid ────────────────
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx    = waveCanvas.getContext('2d');
let   waveT      = 0;

function resizeWave() {
  waveCanvas.width  = waveCanvas.offsetWidth;
  waveCanvas.height = waveCanvas.offsetHeight;
}
resizeWave();
window.addEventListener('resize', resizeWave);

function drawWave() {
  const W = waveCanvas.width;
  const H = waveCanvas.height;
  waveCtx.clearRect(0, 0, W, H);
  waveT += 0.022;

  // Main harsh waveform
  waveCtx.lineWidth   = 2;
  waveCtx.strokeStyle = 'rgba(212,255,0,0.7)';
  waveCtx.shadowColor = 'rgba(212,255,0,0.8)';
  waveCtx.shadowBlur  = 4;
  waveCtx.beginPath();

  const segs = 180;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * W;
    // Square-ish wave with harmonics
    const saw  = ((((t * 8 + waveT) % 1) - 0.5) * 2);       // sawtooth
    const sq   = Math.sign(Math.sin(t * 20 + waveT * 3));    // square
    const sin1 = Math.sin(t * 30  + waveT * 2.1) * 0.3;
    const combined = (saw * 0.5 + sq * 0.3 + sin1) * 28;
    const y = H * 0.55 + combined;
    i === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();

  // Ghost second wave (red)
  waveCtx.lineWidth   = 1;
  waveCtx.strokeStyle = 'rgba(255,34,0,0.25)';
  waveCtx.shadowColor = 'rgba(255,34,0,0.5)';
  waveCtx.shadowBlur  = 3;
  waveCtx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = t * W;
    const val = Math.sign(Math.sin(t * 15 + waveT * 1.7 + 1)) * 18;
    const y   = H * 0.55 + val;
    i === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();
  waveCtx.shadowBlur = 0;

  requestAnimationFrame(drawWave);
}
drawWave();

// ── Frequency bars ─────────────────────────────────────────────
const freqContainer = document.getElementById('freqBars');
const BAR_COUNT = 30;
for (let i = 0; i < BAR_COUNT; i++) {
  const bar = document.createElement('div');
  bar.className = 'freq-bar';
  const dur = (Math.random() * 0.5 + 0.25).toFixed(2) + 's';
  const del = (Math.random() * 0.4).toFixed(2) + 's';
  bar.style.setProperty('--duration', dur);
  bar.style.animationDelay = del;
  freqContainer.appendChild(bar);
}

// ── Event card reveal ──────────────────────────────────────────
const cards = document.querySelectorAll('.event-card');
const cardObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const d = parseInt(e.target.dataset.delay || 0);
      setTimeout(() => e.target.classList.add('visible'), d);
      cardObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
cards.forEach(c => cardObs.observe(c));

// ── Counter animation ──────────────────────────────────────────
function animateCounter(el, target, dur = 1600) {
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p   = Math.min((ts - start) / dur, 1);
    const val = Math.floor((1 - Math.pow(1 - p, 3)) * target);
    el.textContent = val;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

const statObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target, parseInt(e.target.dataset.target));
      statObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statObs.observe(el));

// ── Brutal glitch bursts on title ──────────────────────────────
const glitchEl = document.querySelector('.glitch');
function triggerGlitch() {
  if (!glitchEl) return;
  if (Math.random() > 0.45) {
    const offX = (Math.random() - 0.5) * 18;
    const offY = (Math.random() - 0.5) * 8;
    const skew = (Math.random() - 0.5) * 3;
    glitchEl.style.transform  = `translate(${offX}px, ${offY}px) skewX(${skew}deg)`;
    glitchEl.style.filter     = `hue-rotate(${Math.random()*90}deg) contrast(${1.2 + Math.random()*0.4})`;
    glitchEl.style.opacity    = (0.6 + Math.random() * 0.4).toString();
    const dur = 40 + Math.random() * 100;
    setTimeout(() => {
      glitchEl.style.transform = '';
      glitchEl.style.filter    = '';
      glitchEl.style.opacity   = '';
      // Double-hit
      if (Math.random() > 0.5) {
        setTimeout(() => {
          glitchEl.style.transform = `translate(${-offX * 0.6}px, 0)`;
          setTimeout(() => { glitchEl.style.transform = ''; }, 50);
        }, 30);
      }
    }, dur);
  }
  setTimeout(triggerGlitch, 800 + Math.random() * 2500);
}
triggerGlitch();

// ── Random screen-wide glitch tear ────────────────────────────
const body = document.body;
function screenTear() {
  if (Math.random() > 0.7) {
    body.style.transform      = `translateX(${(Math.random()-0.5)*5}px)`;
    body.style.filter         = `brightness(${0.85 + Math.random()*0.3})`;
    setTimeout(() => {
      body.style.transform = '';
      body.style.filter    = '';
    }, 60 + Math.random() * 100);
  }
  setTimeout(screenTear, 3000 + Math.random() * 6000);
}
screenTear();

// ── Nav scroll ─────────────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.background  = 'rgba(8,8,7,1)';
    nav.style.borderColor = 'rgba(212,255,0,0.6)';
  } else {
    nav.style.background  = '';
    nav.style.borderColor = '';
  }
}, { passive: true });

// ── Mobile hamburger ───────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');
hamburger && hamburger.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.cssText = open ? '' :
    'display:flex;flex-direction:column;position:absolute;top:60px;left:0;right:0;background:rgba(8,8,7,0.98);padding:1.5rem 5%;border-bottom:2px solid rgba(212,255,0,0.4);gap:1.2rem;';
});
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => { navLinks.style.cssText = ''; })
);

// ── Periodic flicker intensity spike ──────────────────────────
const flickerEl = document.getElementById('flicker');
function flickerSpike() {
  if (Math.random() > 0.6) {
    flickerEl.style.background = `rgba(212,255,0,${0.04 + Math.random()*0.08})`;
    setTimeout(() => { flickerEl.style.background = ''; }, 80 + Math.random() * 200);
  }
  setTimeout(flickerSpike, 2000 + Math.random() * 5000);
}
flickerSpike();
