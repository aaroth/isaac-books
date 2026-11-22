// The layer of things placed on a page: words, stickers and photos.
// Tap one to pick it; drag to move; drag the ↻ handle to turn and resize;
// ✖ throws it away; ✏️ changes words; ➕ makes a copy.

import { h } from './ui.js';
import { uid } from './model.js';
import { getStickerSrc, leashHand, leashLoop } from './stickers.js';

// ---------- people walking dogs ----------

// A point given in sticker units (0..200) on a sticker item, in page pixels.
function stickerPoint(item, [u, v]) {
  const k = item.size / 200, a = (item.rot || 0) * Math.PI / 180;
  const dx = (u - 100) * k, dy = (v - 100) * k;
  return [item.x + dx * Math.cos(a) - dy * Math.sin(a), item.y + dx * Math.sin(a) + dy * Math.cos(a)];
}

// The hand or leash loop of an item, in page pixels, or null.
function handPoint(item) {
  const h = item.type === 'sticker' && leashHand(item.sticker);
  return h ? stickerPoint(item, h) : null;
}
function loopPoint(item) {
  const l = item.type === 'sticker' && leashLoop(item.sticker);
  return l ? stickerPoint(item, l) : null;
}

// True if this person already holds a leash, or this dog is already held.
function alreadyJoined(item, items) {
  const mine = handPoint(item) || loopPoint(item);
  const isPerson = !!handPoint(item);
  return items.some(other => {
    if (other.id === item.id) return false;
    const theirs = isPerson ? loopPoint(other) : handPoint(other);
    return theirs && Math.hypot(theirs[0] - mine[0], theirs[1] - mine[1]) < 3;
  });
}

// If item is a person or a dog on a leash, and one of the others is the
// other half, moves item so the leash loop is in the hand. With maxDist,
// only when they're already that close. With onlyFree, only joins someone
// who isn't already walking (or being walked by) someone else. Returns the
// moved item or null.
export function joinLeash(item, others, maxDist = Infinity, onlyFree = false) {
  if (item.type !== 'sticker') return null;
  const hand = leashHand(item.sticker), loop = leashLoop(item.sticker);
  if (!hand && !loop) return null;
  let best = null;
  // Most recently placed first, so a new dog goes with the newest person.
  for (const other of [...others].reverse()) {
    if (other.type !== 'sticker' || other.id === item.id) continue;
    const theirs = hand ? leashLoop(other.sticker) : leashHand(other.sticker);
    if (!theirs) continue;
    if (onlyFree && alreadyJoined(other, others)) continue;
    const target = stickerPoint(other, theirs);
    const mine = stickerPoint(item, hand || loop);
    const d = Math.hypot(target[0] - mine[0], target[1] - mine[1]);
    if (d <= maxDist && (!best || d < best.d)) best = { d, dx: target[0] - mine[0], dy: target[1] - mine[1] };
  }
  return best ? { ...item, x: item.x + best.dx, y: item.y + best.dy } : null;
}
import { itemSize, renderText, ensureFont } from './render.js';

const MIN_SIZE = 40;      // page pixels
const SNAP_DEGREES = 6;   // turning snaps to straight when this close

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const stop = e => e.stopPropagation();

export function scaleItem(item, f, rot = item.rot) {
  switch (item.type) {
    case 'sticker': return { ...item, size: item.size * f, rot };
    case 'photo': return { ...item, w: item.w * f, h: item.h * f, rot };
    // The layout is measured in multiples of the font size, so it scales too.
    case 'text': return { ...item, fontSize: item.fontSize * f, w: item.w * f, h: item.h * f, rot };
    default: return item;
  }
}

