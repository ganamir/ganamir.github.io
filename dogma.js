(function() {

const canvas = document.getElementById('dogma-canvas');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;

function resize() {
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
}
setTimeout(resize, 100);
window.addEventListener('resize', () => setTimeout(resize, 100));

let scrollProgress = 0;

function updateProgress() {
  const section = document.getElementById('dogma-section');
  const rect = section.getBoundingClientRect();
  const windowH = window.innerHeight;
  const raw = (windowH - rect.top) / (windowH + rect.height);
  scrollProgress = Math.max(0, Math.min(1, raw));
}
window.addEventListener('scroll', updateProgress);
setTimeout(updateProgress, 150);

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
    this.size = Math.random() * 1.5 + 0.5;
    this.offset = (Math.random() - 0.5) * 6;
  }

  parseColor(c) {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [240, 240, 240];
  }

  lerpColor(t) {
    const a = this.parseColor(this.fromColor);
    const b = this.parseColor(this.toColor);
    return `rgba(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)},`;
  }

  update() {
    this.progress = Math.min(this.progress + this.speed, 1);
    const p = this.progress;
    const dx = this.toX - this.fromX;
    const dy = this.toY - this.fromY;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    this.x = this.fromX + dx*p + (-dy/len)*this.offset;
    this.y = this.fromY + dy*p + (dx/len)*this.offset;
    if (p < 0.08) this.opacity = p/0.08;
    else if (p > 0.88) this.opacity = 1-(p-0.88)/0.12;
    else this.opacity = 1;
    if (p >= 1) this.done = true;
  }

  draw() {
    if (this.opacity <= 0) return;
    const color = this.lerpColor(this.progress);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fillStyle = `${color}${this.opacity})`;
    ctx.fill();
  }
}

function spawn(fx, fy, tx, ty, fc, tc) {
  particles.push(new FlowParticle(fx, fy, tx, ty, fc, tc));
}

function getAlpha(appearAt) {
  const sp = scrollProgress;
  if (sp < appearAt) return 0;
  if (sp < appearAt + 0.08) return (sp - appearAt) / 0.08;
  if (sp > 0.90) return 1 - (sp - 0.90) / 0.10;
  return 1;
}

