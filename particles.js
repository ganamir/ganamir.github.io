(function() {

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

let mouse = { x: null, y: null };
let particles = [];
const COUNT = 40;
const MOBILE_COUNT = 15;
const MAX_DIST = 130;
const MOUSE_DIST = 150;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
}
resize();
window.addEventListener('resize', resize);

window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

const BASE_COLORS = [
  'rgba(100, 200, 255, ',
  'rgba(255, 120, 120, ',
  'rgba(120, 255, 150, ',
  'rgba(255, 210, 80, ',
];

class DNAFragment {
  constructor() { this.reset(); }

  reset() {
    this.x = Math.random() * window.innerWidth;
    this.y = Math.random() * window.innerHeight;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.angle = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.015;
    this.length = Math.random() * 12 + 8;
    this.opacity = Math.random() * 0.4 + 0.2;
    this.colorA = BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)];
    this.colorB = BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)];
    this.dotRadius = Math.random() * 2 + 1.5;
  }

  update() {
    if (mouse.x && mouse.y) {
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_DIST) {
        const force = (MOUSE_DIST - dist) / MOUSE_DIST;
        this.vx -= (dx / dist) * force * 0.9;
        this.vy -= (dy / dist) * force * 0.9;
      }
    }
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;
    if (this.x < 0 || this.x > window.innerWidth) this.vx *= -1;
    if (this.y < 0 || this.y > window.innerHeight) this.vy *= -1;
  }

  draw() {
    const ax = this.x + Math.cos(this.angle) * this.length;
    const ay = this.y + Math.sin(this.angle) * this.length;
    const bx = this.x - Math.cos(this.angle) * this.length;
    const by = this.y - Math.sin(this.angle) * this.length;

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = `rgba(240,240,240,${this.opacity * 0.3})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const midX = (ax + bx) / 2;
    const midY = (ay + by) / 2;
    const perpX = -Math.sin(this.angle) * 4;
    const perpY = Math.cos(this.angle) * 4;
    ctx.beginPath();
    ctx.moveTo(midX - perpX, midY - perpY);
    ctx.lineTo(midX + perpX, midY + perpY);
    ctx.strokeStyle = `rgba(240,240,240,${this.opacity * 0.2})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ax, ay, this.dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = `${this.colorA}${this.opacity})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx, by, this.dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = `${this.colorB}${this.opacity})`;
    ctx.fill();
  }
}

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MAX_DIST) {
        const opacity = (1 - dist / MAX_DIST) * 0.08;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(240,240,240,${opacity})`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }
    }
  }
}

const actualCount = window.innerWidth < 768 ? MOBILE_COUNT : COUNT;
for (let i = 0; i < actualCount; i++) particles.push(new DNAFragment());

function animate() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach(p => { p.update(); p.draw(); });
  drawConnections();
  requestAnimationFrame(animate);
}
animate();

})();