// Drawing engine: brush strokes, flood fill, and an undo history.
//
// Everything Isaac does to a page is an "op". Strokes are drawn segment by
// segment while he draws, and the same segment code replays them for undo,
// so a replayed stroke looks exactly like the live one.

export const TOOLS = {
  brush:   { label: 'Brush',   icon: '🖌️', widthScale: 1 },
  marker:  { label: 'Marker',  icon: '🖊️', widthScale: 1.7 },
  crayon:  { label: 'Crayon',  icon: '🖍️', widthScale: 1.3 },
  rainbow: { label: 'Rainbow', icon: '🌈', widthScale: 1.3 },
  fill:    { label: 'Fill',    icon: '🪣' },
  eraser:  { label: 'Eraser',  icon: '🧽', widthScale: 2 },
};

export const SIZES = [10, 24, 52]; // stroke widths in page pixels (200 per inch)
export const MARKER_ALPHA = 0.45;
const MIN_POINT_GAP = 2;

// ---------- strokes ----------

export function makeStroke(tool, color, sizeIndex) {
  return {
    type: 'stroke', tool, color,
    width: SIZES[sizeIndex] * TOOLS[tool].widthScale,
    points: [], dist: [],
    hue: Math.floor(Math.random() * 360),
  };
}

// Adds a point; returns false if it is too close to the last one to matter.
export function addPoint(op, x, y) {
  const p = op.points;
  if (p.length) {
    const last = p[p.length - 1];
    const d = Math.hypot(x - last[0], y - last[1]);
    if (d < MIN_POINT_GAP) return false;
    op.dist.push(op.dist[op.dist.length - 1] + d);
  } else {
    op.dist.push(0);
  }
  p.push([x, y]);
  return true;
}

const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

