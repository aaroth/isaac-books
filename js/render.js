// Drawing a page's paper and its items (text, stickers, photos) onto a
// canvas. Used for thumbnails, the shelf cover and, later, the reader and
// printing. The editor shows the same things as HTML elements; both use
// the sizes and line breaks stored on each item so they match.

import { loadStickerImage, isEmojiSticker } from './stickers.js';
import { SHAPES } from './model.js';

// A finished picture of a whole page, at most maxDim pixels on its longer side.
export async function renderPageCanvas(page, shape, maxDim) {
  const { w, h } = SHAPES[shape];
  const s = maxDim / Math.max(w, h);
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  const ctx = c.getContext('2d');
  drawPaper(ctx, c.width, c.height, page.bg, page.bgPattern || 'none');
  if (page.drawing) {
    try {
      const bmp = await createImageBitmap(page.drawing);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close?.();
    } catch (err) { console.error(err); }
  }
  await renderItems(ctx, page.items || [], s);
  return c;
}

// ---------- fonts ----------

export const FONTS = [
  { id: 'Fredoka', label: 'Round', weight: 500 },
  { id: 'Patrick Hand', label: 'Handwriting', weight: 400 },
  { id: 'Luckiest Guy', label: 'Cartoon', weight: 400 },
  { id: 'Creepster', label: 'Spooky', weight: 400 },
];

export const LINE_HEIGHT = 1.2;

export function fontCss(font, size) {
  const f = FONTS.find(x => x.id === font) || FONTS[0];
  return `${f.weight} ${size}px "${f.id}", "Fredoka", sans-serif`;
}

export async function ensureFont(font, text = 'Abc') {
  try { await document.fonts.load(fontCss(font, 40), text); } catch { /* use fallback */ }
}

let measureCtx = null;
const metricsCache = new Map();

// Ascent and descent of a font, as fractions of its size.
function fontMetrics(font) {
  if (metricsCache.has(font)) return metricsCache.get(font);
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = fontCss(font, 100);
  const m = measureCtx.measureText('Hgjy');
  const metrics = {
    asc: (m.fontBoundingBoxAscent || 80) / 100,
    desc: (m.fontBoundingBoxDescent || 22) / 100,
  };
  // Only remember it once the real font has loaded.
  if (document.fonts.check(fontCss(font, 40))) metricsCache.set(font, metrics);
  return metrics;
}

