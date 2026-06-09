/* =============================================
   GLITCH CLUB AARHUS — JAVASCRIPT
   ============================================= */

// ── Custom cursor ──────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--cx', e.clientX + 'px');
  document.documentElement.style.setProperty('--cy', e.clientY + 'px');
});

// ── Background grid canvas ─────────────────────────────────────
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');

let particles = [];
const PARTICLE_COUNT = 80;

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x  = Math.random() * bgCanvas.width;
    this.y  = Math.random() * bgCanvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.size    = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.6 + 0.2;
    this.color   = Math.random() > 0.5 ? '#00f5ff' : '#b400ff';
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > bgCanvas.width ||
        this.y < 0 || this.y > bgCanvas.height) this.reset();
  }
  draw() {
    bgCtx.save();
    bgCtx.globalAlpha = this.opacity;
    bgCtx.fillStyle   = this.color;
    bgCtx.shadowColor = this.color;
    bgCtx.shadowBlur  = 6;
    bgCtx.beginPath();
    bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.restore();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
}

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx   = particles[i].x - particles[j].x;
      const dy   = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        bgCtx.save();
        bgCtx.globalAlpha = (1 - dist / 120) * 0.15;
        bgCtx.strokeStyle = '#00f5ff';
        bgCtx.lineWidth   = 0.5;
        bgCtx.beginPath();
        bgCtx.moveTo(particles[i].x, particles[i].y);
        bgCtx.lineTo(particles[j].x, particles[j].y);
        bgCtx.stroke();
        bgCtx.restore();
      }
    }
  }
}

function animateBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  drawConnections();
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateBg);
}

resizeBg();
initParticles();
animateBg();
window.addEventListener('resize', () => { resizeBg(); initParticles(); });

// ── Hero waveform ──────────────────────────────────────────────
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx    = waveCanvas.getContext('2d');
let waveT = 0;

function resizeWave() {
  waveCanvas.width  = waveCanvas.offsetWidth;
  waveCanvas.height = waveCanvas.offsetHeight;
}

function drawWave() {
  const W = waveCanvas.width;
  const H = waveCanvas.height;
  waveCtx.clearRect(0, 0, W, H);
  waveT += 0.015;

  // Primary wave
  const grad = waveCtx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0,   'transparent');
  grad.addColorStop(0.2, 'rgba(0,245,255,0.6)');
  grad.addColorStop(0.8, 'rgba(180,0,255,0.6)');
  grad.addColorStop(1,   'transparent');

  waveCtx.strokeStyle = grad;
  waveCtx.lineWidth   = 1.5;
  waveCtx.shadowColor = '#00f5ff';
  waveCtx.shadowBlur  = 8;
  waveCtx.beginPath();

  for (let x = 0; x <= W; x++) {
    const t  = x / W;
    const y1 = Math.sin(t * 12 + waveT * 2.5) * 18;
    const y2 = Math.sin(t * 7  + waveT * 1.8) * 12;
    const y3 = Math.sin(t * 20 + waveT * 3.2) * 6;
    const y  = H / 2 + y1 + y2 + y3;
    x === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();

  // Mirrored fill
  waveCtx.globalAlpha = 0.08;
  waveCtx.fillStyle   = '#00f5ff';
  waveCtx.beginPath();
  for (let x = 0; x <= W; x++) {
    const t  = x / W;
    const y1 = Math.sin(t * 12 + waveT * 2.5) * 18;
    const y2 = Math.sin(t * 7  + waveT * 1.8) * 12;
    const y3 = Math.sin(t * 20 + waveT * 3.2) * 6;
    const y  = H / 2 + y1 + y2 + y3;
    x === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
  }
  waveCtx.lineTo(W, H);
  waveCtx.lineTo(0, H);
  waveCtx.closePath();
  waveCtx.fill();
  waveCtx.globalAlpha = 1;

  requestAnimationFrame(drawWave);
}

resizeWave();
drawWave();
window.addEventListener('resize', resizeWave);

// ── Frequency bars (about section) ────────────────────────────
const freqContainer = document.getElementById('freqBars');
const BAR_COUNT = 28;
for (let i = 0; i < BAR_COUNT; i++) {
  const bar = document.createElement('div');
  bar.className = 'freq-bar';
  const duration = (Math.random() * 0.6 + 0.5).toFixed(2) + 's';
  const delay    = (Math.random() * 0.5).toFixed(2) + 's';
  bar.style.setProperty('--duration', duration);
  bar.style.animationDelay = delay;
  freqContainer.appendChild(bar);
}

// ── Intersection observer — card reveal ───────────────────────
const cards = document.querySelectorAll('.event-card');
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || 0);
      setTimeout(() => entry.target.classList.add('visible'), delay);
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
cards.forEach(card => cardObserver.observe(card));

// ── Counter animation ─────────────────────────────────────────
function animateCounter(el, target, duration = 1800) {
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = parseInt(el.dataset.target);
      animateCounter(el, target);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// ── Random glitch bursts on title ─────────────────────────────
const glitchEl = document.querySelector('.glitch');
function triggerGlitch() {
  if (!glitchEl) return;
  const rnd = Math.random();
  if (rnd > 0.7) {
    glitchEl.style.transform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*3}px)`;
    glitchEl.style.filter    = `hue-rotate(${Math.random()*60}deg)`;
    setTimeout(() => {
      glitchEl.style.transform = '';
      glitchEl.style.filter    = '';
    }, 80 + Math.random() * 120);
  }
  setTimeout(triggerGlitch, 1500 + Math.random() * 3000);
}
triggerGlitch();

// ── Nav scroll tint ───────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.background = 'rgba(0,0,0,0.96)';
    nav.style.borderBottomColor = 'rgba(0,245,255,0.15)';
  } else {
    nav.style.background = '';
    nav.style.borderBottomColor = '';
  }
}, { passive: true });

// ── Mobile hamburger ──────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');
hamburger && hamburger.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.display    = open ? 'none' : 'flex';
  navLinks.style.flexDirection = 'column';
  navLinks.style.position   = open ? '' : 'absolute';
  navLinks.style.top        = open ? '' : '60px';
  navLinks.style.left       = open ? '' : '0';
  navLinks.style.right      = open ? '' : '0';
  navLinks.style.background = open ? '' : 'rgba(0,0,0,0.97)';
  navLinks.style.padding    = open ? '' : '1.5rem 5%';
  navLinks.style.borderBottom = open ? '' : '1px solid rgba(0,245,255,0.1)';
});

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(a =>
  a.addEventListener('click', () => {
    navLinks.style.display = 'none';
  })
);

// ── Subtle RGB glitch on event cards hover ────────────────────
document.querySelectorAll('.event-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    let count = 0;
    const glitchInterval = setInterval(() => {
      if (count++ > 4) { clearInterval(glitchInterval); card.style.filter = ''; return; }
      card.style.filter = count % 2 === 0
        ? 'hue-rotate(5deg) brightness(1.05)'
        : 'hue-rotate(-5deg) brightness(0.98)';
    }, 40);
  });
  card.addEventListener('mouseleave', () => { card.style.filter = ''; });
});