function setStyle(ctx, op, i) {
  let style;
  if (op.tool === 'rainbow') style = `hsl(${(op.hue + op.dist[i] * 0.3) % 360} 92% 55%)`;
  else if (op.tool === 'eraser') style = '#000';
  else style = op.color;
  ctx.strokeStyle = style;
  ctx.fillStyle = style;
  ctx.lineWidth = op.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Draws the curve that point i adds (i >= 1): from the midpoint before
// point i-1 to the midpoint after it, bending through point i-1.
export function drawSegment(ctx, op, i) {
  const p = op.points;
  const a = i === 1 ? p[0] : mid(p[i - 2], p[i - 1]);
  const b = mid(p[i - 1], p[i]);
  setStyle(ctx, op, i);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(p[i - 1][0], p[i - 1][1], b[0], b[1]);
  ctx.stroke();
}

// Finishes a stroke: the last half-segment, or a dot for a single tap.
export function drawStrokeEnd(ctx, op) {
  const p = op.points;
  const n = p.length;
  if (!n) return;
  setStyle(ctx, op, n - 1);
  if (n === 1) {
    ctx.beginPath();
    ctx.arc(p[0][0], p[0][1], op.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const a = mid(p[n - 2], p[n - 1]);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(p[n - 1][0], p[n - 1][1]);
  ctx.stroke();
}

function drawWholeStroke(ctx, op) {
  for (let i = 1; i < op.points.length; i++) drawSegment(ctx, op, i);
  drawStrokeEnd(ctx, op);
}

// Strokes that are drawn solid on a separate layer first, then finished as
// a whole: markers get see-through, crayons get the paper texture. Doing it
// to the whole stroke stops overlapping bits of one stroke getting darker.
export const usesLayer = tool => tool === 'marker' || tool === 'crayon';

// Finishes a stroke drawn on its own layer and puts it on the drawing.
export function commitLayer(ctx, layer, tool) {
  const l = layer.getContext('2d');
  if (tool === 'crayon') applyGrain(l);
  ctx.save();
  ctx.globalAlpha = tool === 'marker' ? MARKER_ALPHA : 1;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
  l.clearRect(0, 0, layer.width, layer.height);
}

// Replays a finished stroke onto the drawing.
export function replayStroke(ctx, op, scratch) {
  if (!op.points.length) return;
  ctx.save();
  if (op.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    drawWholeStroke(ctx, op);
  } else if (usesLayer(op.tool)) {
    const s = scratch.getContext('2d');
    s.clearRect(0, 0, scratch.width, scratch.height);
    drawWholeStroke(s, op);
    commitLayer(ctx, scratch, op.tool);
  } else {
    drawWholeStroke(ctx, op);
  }
  ctx.restore();
}

// ---------- crayon texture ----------

let grain = null;
export function grainCanvas() {
  if (grain) return grain;
  // Paper "tooth": coarse blotches (small noise scaled up, so they show
  // even when the page is shown small) plus fine speckle.
  const size = 384, coarse = 64;
  let seed = 20261121;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const small = document.createElement('canvas');
  small.width = small.height = coarse;
  const sctx = small.getContext('2d');
  const simg = sctx.createImageData(coarse, coarse);
  for (let i = 0; i < coarse * coarse; i++) {
    const v = 255 * rnd();
    simg.data[i * 4] = simg.data[i * 4 + 1] = simg.data[i * 4 + 2] = v;
    simg.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(simg, 0, 0);

  grain = document.createElement('canvas');
  grain.width = grain.height = size;
  const g = grain.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, size, size);
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < size * size; i++) {
    const blotch = img.data[i * 4] / 255;       // 0..1, smooth
    const speck = rnd();
    // Light where the blotch is high or a speck lands. The lowest value
    // stays above the fill tool's "empty" threshold so paint-bucket fills
    // don't leak through crayon.
    let a = 255 - Math.max(0, blotch - 0.45) * 260;
    if (speck < 0.18) a -= 60 * rnd();
    img.data[i * 4 + 3] = Math.max(85, Math.min(255, a));
  }
  g.putImageData(img, 0, 0);
  return grain;
}

// Keeps only the paper-texture parts of what is on ctx.
function applyGrain(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat');
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// ---------- flood fill ----------

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const EMPTY_ALPHA = 64;   // pixels fainter than this count as empty paper
const TOLERANCE = 48;

// Fills the area around (x, y) on the drawing layer with color.
// Returns false if nothing changed.
export function floodFill(ctx, x, y, color) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return false;

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const [fr, fg, fb] = hexToRgb(color);
  const s = (y * W + x) * 4;
  const sr = d[s], sg = d[s + 1], sb = d[s + 2], sa = d[s + 3];
  const seedEmpty = sa < EMPTY_ALPHA;
  if (!seedEmpty && sa === 255 && sr === fr && sg === fg && sb === fb) return false;

  const match = i => {
    const a = d[i + 3];
    if (seedEmpty) return a < EMPTY_ALPHA;
    if (a < EMPTY_ALPHA) return false;
    return Math.abs(d[i] - sr) <= TOLERANCE && Math.abs(d[i + 1] - sg) <= TOLERANCE &&
           Math.abs(d[i + 2] - sb) <= TOLERANCE && Math.abs(a - sa) <= TOLERANCE * 2;
  };

  // Scanline fill into a mask.
  const mask = new Uint8Array(W * H);
  let minX = x, maxX = x, minY = y, maxY = y;
  const stack = [x, y];
  while (stack.length) {
    const cy = stack.pop(), cx = stack.pop();
    const row = cy * W;
    let lx = cx;
    while (lx >= 0 && !mask[row + lx] && match((row + lx) * 4)) lx--;
    lx++;
    let rx = cx;
    while (rx < W && !mask[row + rx] && match((row + rx) * 4)) rx++;
    rx--;
    if (lx > rx) continue;
    for (let i = lx; i <= rx; i++) mask[row + i] = 1;
    if (lx < minX) minX = lx;
    if (rx > maxX) maxX = rx;
    if (cy < minY) minY = cy;
    if (cy > maxY) maxY = cy;
    for (const ny of [cy - 1, cy + 1]) {
      if (ny < 0 || ny >= H) continue;
      const nrow = ny * W;
      let inRun = false;
      for (let i = lx; i <= rx; i++) {
        const k = nrow + i;
        const m = !mask[k] && match(k * 4);
        if (m && !inRun) { stack.push(i, ny); inRun = true; }
        else if (!m) inRun = false;
      }
    }
  }

  // Paint the area, and tuck the color one pixel under the soft edges of
  // the surrounding lines so no white halo is left.
  const x0 = Math.max(0, minX - 1), x1 = Math.min(W - 1, maxX + 1);
  const y0 = Math.max(0, minY - 1), y1 = Math.min(H - 1, maxY + 1);
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const k = py * W + px;
      const i = k * 4;
      if (mask[k]) {
        d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
        continue;
      }
      const near =
        (px > 0 && mask[k - 1]) || (px < W - 1 && mask[k + 1]) ||
        (py > 0 && mask[k - W]) || (py < H - 1 && mask[k + W]) ||
        (px > 0 && py > 0 && mask[k - W - 1]) || (px < W - 1 && py > 0 && mask[k - W + 1]) ||
        (px > 0 && py < H - 1 && mask[k + W - 1]) || (px < W - 1 && py < H - 1 && mask[k + W + 1]);
      if (near) {
        const a = d[i + 3] / 255;
        d[i] = d[i] * a + fr * (1 - a);
        d[i + 1] = d[i + 1] * a + fg * (1 - a);
        d[i + 2] = d[i + 2] * a + fb * (1 - a);
        d[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  return true;
}

// ---------- undo history ----------

const MAX_UNDO = 20;

// Applies one op to a drawing context. state.bg holds the paper color.
export function applyOp(ctx, op, scratch, state) {
  switch (op.type) {
    case 'stroke': replayStroke(ctx, op, scratch); break;
    case 'fill': floodFill(ctx, op.x, op.y, op.color); break;
    case 'clear': ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); break;
    case 'bg': state.bg = op.color; break;
  }
}

// Keeps a snapshot of the page from when it was opened (or from MAX_UNDO
// steps ago) plus the ops since then. Undo rebuilds from the snapshot.
export class History {
  constructor(drawCanvas, bg) {
    const { width, height } = drawCanvas;
    this.base = document.createElement('canvas');
    this.base.width = width; this.base.height = height;
    this.base.getContext('2d').drawImage(drawCanvas, 0, 0);
    this.baseBg = bg;
    this.scratch = document.createElement('canvas');
    this.scratch.width = width; this.scratch.height = height;
    this.ops = [];
    this.undone = [];
  }

  get canUndo() { return this.ops.length > 0; }
  get canRedo() { return this.undone.length > 0; }

  // Records an op that has already been drawn on the live canvas.
  push(op) {
    this.ops.push(op);
    this.undone.length = 0;
    if (this.ops.length > MAX_UNDO) {
      const oldest = this.ops.shift();
      const state = { bg: this.baseBg };
      applyOp(this.base.getContext('2d'), oldest, this.scratch, state);
      this.baseBg = state.bg;
    }
  }

  // Both return the paper color after the change, or null if nothing to do.
  undo(drawCtx) {
    if (!this.ops.length) return null;
    this.undone.push(this.ops.pop());
    drawCtx.clearRect(0, 0, drawCtx.canvas.width, drawCtx.canvas.height);
    drawCtx.drawImage(this.base, 0, 0);
    const state = { bg: this.baseBg };
    for (const op of this.ops) applyOp(drawCtx, op, this.scratch, state);
    return state.bg;
  }

  redo(drawCtx, currentBg) {
    if (!this.undone.length) return null;
    const op = this.undone.pop();
    this.ops.push(op);
    const state = { bg: currentBg };
    applyOp(drawCtx, op, this.scratch, state);
    return state.bg;
  }
}