function drawArrow(fx, fy, tx, ty, fc, tc, alpha, label) {
  if (alpha <= 0.01) return;
  const grad = ctx.createLinearGradient(fx, fy, tx, ty);
  grad.addColorStop(0, fc.slice(0,-1) + `,${0.6*alpha})`);
  grad.addColorStop(1, tc.slice(0,-1) + `,${0.6*alpha})`);
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(tx, ty);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const angle = Math.atan2(ty-fy, tx-fx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 7*Math.cos(angle-0.4), ty - 7*Math.sin(angle-0.4));
  ctx.lineTo(tx - 7*Math.cos(angle+0.4), ty - 7*Math.sin(angle+0.4));
  ctx.closePath();
  ctx.fillStyle = `${tc}${0.85*alpha})`;
  ctx.fill();

  if (label) {
    const mx = (fx+tx)/2, my = (fy+ty)/2 - 10;
    ctx.font = `9px monospace`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = `rgba(14,14,14,0.9)`;
    ctx.fillRect(mx - tw/2 - 5, my - 7, tw + 10, 14);
    ctx.strokeStyle = `${fc}${0.3*alpha})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(mx - tw/2 - 5, my - 7, tw + 10, 14);
    ctx.fillStyle = `rgba(240,240,240,${0.85*alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

function drawNode(cx, cy, label, color, alpha, r) {
  if (alpha <= 0.01) return;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.strokeStyle = `${color}${0.9*alpha})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = `bold ${Math.max(8, r*0.55)}px monospace`;
  ctx.fillStyle = `${color}${0.95*alpha})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawPerson(cx, cy, color, alpha, s) {
  if (alpha <= 0.01) return;
  ctx.fillStyle = `${color}${0.85*alpha})`;
  ctx.beginPath(); ctx.arc(cx, cy-18*s, 7*s, 0, Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx-8*s, cy-10*s); ctx.lineTo(cx+8*s, cy-10*s);
  ctx.lineTo(cx+6*s, cy+10*s); ctx.lineTo(cx-6*s, cy+10*s);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx-6*s, cy+10*s); ctx.lineTo(cx-8*s, cy+24*s);
  ctx.lineTo(cx-3*s, cy+24*s); ctx.lineTo(cx, cy+14*s);
  ctx.lineTo(cx+3*s, cy+24*s); ctx.lineTo(cx+8*s, cy+24*s);
  ctx.lineTo(cx+6*s, cy+10*s); ctx.closePath(); ctx.fill();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // always use CSS pixels for layout
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;

  // scale everything relative to canvas size
  const scale = Math.min(W / 700, H / 400, 1); // 700x400 is reference size

  // node radius scales with canvas
  const nodeR = Math.max(14, Math.round(22 * scale));
  const pScale = Math.max(0.4, 0.7 * scale);
  const fontSize = Math.max(7, Math.round(10 * scale));

  // BOX: left 62% of canvas
  const boxPad = Math.round(16 * scale);
  const boxW = W * 0.60;
  const boxH = Math.min(H * 0.75, (nodeR * 2 + pScale * 50 + boxPad * 4 + 60));
  const boxX = W * 0.02;
  const boxY = (H - boxH) / 2;

  // people row
  const peopleY = boxY + boxPad + pScale * 26 + 16;
  const peopleStartX = boxX + boxPad + 4;
  const peopleEndX   = boxX + boxW - boxPad - 4;
  const personSpacing = (peopleEndX - peopleStartX) / 4;

  // dogma row — below people with enough gap
  const dogmaY = peopleY + pScale * 28 + nodeR + boxPad + 12;

  // dogma node positions
  const dnaX     = boxX + boxPad + nodeR + 2;
  const rnaX     = boxX + boxW * 0.5;
  const proteinX = boxX + boxW - boxPad - nodeR - 2;

  // right zone for predict
  const rightX = boxX + boxW + 4;
  const rightW = W - rightX - 4;
  const arrowEndX = rightX + rightW * 0.45;
  const personX   = rightX + rightW * 0.72;
  const personY   = boxY + boxH * 0.5;

  const a = getAlpha(0.35);

  // BOX
  if (a > 0.01) {
    ctx.strokeStyle = `rgba(240,240,240,${0.12*a})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);
    ctx.font = `${fontSize - 1}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.3*a})`;
    ctx.fillText('Genomic → Molecular', boxX + 4, boxY - 4);
  }

  // PEOPLE bracket
  if (a > 0.01) {
    ctx.strokeStyle = `rgba(240,240,240,${0.25*a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(peopleStartX - 4, peopleY - pScale*26 - 14);
    ctx.lineTo(peopleEndX   + 4, peopleY - pScale*26 - 14);
    ctx.moveTo(peopleStartX - 4, peopleY - pScale*26 - 14);
    ctx.lineTo(peopleStartX - 4, peopleY - pScale*26 - 10);
    ctx.moveTo(peopleEndX   + 4, peopleY - pScale*26 - 14);
    ctx.lineTo(peopleEndX   + 4, peopleY - pScale*26 - 10);
    ctx.stroke();

    ctx.font = `${fontSize - 1}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.4*a})`;
    ctx.textAlign = 'center';
    ctx.fillText('Population Phenotypes', (peopleStartX + peopleEndX)/2, peopleY - pScale*26 - 16);
    ctx.textAlign = 'left';

    PHENO_COLORS.forEach((color, i) => {
      drawPerson(peopleStartX + i * personSpacing, peopleY, color, a, pScale);
    });
  }

  // DOGMA ROW
  drawArrow(dnaX + nodeR, dogmaY, rnaX - nodeR, dogmaY,
    DOGMA_COLORS.DNA, DOGMA_COLORS.RNA, a, 'Transcription');
  drawArrow(rnaX + nodeR, dogmaY, proteinX - nodeR, dogmaY,
    DOGMA_COLORS.RNA, DOGMA_COLORS.Protein, a, 'Translation');
  drawNode(dnaX,     dogmaY, 'DNA',     DOGMA_COLORS.DNA,     a, nodeR);
  drawNode(rnaX,     dogmaY, 'RNA',     DOGMA_COLORS.RNA,     a, nodeR);
  drawNode(proteinX, dogmaY, 'Protein', DOGMA_COLORS.Protein, a, nodeR);

  // PREDICT
  if (a > 0.01) {
    drawArrow(rightX + 4, personY, arrowEndX, personY,
      'rgba(240,240,240,', 'rgba(255,160,180,', a, 'Predict');
    drawPerson(personX, personY, 'rgba(255,160,180,', a, Math.max(0.5, pScale));

    ctx.font = `${fontSize - 1}px monospace`;
    ctx.fillStyle = `rgba(255,160,180,${0.55*a})`;
    ctx.textAlign = 'center';
    ctx.fillText('Phenotype (?)', personX, personY + pScale*28 + 8);
    ctx.textAlign = 'left';
  }

  // PARTICLES
  particleTimer++;
  if (particleTimer % 35 === 0 && a > 0.4) {
    spawn(dnaX+nodeR, dogmaY, rnaX-nodeR, dogmaY, DOGMA_COLORS.DNA, DOGMA_COLORS.RNA);
    spawn(rnaX+nodeR, dogmaY, proteinX-nodeR, dogmaY, DOGMA_COLORS.RNA, DOGMA_COLORS.Protein);
    spawn(rightX+4, personY, arrowEndX, personY, 'rgba(240,240,240,', 'rgba(255,160,180,');
  }

  particles.forEach(p => { p.update(); p.draw(); });
  particles = particles.filter(p => !p.done);

  requestAnimationFrame(animate);
}

animate();

})();