// Lays out text where every letter can have its own size (scales[i] is the
// size of text[i], 1 = normal). Wraps at spaces to fit maxWidthEm, centers
// each line. Everything is measured in "em" (multiples of the font size),
// so the item can be resized without laying it out again.
// Returns { lines: [{ baseline, runs: [{ t, s, x }] }], w, h }.
export function layoutRichText(text, scales, font, maxWidthEm) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx;
  const { asc, desc } = fontMetrics(font);
  const widthOf = (str, s) => { ctx.font = fontCss(font, 100 * s); return ctx.measureText(str).width / 100; };
  const scaleAt = i => (scales && scales[i]) || 1;

  // Width of a run of letters, measuring same-size stretches together.
  const charsWidth = chars => {
    let w = 0, i = 0;
    while (i < chars.length) {
      let j = i;
      while (j < chars.length && chars[j].s === chars[i].s) j++;
      w += widthOf(chars.slice(i, j).map(c => c.c).join(''), chars[i].s);
      i = j;
    }
    return w;
  };

  const rawLines = []; // arrays of { c, s }
  let index = 0;
  for (const para of text.split('\n')) {
    const chars = [...para].map((c, k) => ({ c, s: scaleAt(index + k) }));
    // Indexes count letters (code points), so emoji take one slot.
    const len = [...para].length;
    const newlineScale = scaleAt(index + len) || 1;
    index += len + 1;
    // Split into words and spaces.
    const tokens = [];
    for (const ch of chars) {
      const space = ch.c === ' ';
      const last = tokens[tokens.length - 1];
      if (last && last.space === space) last.chars.push(ch);
      else tokens.push({ space, chars: [ch] });
    }
    let line = [], lineW = 0, pending = [];
    const pushLine = () => { rawLines.push(line.length ? line : [{ c: '', s: newlineScale }]); line = []; lineW = 0; pending = []; };
    for (const tok of tokens) {
      if (tok.space) { pending = tok.chars; continue; }
      let word = tok.chars;
      let wordW = charsWidth(word);
      const spaceW = line.length ? charsWidth(pending) : 0;
      if (line.length && lineW + spaceW + wordW > maxWidthEm) pushLine();
      else if (line.length) { line.push(...pending); lineW += spaceW; }
      // A word too long for a whole line is split up.
      while (wordW > maxWidthEm && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && charsWidth(word.slice(0, cut)) > maxWidthEm) cut--;
        if (line.length) pushLine();
        line = word.slice(0, cut);
        pushLine();
        word = word.slice(cut);
        wordW = charsWidth(word);
      }
      line.push(...word);
      lineW += wordW;
      pending = [];
    }
    pushLine();
  }

  // Turn each line into runs of same-size letters with x positions.
  let top = 0, maxW = 0;
  const lines = rawLines.map(chars => {
    const runs = [];
    let x = 0, i = 0;
    while (i < chars.length) {
      let j = i;
      while (j < chars.length && chars[j].s === chars[i].s) j++;
      const t = chars.slice(i, j).map(c => c.c).join('');
      runs.push({ t, s: chars[i].s, x });
      x += widthOf(t, chars[i].s);
      i = j;
    }
    const big = Math.max(...chars.map(c => c.s));
    const lh = big * LINE_HEIGHT;
    const baseline = top + (lh - big * (asc + desc)) / 2 + big * asc;
    top += lh;
    maxW = Math.max(maxW, x);
    return { baseline, runs, width: x };
  });
  const w = Math.max(maxW, 0.5) + 0.4;
  for (const line of lines) {
    const off = (w - line.width) / 2;
    for (const r of line.runs) r.x += off;
    delete line.width;
  }
  return { lines, w, h: top };
}

// Draws a text item centered on (0, 0). scale converts page pixels to ctx
// pixels.
export function renderText(ctx, item, scale) {
  const fs = item.fontSize * scale;
  const [w, h] = itemSize(item).map(v => v * scale);
  ctx.fillStyle = item.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (item.layout) {
    for (const line of item.layout.lines) {
      for (const run of line.runs) {
        ctx.font = fontCss(item.font, fs * run.s);
        ctx.fillText(run.t, -w / 2 + run.x * fs, -h / 2 + line.baseline * fs);
      }
    }
  } else {
    // Words made before letters could have their own sizes.
    ctx.font = fontCss(item.font, fs);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = fs * LINE_HEIGHT;
    item.lines.forEach((line, n) => ctx.fillText(line, 0, -h / 2 + lh * (n + 0.5)));
  }
}

// Breaks text into lines no wider than maxWidth. Returns the lines and the
// box size they need.
export function layoutText(text, font, fontSize, maxWidth) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx;
  ctx.font = fontCss(font, fontSize);
  const width = s => ctx.measureText(s).width;
  const lines = [];
  for (const para of text.split('\n')) {
    const words = para.split(/ +/);
    let line = '';
    for (let word of words) {
      // A single word too long for the box is split up.
      while (width(word) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && width(word.slice(0, cut)) > maxWidth) cut--;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const tryLine = line ? line + ' ' + word : word;
      if (line && width(tryLine) > maxWidth) { lines.push(line); line = word; }
      else line = tryLine;
    }
    lines.push(line);
  }
  const textWidth = Math.max(...lines.map(width), fontSize * 0.5);
  return {
    lines,
    w: Math.ceil(textWidth + fontSize * 0.4),
    h: Math.ceil(lines.length * fontSize * LINE_HEIGHT),
  };
}

// ---------- items ----------

export function itemSize(item) {
  if (item.type === 'sticker') return [item.size, item.size];
  return [item.w, item.h];
}

// The white border around a photo, in page pixels.
export const photoBorder = item => Math.round(Math.min(item.w, item.h) * 0.045);

const photoBitmaps = new WeakMap();
function photoBitmap(blob) {
  if (!photoBitmaps.has(blob)) photoBitmaps.set(blob, createImageBitmap(blob).catch(() => null));
  return photoBitmaps.get(blob);
}