export class ItemsLayer {
  constructor({ W, H, onChange, onEditText }) {
    this.W = W; this.H = H;
    this.onChange = onChange;
    this.onEditText = onEditText;
    this.items = [];
    this.selectedId = null;
    this.scale = 1;
    this.photoUrls = new Map();
    this.el = h('div.items-layer', { style: { width: W + 'px', height: H + 'px' } });

    this.delBtn = h('button.sel-handle.sel-delete', {
      title: 'Throw away', onpointerdown: stop, onclick: () => this.removeSelected(),
    }, '✖');
    this.extraBtn = h('button.sel-handle.sel-extra', {
      onpointerdown: stop, onclick: () => this.extraAction(),
    });
    this.turnBtn = h('div.sel-handle.sel-turn', {
      title: 'Turn and resize', onpointerdown: e => this.startTurn(e),
    }, '↻');
    this.sel = h('div.selection', {}, this.delBtn, this.extraBtn, this.turnBtn);
  }

  get selected() { return this.items.find(i => i.id === this.selectedId) || null; }

  setScale(s) {
    const changed = Math.abs(s - this.scale) > 0.001;
    this.scale = s;
    this.el.style.transform = `scale(${s})`;
    this.el.style.setProperty('--inv', String(1 / s));
    // Words are pictures drawn at screen resolution, so redraw them.
    if (changed && this.items.some(i => i.type === 'text')) this.render();
  }

  // New items from outside (page load, undo). Keeps the selection if the
  // picked item still exists.
  setItems(items) {
    this.items = items;
    if (!this.selected) this.selectedId = null;
    this.render();
  }

  select(id) {
    this.selectedId = id;
    this.placeSelection();
  }

  commit(items) {
    this.items = items;
    this.render();
    this.onChange(items);
  }

  add(item) {
    this.selectedId = item.id;
    this.commit([...this.items, item]);
  }

  replace(item) {
    this.commit(this.items.map(i => (i.id === item.id ? item : i)));
  }

  updateSelected(changes) {
    const item = this.selected;
    if (item) this.replace({ ...item, ...changes });
  }

  removeSelected() {
    const id = this.selectedId;
    if (!id) return;
    this.selectedId = null;
    this.commit(this.items.filter(i => i.id !== id));
  }

  extraAction() {
    const item = this.selected;
    if (!item) return;
    if (item.type === 'text') { this.onEditText(item); return; }
    const off = Math.min(this.W, this.H) * 0.05;
    this.add({
      ...item, id: uid(),
      x: clamp(item.x + off, 0, this.W), y: clamp(item.y + off, 0, this.H),
    });
  }

  // ---------- drawing the elements ----------

  render() {
    this.el.replaceChildren(...this.items.map(item => this.elFor(item)));
    this.placeSelection();
  }

  photoUrl(blob) {
    let url = this.photoUrls.get(blob);
    if (!url) { url = URL.createObjectURL(blob); this.photoUrls.set(blob, url); }
    return url;
  }

  elFor(item) {
    const el = h('div.item.item-' + item.type, {
      'data-id': item.id,
      onpointerdown: e => this.onItemDown(e, item.id),
      oncontextmenu: e => e.preventDefault(),
    });
    if (item.type === 'sticker') {
      const img = h('img', { alt: '', draggable: false });
      el.append(img);
      getStickerSrc(item.sticker).then(src => {
        if (src) img.src = src;
        else el.replaceChildren(h('span.emoji-fallback', {}, item.sticker));
      });
    } else if (item.type === 'photo') {
      el.append(h('img', { alt: '', draggable: false, src: this.photoUrl(item.blob) }));
    } else if (item.type === 'text') {
      // Drawn with the same code as thumbnails and printing, so it matches.
      const c = h('canvas.text-canvas');
      el.append(c);
      this.drawText(c, item);
      ensureFont(item.font, item.text).then(() => this.drawText(c, item));
    }
    this.place(el, item);
    return el;
  }

  // The canvas is a bit bigger than the item so tall or curly letters
  // aren't cut off (see .text-canvas in the CSS).
  drawText(canvas, item) {
    const k = this.scale * (window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.ceil(item.w * 1.2 * k));
    canvas.height = Math.max(1, Math.ceil(item.h * 1.4 * k));
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    renderText(ctx, item, k);
  }

  // Positions an element (an item or the selection box) over the page.
  place(el, item) {
    const [w, h] = itemSize(item);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.setProperty('--w', w + 'px');
    el.style.setProperty('--h', h + 'px');
    el.style.transform = `translate(${item.x - w / 2}px, ${item.y - h / 2}px) rotate(${item.rot || 0}deg)`;
  }

