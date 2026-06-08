(function() {

const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
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

const FONT_SIZE = 12;
const ROW_HEIGHT = 26;
const COL_WIDTHS = [50, 110, 40, 40, 90];
const PADDING_LEFT = 16;
const HEADER_Y = 50;
const POOL_SIZE = 200; // big pool, we scroll through them

let rows = [];
let scrollProgress = 0;
let scrollOffset = 0; // continuous pixel offset for scrolling rows

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
  // expose first visible rows for helix targeting
  updateVisibleRows();
}

function getColX(i) {
  let x = PADDING_LEFT;
  for (let j = 0; j < i; j++) x += COL_WIDTHS[j] + 20;
  return x;
}

// which rows are currently visible — exposed for helix.js
function updateVisibleRows() {
  const visibleCount = Math.ceil(canvas.height / ROW_HEIGHT) + 1;
  const startIndex = Math.floor(scrollOffset / ROW_HEIGHT) % POOL_SIZE;
  const visible = [];
  for (let i = 0; i < visibleCount; i++) {
    const idx = (startIndex + i) % POOL_SIZE;
    const canvasY = HEADER_Y + 40 + i * ROW_HEIGHT - (scrollOffset % ROW_HEIGHT);
    visible.push({ row: rows[idx], canvasY });
  }
  canvas._visibleRows = visible;
  canvas._rows = visible.map(v => v.row); // back compat
}

// scroll progress
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

  // drive continuous scroll offset based on progress
  scrollOffset = scrollProgress * POOL_SIZE * ROW_HEIGHT * 0.4;
  updateVisibleRows();
}

// draw
function drawHeader(alpha) {
  let x = PADDING_LEFT;
  COLS_DEF.forEach((col, i) => {
    ctx.font = `${FONT_SIZE - 1}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.3 * alpha})`;
    ctx.fillText(col, x, HEADER_Y);
    x += COL_WIDTHS[i] + 20;
  });
  ctx.beginPath();
  ctx.moveTo(PADDING_LEFT, HEADER_Y + 8);
  ctx.lineTo(canvas.width - PADDING_LEFT, HEADER_Y + 8);
  ctx.strokeStyle = `rgba(240,240,240,${0.1 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawVisibleRow(rowData, canvasY, globalAlpha) {
  if (canvasY < HEADER_Y || canvasY > canvas.height + ROW_HEIGHT) return;

  // fade rows at top and bottom edges
  const edgeFade = Math.min(
    Math.max(0, (canvasY - HEADER_Y - 20) / 40),
    Math.max(0, (canvas.height - canvasY) / 60),
    1
  );

  const alpha = globalAlpha * edgeFade;
  if (alpha <= 0.01) return;

  const { values } = rowData;

  values.forEach((val, colIndex) => {
    const x = getColX(colIndex);

    if (colIndex === 2 || colIndex === 3) {
      const color = BASE_COLORS[val] || 'rgba(240,240,240,';
      ctx.font = `bold ${FONT_SIZE}px monospace`;
      ctx.fillStyle = `${color}${0.9 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    if (colIndex === 4) {
      const af = parseFloat(val);
      const barWidth = 55 * af;
      ctx.fillStyle = `rgba(120,255,150,${0.1 * alpha})`;
      ctx.fillRect(x, canvasY - 11, barWidth, 14);
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.fillStyle = `rgba(120,255,150,${0.75 * alpha})`;
      ctx.fillText(val, x + 60, canvasY);
      return;
    }

    if (colIndex === 0) {
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.fillStyle = `rgba(255,210,80,${0.85 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    if (colIndex === 1) {
      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.fillStyle = `rgba(240,240,240,${0.55 * alpha})`;
      ctx.fillText(val, x, canvasY);
      return;
    }

    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.fillStyle = `rgba(240,240,240,${0.6 * alpha})`;
    ctx.fillText(val, x, canvasY);
  });

  ctx.beginPath();
  ctx.moveTo(PADDING_LEFT, canvasY + 8);
  ctx.lineTo(canvas.width - PADDING_LEFT, canvasY + 8);
  ctx.strokeStyle = `rgba(240,240,240,${0.03 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const globalAlpha = Math.min(scrollProgress * 4, 1, (1 - scrollProgress) * 4);

  if (globalAlpha > 0.01 && canvas._visibleRows) {
    drawHeader(globalAlpha);
    canvas._visibleRows.forEach(({ row, canvasY }) => {
      drawVisibleRow(row, canvasY, globalAlpha);
    });
  }

  requestAnimationFrame(animate);
}

animate();

})();