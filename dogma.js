(function() {

const canvas = document.getElementById('dogma-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
setTimeout(resize, 100);
window.addEventListener('resize', () => setTimeout(resize, 100));

let scrollProgress = 0;

function updateProgress() {
  const section = document.getElementById('dogma-section');
  const rect = section.getBoundingClientRect();
  const windowH = window.innerHeight;
  // only start counting when section top is within viewport
  const raw = (windowH - rect.top) / (windowH + rect.height);
  scrollProgress = Math.max(0, Math.min(1, raw));
}

window.addEventListener('scroll', updateProgress);
setTimeout(updateProgress, 150);

// --- COLORS ---
const PHENO_COLORS = [
  'rgba(180, 40,  40,',
  'rgba(220, 100, 30,',
  'rgba(230, 180, 40,',
  'rgba(100, 200, 100,',
  'rgba(60,  160, 220,',
];

const DOGMA_COLORS = {
  DNA:     'rgba(100, 200, 255,',
  RNA:     'rgba(120, 255, 150,',
  Protein: 'rgba(255, 120, 120,',
};

// --- PARTICLES ---
let particles = [];
let particleTimer = 0;

class FlowParticle {
  constructor(fromX, fromY, toX, toY, fromColor, toColor) {
    this.fromX = fromX; this.fromY = fromY;
    this.toX = toX;     this.toY = toY;
    this.fromColor = fromColor;
    this.toColor = toColor;
    this.progress = 0;
    this.speed = Math.random() * 0.009 + 0.005;
    this.done = false;
    this.opacity = 0;
    this.size = Math.random() * 1.8 + 0.8;
    this.offset = (Math.random() - 0.5) * 8;
  }

  parseColor(c) {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [240, 240, 240];
  }

  lerpColor(t) {
    const a = this.parseColor(this.fromColor);
    const b = this.parseColor(this.toColor);
    const r  = Math.round(a[0] + (b[0] - a[0]) * t);
    const g  = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return `rgba(${r},${g},${bl},`;
  }

  update() {
    this.progress = Math.min(this.progress + this.speed, 1);
    const p = this.progress;
    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // perpendicular wobble
    const px = -dy / len * this.offset;
    const py =  dx / len * this.offset;
    this.x = this.fromX + dx * p + px;
    this.y = this.fromY + dy * p + py;

    if (p < 0.08) this.opacity = p / 0.08;
    else if (p > 0.88) this.opacity = 1 - (p - 0.88) / 0.12;
    else this.opacity = 1;

    if (p >= 1) this.done = true;
  }

  draw() {
    if (this.opacity <= 0) return;
    const color = this.lerpColor(this.progress);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `${color}${this.opacity})`;
    ctx.fill();
  }
}

function spawnParticle(fromX, fromY, toX, toY, fromColor, toColor) {
  particles.push(new FlowParticle(fromX, fromY, toX, toY, fromColor, toColor));
}

// --- DRAW HELPERS ---
function getAlpha(appearAt) {
  const sp = scrollProgress;
  if (sp < appearAt) return 0;
  if (sp < appearAt + 0.08) return (sp - appearAt) / 0.08;
  if (sp > 0.90) return 1 - (sp - 0.90) / 0.10;
  return 1;
}

function drawArrow(fromX, fromY, toX, toY, fromColor, toColor, alpha, label) {
  if (alpha <= 0.01) return;

  // gradient line
  const grad = ctx.createLinearGradient(fromX, fromY, toX, toY);
  const fc = fromColor.replace('rgba(', 'rgba(').replace(',', ',').slice(0, -1) + `, ${0.6 * alpha})`;
  const tc = toColor.slice(0, -1) + `, ${0.6 * alpha})`;
  grad.addColorStop(0, fc);
  grad.addColorStop(1, tc);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const aSize = 7;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - aSize * Math.cos(angle - 0.4), toY - aSize * Math.sin(angle - 0.4));
  ctx.lineTo(toX - aSize * Math.cos(angle + 0.4), toY - aSize * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fillStyle = `${toColor}${0.85 * alpha})`;
  ctx.fill();

  // label pill on arrow
  if (label) {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 - 12;
    ctx.font = `10px monospace`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = `rgba(14,14,14,0.88)`;
    ctx.fillRect(midX - tw / 2 - 6, midY - 8, tw + 12, 15);
    ctx.strokeStyle = `${fromColor}${0.3 * alpha})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(midX - tw / 2 - 6, midY - 8, tw + 12, 15);
    ctx.fillStyle = `rgba(240,240,240,${0.85 * alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

function drawNode(cx, cy, label, color, alpha) {
  if (alpha <= 0.01) return;
  const r = 26;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = `${color}${0.9 * alpha})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `bold 12px monospace`;
  ctx.fillStyle = `${color}${0.95 * alpha})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// draw a simple person silhouette
function drawPerson(cx, cy, color, alpha, scale) {
  if (alpha <= 0.01) return;
  scale = scale || 1;
  const s = scale;

  ctx.fillStyle = `${color}${0.85 * alpha})`;

  // head
  ctx.beginPath();
  ctx.arc(cx, cy - 18 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.beginPath();
  ctx.moveTo(cx - 8 * s, cy - 10 * s);
  ctx.lineTo(cx + 8 * s, cy - 10 * s);
  ctx.lineTo(cx + 6 * s, cy + 10 * s);
  ctx.lineTo(cx - 6 * s, cy + 10 * s);
  ctx.closePath();
  ctx.fill();

  // legs
  ctx.beginPath();
  ctx.moveTo(cx - 6 * s, cy + 10 * s);
  ctx.lineTo(cx - 8 * s, cy + 24 * s);
  ctx.lineTo(cx - 3 * s, cy + 24 * s);
  ctx.lineTo(cx,         cy + 14 * s);
  ctx.lineTo(cx + 3 * s, cy + 24 * s);
  ctx.lineTo(cx + 8 * s, cy + 24 * s);
  ctx.lineTo(cx + 6 * s, cy + 10 * s);
  ctx.closePath();
  ctx.fill();
}

function drawBracket(x1, x2, y, alpha) {
  if (alpha <= 0.01) return;
  ctx.strokeStyle = `rgba(240,240,240,${0.3 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y + 6);
  ctx.lineTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.lineTo(x2, y + 6);
  ctx.stroke();

  ctx.font = `10px monospace`;
  ctx.fillStyle = `rgba(240,240,240,${0.5 * alpha})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Population Phenotypes', (x1 + x2) / 2, y - 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// --- ANIMATE ---
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width;
  const h = canvas.height;

  // everything as fractions of canvas size
  const boxPad = 20;
  const boxW = w * 0.62;
  const boxH = h * 0.38;  // tight around content
  const boxX = w * 0.03;
  const boxY = (h - boxH) / 2;  // vertically centered

  const peopleY = boxY + boxPad + 44;
  const dogmaY  = peopleY + 85;

  const peopleCount   = 5;
  const peopleStartX  = boxX + boxPad + 10;
  const peopleEndX    = boxX + boxW - boxPad - 10;
  const personSpacing = (peopleEndX - peopleStartX) / (peopleCount - 1);

  const dnaX     = boxX + boxPad + 24;
  const rnaX     = boxX + boxW * 0.50;
  const proteinX = boxX + boxW - boxPad - 24;

  const rightZoneX     = boxX + boxW;
  const rightZoneW     = w - rightZoneX - w * 0.02;
  const arrowFromX     = rightZoneX + 14;
  const arrowToX       = rightZoneX + rightZoneW * 0.52;
  const predictPersonX = rightZoneX + rightZoneW * 0.74;
  const predictPersonY = boxY + boxH * 0.50;
  
  // --- ALPHAS ---
  const aDNA     = getAlpha(0.35);
  const aRNA     = getAlpha(0.35);
  const aProtein = getAlpha(0.35);
  const aPeople  = getAlpha(0.35);
  const aBox     = getAlpha(0.35);
  const aPredict = getAlpha(0.35);

  // --- BOX ---
  if (aBox > 0.01) {
    ctx.strokeStyle = `rgba(240,240,240,${0.12 * aBox})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);
    ctx.font = `10px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.3 * aBox})`;
    ctx.textAlign = 'left';
    ctx.fillText('Genomic → Molecular', boxX + 8, boxY - 6);
  }

  // --- PEOPLE ---
  if (aPeople > 0.01) {
    // bracket opens DOWNWARD toward people
    ctx.strokeStyle = `rgba(240,240,240,${0.25 * aPeople})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // horizontal line above
    ctx.moveTo(peopleStartX - 10, peopleY - 24);
    ctx.lineTo(peopleEndX   + 10, peopleY - 24);
    // left tick pointing DOWN
    ctx.moveTo(peopleStartX - 10, peopleY - 24);
    ctx.lineTo(peopleStartX - 10, peopleY - 18);
    // right tick pointing DOWN
    ctx.moveTo(peopleEndX   + 10, peopleY - 24);
    ctx.lineTo(peopleEndX   + 10, peopleY - 18);
    ctx.stroke();

    ctx.font = `10px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.45 * aPeople})`;
    ctx.textAlign = 'center';
    ctx.fillText('Population Phenotypes', (peopleStartX + peopleEndX) / 2, peopleY - 27);
    ctx.textAlign = 'left';

    PHENO_COLORS.forEach((color, i) => {
      drawPerson(peopleStartX + i * personSpacing, peopleY, color, aPeople, 0.75);
    });
  }

  // dashed connector people → dogma
  if (aPeople > 0.01 && aDNA > 0.01) {
    ctx.beginPath();
    ctx.moveTo(boxX + boxW * 0.5, peopleY + 26);
    ctx.lineTo(boxX + boxW * 0.5, dogmaY - 28);
    ctx.strokeStyle = `rgba(240,240,240,${0.06 * Math.min(aPeople, aDNA)})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- DOGMA ---
  drawArrow(dnaX + 26, dogmaY, rnaX - 26, dogmaY,
    DOGMA_COLORS.DNA, DOGMA_COLORS.RNA, Math.min(aDNA, aRNA), 'Transcription');
  drawArrow(rnaX + 26, dogmaY, proteinX - 26, dogmaY,
    DOGMA_COLORS.RNA, DOGMA_COLORS.Protein, Math.min(aRNA, aProtein), 'Translation');
  drawNode(dnaX,     dogmaY, 'DNA',     DOGMA_COLORS.DNA,     aDNA);
  drawNode(rnaX,     dogmaY, 'RNA',     DOGMA_COLORS.RNA,     aRNA);
  drawNode(proteinX, dogmaY, 'Protein', DOGMA_COLORS.Protein, aProtein);

  // --- PREDICT ---
  if (aPredict > 0.01) {
    drawArrow(
      arrowFromX, predictPersonY,
      arrowToX, predictPersonY,
      'rgba(240,240,240,', 'rgba(255,160,180,',
      aPredict, 'Predict'
    );
    drawPerson(predictPersonX, predictPersonY, 'rgba(255,160,180,', aPredict, 0.75);

    ctx.font = `10px monospace`;
    ctx.fillStyle = `rgba(255,160,180,${0.55 * aPredict})`;
    ctx.textAlign = 'center';
    ctx.fillText('Phenotype (?)', predictPersonX, predictPersonY + 36);
    ctx.textAlign = 'left';
  }

  // --- PARTICLES ---
  particleTimer++;
  if (particleTimer % 35 === 0) {
    if (aDNA > 0.4 && aRNA > 0.2)
      spawnParticle(dnaX + 26, dogmaY, rnaX - 26, dogmaY, DOGMA_COLORS.DNA, DOGMA_COLORS.RNA);
    if (aRNA > 0.4 && aProtein > 0.2)
      spawnParticle(rnaX + 26, dogmaY, proteinX - 26, dogmaY, DOGMA_COLORS.RNA, DOGMA_COLORS.Protein);
    if (aPredict > 0.4)
      spawnParticle(arrowFromX, predictPersonY, arrowToX, predictPersonY,
        'rgba(240,240,240,', 'rgba(255,160,180,');
  }

  particles.forEach(p => { p.update(); p.draw(); });
  particles = particles.filter(p => !p.done);

  requestAnimationFrame(animate);
}

animate();

})();