  placeSelection() {
    const item = this.selected;
    if (!item) { this.sel.remove(); return; }
    this.place(this.sel, item);
    const isText = item.type === 'text';
    this.extraBtn.textContent = isText ? '✏️' : '➕';
    this.extraBtn.title = isText ? 'Change the words' : 'Make a copy';
    this.el.append(this.sel);
  }

  elementFor(id) {
    return this.el.querySelector(`.item[data-id="${CSS.escape(id)}"]`);
  }

  toPage(e) {
    const r = this.el.getBoundingClientRect();
    return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale];
  }

  // ---------- moving ----------

  onItemDown(e, id) {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const wasSelected = this.selectedId === id;
    this.select(id);
    const item = this.selected;
    const el = e.currentTarget;
    const [px, py] = this.toPage(e);
    let moved = false;
    let live = item;
    try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    // Moving a person brings along any dog whose leash they're holding.
    // (Moving the dog on its own takes the leash out of their hand.)
    const hand = handPoint(item);
    const dogs = hand ? this.items.filter(o => {
      const l = loopPoint(o);
      return l && o.id !== id && Math.hypot(l[0] - hand[0], l[1] - hand[1]) < 3;
    }) : [];
    let liveDogs = dogs;

    const move = ev => {
      const [qx, qy] = this.toPage(ev);
      let dx = qx - px, dy = qy - py;
      if (!moved && Math.hypot(dx, dy) * this.scale < 5) return;
      moved = true;
      live = { ...item, x: clamp(item.x + dx, 0, this.W), y: clamp(item.y + dy, 0, this.H) };
      dx = live.x - item.x; dy = live.y - item.y;
      liveDogs = dogs.map(d => ({ ...d, x: d.x + dx, y: d.y + dy }));
      this.place(el, live);
      liveDogs.forEach(d => { const de = this.elementFor(d.id); if (de) this.place(de, d); });
      this.place(this.sel, live);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (moved) {
        const movedDogs = new Map(liveDogs.map(d => [d.id, d]));
        const others = this.items.filter(i => i.id !== id).map(i => movedDogs.get(i.id) || i);
        // A leash loop let go near a hand snaps into it (and the other way
        // round), unless this person already brought their dog along.
        if (!dogs.length) live = joinLeash(live, others, Math.max(60, live.size * 0.22)) || live;
        // Moving something brings it to the front.
        this.commit(others.concat(live));
      }
      else if (wasSelected && item.type === 'text') this.onEditText(item);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  // ---------- turning and resizing ----------

  startTurn(e) {
    e.stopPropagation();
    e.preventDefault();
    const item = this.selected;
    if (!item) return;
    const handle = e.currentTarget;
    const el = this.elementFor(item.id);
    const [px, py] = this.toPage(e);
    const d0 = Math.hypot(px - item.x, py - item.y) || 1;
    const a0 = Math.atan2(py - item.y, px - item.x);
    const [w0, h0] = itemSize(item);
    const minF = MIN_SIZE / Math.min(w0, h0);
    const maxF = (2.5 * Math.max(this.W, this.H)) / Math.max(w0, h0);
    let live = item;
    try { handle.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    const move = ev => {
      const [qx, qy] = this.toPage(ev);
      const f = clamp(Math.hypot(qx - item.x, qy - item.y) / d0, minF, maxF);
      let rot = (item.rot || 0) + (Math.atan2(qy - item.y, qx - item.x) - a0) * 180 / Math.PI;
      rot = ((rot % 360) + 540) % 360 - 180;           // -180..180
      const off = ((rot % 90) + 90) % 90;
      if (off < SNAP_DEGREES) rot -= off;
      else if (off > 90 - SNAP_DEGREES) rot += 90 - off;
      live = scaleItem(item, f, Math.round(rot * 10) / 10);
      if (el) this.place(el, live);
      this.place(this.sel, live);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (live !== item) this.replace(live);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  destroy() {
    for (const url of this.photoUrls.values()) URL.revokeObjectURL(url);
    this.photoUrls.clear();
  }
}
