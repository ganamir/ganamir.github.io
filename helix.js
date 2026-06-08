(function() {

const helixCanvas = document.getElementById('helix');
const helixCtx = helixCanvas.getContext('2d');

let width, height;

function resize() {
  width = helixCanvas.offsetWidth;
  height = helixCanvas.offsetHeight;
  helixCanvas.width = width;
  helixCanvas.height = height;
}

function tryResize() {
  resize();
  if (height < 10) setTimeout(tryResize, 50);
}
tryResize();
window.addEventListener('resize', resize);

const BASE_COLORS = {
  A: 'rgba(100, 200, 255,',
  T: 'rgba(255, 120, 120,',
  G: 'rgba(120, 255, 150,',
  C: 'rgba(255, 210, 80,',
};
const BASES = ['A','T','G','C'];
const RUNG_COUNT = 80;
let rungs = [];
let flightParticles = [];
let particlesSpawned = false;
let t = 0;

// --- OVERLAY CANVAS (fixed, full screen, for cross-section particles) ---
const overlayCanvas = document.createElement('canvas');
overlayCanvas.style.cssText = `
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none; z-index: 100;
`;
overlayCanvas.width = window.innerWidth;
overlayCanvas.height = window.innerHeight;
document.body.appendChild(overlayCanvas);
const overlayCtx = overlayCanvas.getContext('2d');

window.addEventListener('resize', () => {
  overlayCanvas.width = window.innerWidth;
  overlayCanvas.height = window.innerHeight;
});

// --- RUNG ---
class Rung {
  constructor(index, total) {
    this.index = index;
    this.total = total;
    this.baseA = BASES[Math.floor(Math.random() * BASES.length)];
    this.baseB = BASES[Math.floor(Math.random() * BASES.length)];
  }

  getPositions(t) {
    const y = (this.index / this.total) * height;
    const centerX = width / 2;
    const freq = (Math.PI * 2) / height * 60;
    const amp = 22;
    const x1 = centerX + Math.sin(y * freq + t) * amp;
    const x2 = centerX + Math.sin(y * freq + t + Math.PI) * amp;
    const depth1 = (Math.sin(y * freq + t) + 1) / 2;
    const depth2 = (Math.sin(y * freq + t + Math.PI) + 1) / 2;
    return { x1, x2, y, depth1, depth2 };
  }

  draw(t, dissolve) {
    const { x1, x2, y, depth1, depth2 } = this.getPositions(t);
    const opacity = 1 - dissolve;
    if (opacity <= 0.01) return;

    helixCtx.beginPath();
    helixCtx.arc(x1, y, 3, 0, Math.PI * 2);
    helixCtx.fillStyle = `${BASE_COLORS[this.baseA]}${(0.4 + depth1 * 0.6) * opacity})`;
    helixCtx.fill();

    helixCtx.beginPath();
    helixCtx.arc(x2, y, 3, 0, Math.PI * 2);
    helixCtx.fillStyle = `${BASE_COLORS[this.baseB]}${(0.4 + depth2 * 0.6) * opacity})`;
    helixCtx.fill();

    const rungOpacity = Math.max(0, 1 - Math.abs(depth1 - depth2) * 2) * 0.3 * opacity;
    if (rungOpacity > 0.02) {
      helixCtx.beginPath();
      helixCtx.moveTo(x1, y);
      helixCtx.lineTo(x2, y);
      helixCtx.strokeStyle = `rgba(240,240,240,${rungOpacity})`;
      helixCtx.lineWidth = 0.8;
      helixCtx.stroke();
    }

    if (this.index < this.total - 1) {
      const yNext = ((this.index + 1) / this.total) * height;
      const centerX = width / 2;
      const freq = (Math.PI * 2) / height * 60;
      const amp = 22;
      const x1Next = centerX + Math.sin(yNext * freq + t) * amp;
      const x2Next = centerX + Math.sin(yNext * freq + t + Math.PI) * amp;

      helixCtx.beginPath();
      helixCtx.moveTo(x1, y);
      helixCtx.lineTo(x1Next, yNext);
      helixCtx.strokeStyle = `rgba(240,240,240,${0.15 * opacity})`;
      helixCtx.lineWidth = 0.6;
      helixCtx.stroke();

      helixCtx.beginPath();
      helixCtx.moveTo(x2, y);
      helixCtx.lineTo(x2Next, yNext);
      helixCtx.strokeStyle = `rgba(240,240,240,${0.15 * opacity})`;
      helixCtx.lineWidth = 0.6;
      helixCtx.stroke();
    }
  }
}

// --- FLIGHT PARTICLE ---
// All coords in screen space (fixed viewport coords)
const MATRIX_COL_WIDTHS = [50, 110, 40, 40, 90];
const MATRIX_PADDING_LEFT = 16;
const MATRIX_HEADER_Y = 50;
const MATRIX_ROW_HEIGHT = 26;

function getMatrixColX(colIndex) {
  let x = MATRIX_PADDING_LEFT;
  for (let i = 0; i < colIndex; i++) x += MATRIX_COL_WIDTHS[i] + 20;
  return x;
}

class FlightParticle {
    constructor(base, startScreenX, startScreenY, targetCanvasX, targetCanvasY, delay) {
        this.base = base;
        this.delay = delay;
        this.age = 0;
        this.progress = 0;
        this.speed = Math.random() * 0.016 + 0.01;
        this.done = false;
        this.opacity = 0;

        this.sx = startScreenX;
        this.sy = startScreenY;
        this.x = startScreenX;
        this.y = startScreenY;

        const matrixEl = document.getElementById('matrix-canvas');
        const rect = matrixEl.getBoundingClientRect();
        this.tx = rect.left + targetCanvasX;
        this.ty = rect.top + targetCanvasY;

        // arc SIDEWAYS between start and target, never above/below either point
        const midX = (this.sx + this.tx) / 2;
        const midY = (this.sy + this.ty) / 2;
        // lateral offset perpendicular to the path
        const dx = this.tx - this.sx;
        const dy = this.ty - this.sy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = -dy / len;
        const perpY = dx / len;
        const lateralOffset = (Math.random() - 0.5) * 120;
        this.cpX = midX + perpX * lateralOffset;
        this.cpY = midY + perpY * lateralOffset;

        // very subtle wobble only
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.08 + 0.02;
        this.wobbleAmp = Math.random() * 2 + 1;
    }

  update() {
    this.age++;
    if (this.age < this.delay) return;

    this.progress = Math.min(this.progress + this.speed, 1);
    this.wobble += this.wobbleSpeed;

    const p = this.progress;
    const inv = 1 - p;

    // quadratic bezier in screen space
    this.x = inv * inv * this.sx + 2 * inv * p * this.cpX + p * p * this.tx;
    this.y = inv * inv * this.sy + 2 * inv * p * this.cpY + p * p * this.ty;

    // wobble fades out near end
    const wFade = 1 - p;
    this.x += Math.sin(this.wobble) * this.wobbleAmp * wFade;
    this.y += Math.cos(this.wobble) * this.wobbleAmp * wFade;

    // opacity: fade in → hold → fade out just before landing
    if (p < 0.1) this.opacity = p / 0.1;
    else if (p > 0.88) this.opacity = 1 - (p - 0.88) / 0.12;
    else this.opacity = 1;

    if (this.progress >= 1) this.done = true;
  }

  draw() {
    if (this.age < this.delay || this.opacity <= 0.01) return;
    const color = BASE_COLORS[this.base] || 'rgba(240,240,240,';
    overlayCtx.shadowBlur = 8;
    overlayCtx.shadowColor = `${color}0.6)`;
    overlayCtx.font = `bold 12px monospace`;
    overlayCtx.fillStyle = `${color}${this.opacity})`;
    overlayCtx.fillText(this.base, this.x, this.y);
    overlayCtx.shadowBlur = 0;
  }
}

function spawnFlightParticles() {
  flightParticles = [];
  const matrixEl = document.getElementById('matrix-canvas');
  if (!matrixEl || !matrixEl._visibleRows || matrixEl._visibleRows.length === 0) return;
  if (window.innerWidth <= 768) return; // skip on mobile

  const helixRect = helixCanvas.getBoundingClientRect();
  const visibleRows = matrixEl._visibleRows;

  visibleRows.forEach(({ row, canvasY }, i) => {
    const refX = getMatrixColX(2);
    const altX = getMatrixColX(3);

    const rungIndex = Math.floor((i / visibleRows.length) * RUNG_COUNT);
    const rung = rungs[rungIndex];
    if (!rung) return;

    const { x1, x2, y } = rung.getPositions(t);

    const startX1 = helixRect.left + x1;
    const startX2 = helixRect.left + x2;
    const startY  = helixRect.top  + y;

    const baseDelay = i * 3;
    flightParticles.push(new FlightParticle(row.values[2], startX1, startY, refX, canvasY, baseDelay + Math.floor(Math.random() * 12)));
    flightParticles.push(new FlightParticle(row.values[3], startX2, startY, altX, canvasY, baseDelay + Math.floor(Math.random() * 12)));
  });
}

function initRungs() {
  rungs = Array.from({ length: RUNG_COUNT }, (_, i) => new Rung(i, RUNG_COUNT));
  flightParticles = [];
  particlesSpawned = false;
}
initRungs();
window.addEventListener('resize', () => { resize(); initRungs(); });

function animate() {
  helixCtx.clearRect(0, 0, width, height);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  t += 0.012;
  const dissolve = window._matrixProgress || 0;

  // spawn particles when dissolve kicks in
  if (dissolve > 0.05 && !particlesSpawned) {
    particlesSpawned = true;
    spawnFlightParticles();
  }

  // reset when scrolled back up
  if (dissolve < 0.02 && particlesSpawned) {
    particlesSpawned = false;
    flightParticles = [];
  }

  // draw helix with staggered per-rung dissolve
  rungs.forEach((rung, i) => {
    const rungFrac = i / RUNG_COUNT;
    const rungDissolve = Math.max(0, Math.min(1, (dissolve - rungFrac * 0.4) / 0.4));
    rung.draw(t, rungDissolve);
  });

  // flight particles
  flightParticles.forEach(p => { p.update(); p.draw(); });
  flightParticles = flightParticles.filter(p => !p.done);

  requestAnimationFrame(animate);
}

animate();

})();