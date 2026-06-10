(function() {

const canvas = document.getElementById('matrix-canvas');
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
  initGrid();
}
setTimeout(resize, 100);
window.addEventListener('resize', () => setTimeout(resize, 100));

const COLS_DEF = ['CHR', 'POS', 'REF', 'ALT', 'AF'];
const CHROMS = ['2L','2R','3L','3R','X'];
const BASES = ['A','T','G','C'];
const BASE_COLORS = {
  A: 'rgba(100, 200, 255,',
  T: 'rgba(255, 120, 120,',
  G: 'rgba(120, 255, 150,',
  C: 'rgba(255, 210, 80,',
};

const POOL_SIZE = 200;
let rows = [];
let scrollProgress = 0;
let scrollOffset = 0;

function mob() { return canvas.offsetWidth < 480; }
function FONT_SIZE() { return mob() ? 10 : 12; }
function ROW_HEIGHT() { return mob() ? 22 : 26; }
function COL_WIDTHS() { return mob() ? [32, 85, 28, 28, 55] : [50, 110, 40, 40, 90]; }
function COL_GAP() { return mob() ? 8 : 20; }
function PADDING_LEFT() { return mob() ? 8 : 16; }
function HEADER_Y() { return mob() ? 36 : 50; }

function makeRow() {
  const chrom = CHROMS[Math.floor(Math.random() * CHROMS.length)];
  const pos = Math.floor(Math.random() * 28000000) + 1000000;
  const ref = BASES[Math.floor(Math.random() * BASES.length)];
  let alt = BASES[Math.floor(Math.random() * BASES.length)];
  while (alt === ref) alt = BASES[Math.floor(Math.random() * BASES.length)];
  const af = (Math.random() * 0.95 + 0.01).toFixed(4);
  return { values: [chrom, pos.toLocaleString(), ref, alt, af] };
}

function initGrid() {
  rows = Array.from({ length: POOL_SIZE }, makeRow);
  updateVisibleRows();
}

function getColX(i) {
  const cw = COL_WIDTHS();
  const gap = COL_GAP();
  let x = PADDING_LEFT();
  for (let j = 0; j < i; j++) x += cw[j] + gap;
  return x;
}

function updateVisibleRows() {
  const rh = ROW_HEIGHT();
  const hy = HEADER_Y();
  const h = canvas.offsetHeight;
  const visibleCount = Math.ceil(h / rh) + 1;
  const startIndex = Math.floor(scrollOffset / rh) % POOL_SIZE;
  const visible = [];
  for (let i = 0; i < visibleCount; i++) {
    const idx = (startIndex + i) % POOL_SIZE;
    const canvasY = hy + 40 + i * rh - (scrollOffset % rh);
    visible.push({ row: rows[idx], canvasY });
  }
  canvas._visibleRows = visible;
  canvas._rows = visible.map(v => v.row);
}

window.addEventListener('scroll', updateProgress);

function updateProgress() {
  const section = document.getElementById('matrix-section');
  const rect = section.getBoundingClientRect();
  const windowH = window.innerHeight;
  const start = windowH * 0.8;
  const end = -rect.height * 0.5;
  const raw = (start - rect.top) / (start - end);
  scrollProgress = Math.max(0, Math.min(1, raw));
  window._matrixProgress = scrollProgress;
  scrollOffset = scrollProgress * POOL_SIZE * ROW_HEIGHT() * 0.4;
  updateVisibleRows();
}

function drawHeader(alpha) {
  const cw = COL_WIDTHS();
  const gap = COL_GAP();
  const hy = HEADER_Y();
  const fs = FONT_SIZE();
  const pl = PADDING_LEFT();
  let x = pl;
  COLS_DEF.forEach((col, i) => {
    ctx.font = `${fs - 1}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.3 * alpha})`;
    ctx.fillText(col, x, hy);
    x += cw[i] + gap;
  });
  ctx.beginPath();
  ctx.moveTo(pl, hy + 8);
  ctx.lineTo(canvas.offsetWidth - pl, hy + 8);
  ctx.strokeStyle = `rgba(240,240,240,${0.1 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawVisibleRow(rowData, canvasY, globalAlpha) {
  if (!rowData || !rowData.values) return;
  const hy = HEADER_Y();
  const h = canvas.offsetHeight;
  const rh = ROW_HEIGHT();
  const fs = FONT_SIZE();
  const pl = PADDING_LEFT();

  if (canvasY < hy || canvasY > h + rh) return;

  const edgeFade = Math.min(
    Math.max(0, (canvasY - hy - 20) / 40),
    Math.max(0, (h - canvasY) / 60),
    1
  );

  const alpha = globalAlpha * edgeFade;
  if (alpha <= 0.01) return;

  const { values } = rowData;

  values.forEach((val, colIndex) => {
    const x = getColX(colIndex);

    if (colIndex === 2 || colIndex === 3) {
      const color = BASE_COLORS[val] || 'rgba(240,240,240,';
      ctx.font = `bold ${fs}px monospace`;
      ctx.fillStyle = `${color}${0.9 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    if (colIndex === 4) {
      const af = parseFloat(val);
      const barWidth = (mob() ? 30 : 50) * af;
      ctx.fillStyle = `rgba(120,255,150,${0.1 * alpha})`;
      ctx.fillRect(x, canvasY - 11, barWidth, 12);
      ctx.font = `${fs}px monospace`;
      ctx.fillStyle = `rgba(120,255,150,${0.75 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    if (colIndex === 0) {
      ctx.font = `${fs}px monospace`;
      ctx.fillStyle = `rgba(255,210,80,${0.85 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    ctx.font = `${fs}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.55 * alpha})`;
    ctx.fillText(val, x, canvasY);
  });

  ctx.beginPath();
  ctx.moveTo(pl, canvasY + 8);
  ctx.lineTo(canvas.offsetWidth - pl, canvasY + 8);
  ctx.strokeStyle = `rgba(240,240,240,${0.03 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function animate() {
  ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

  const globalAlpha = Math.min(scrollProgress * 4, 1, (1 - scrollProgress) * 4);

  if (globalAlpha > 0.01 && canvas._visibleRows) {
    drawHeader(globalAlpha);
    canvas._visibleRows.forEach(({ row, canvasY }) => {
      if (!row) return;  // add this line
      drawVisibleRow(row, canvasY, globalAlpha);
    });
  }

  requestAnimationFrame(animate);
}

animate();

})();