const EMOJI_FONT = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';

// Draws items onto ctx, where scale converts page pixels to ctx pixels.
export async function renderItems(ctx, items, scale) {
  // Load every picture first, then draw in order so layering is right.
  const pictures = await Promise.all(items.map(item =>
    item.type === 'sticker' ? loadStickerImage(item.sticker)
      : item.type === 'photo' ? photoBitmap(item.blob)
        : item.type === 'text' ? ensureFont(item.font, item.text) : null));

  items.forEach((item, i) => {
    const pic = pictures[i];
    const [w, h] = itemSize(item).map(v => v * scale);
    ctx.save();
    ctx.translate(item.x * scale, item.y * scale);
    ctx.rotate((item.rot || 0) * Math.PI / 180);

    if (item.type === 'sticker') {
      if (pic) ctx.drawImage(pic, -w / 2, -h / 2, w, h);
      else if (isEmojiSticker(item.sticker)) {
        ctx.font = `${h * 0.82}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.sticker, 0, h * 0.04);
      }
    } else if (item.type === 'photo') {
      const b = photoBorder(item) * scale;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 14 * scale;
      ctx.shadowOffsetY = 5 * scale;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.shadowColor = 'transparent';
      if (pic) ctx.drawImage(pic, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b);
    } else if (item.type === 'text') {
      renderText(ctx, item, scale);
    }
    ctx.restore();
  });
}

// ---------- paper ----------

export const PAPER_PATTERNS = [
  { id: 'none', label: 'Plain' },
  { id: 'lines', label: 'Lines' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Squares' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'stars', label: 'Stars' },
];

export const PAPER_COLORS = [
  '#ffffff', '#fff8e1', '#fde2e4', '#e3f2fd', '#e8f5e9', '#f3e5f5',
  '#fff59d', '#ffd23f', '#ff9f43', '#ff5d5d', '#ff7eb6', '#b388eb',
  '#4aa3ff', '#2ec4b6', '#7bd389', '#8d6e63', '#37474f', '#212121',
];

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
}

// Fills a w x h canvas with paper color and pattern. Sizes are relative to
// the canvas, so a thumbnail looks like a small copy of the page.
export function drawPaper(ctx, w, h, color, pattern = 'none') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const u = Math.min(w, h) / 14;
  const ink = isDark(color) ? 'rgba(255, 255, 255, 0.26)' : 'rgba(40, 70, 110, 0.17)';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1, u * 0.045);

  if (pattern === 'lines') {
    for (let y = u * 1.6; y < h - u * 0.5; y += u * 0.95) {
      ctx.beginPath(); ctx.moveTo(u * 0.6, y); ctx.lineTo(w - u * 0.6, y); ctx.stroke();
    }
  } else if (pattern === 'grid') {
    const step = u * 0.8;
    for (let x = step; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = step; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (pattern === 'dots') {
    const step = u * 0.8;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        ctx.beginPath(); ctx.arc(x, y, u * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (pattern === 'stripes') {
    const step = u * 1.1;
    for (let x = 0; x < w; x += step * 2) ctx.fillRect(x, 0, step, h);
  } else if (pattern === 'stars') {
    let seed = 99;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const step = u * 1.5;
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        starPath(ctx, x + (rnd() - 0.5) * step * 0.6, y + (rnd() - 0.5) * step * 0.6, u * (0.12 + rnd() * 0.14));
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ---------- pictures from files and the camera ----------

// Shrinks a picture to at most maxDim on its longer side and saves it as
// WebP (small files, keeps see-through parts).
export async function shrinkPicture(source, maxDim = 1600) {
  const bitmap = source instanceof Blob
    ? await createImageBitmap(source, { imageOrientation: 'from-image' })
    : source;
  const sw = bitmap.width, sh = bitmap.height;
  const s = Math.min(1, maxDim / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * s));
  c.height = Math.max(1, Math.round(sh * s));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  if (bitmap.close && source instanceof Blob) bitmap.close();
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.9));
  return { blob, width: c.width, height: c.height };
}
