// The layer of things placed on a page: words, stickers and photos.
// Tap one to pick it; drag to move; drag the ↻ handle to turn and resize;
// ✖ throws it away; ✏️ changes words; ➕ makes a copy.

import { h } from './ui.js';
import { uid } from './model.js';
import { getStickerSrc } from './stickers.js';
import { itemSize, fontCss, LINE_HEIGHT } from './render.js';

const MIN_SIZE = 40;      // page pixels
const SNAP_DEGREES = 6;   // turning snaps to straight when this close

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const stop = e => e.stopPropagation();

export function scaleItem(item, f, rot = item.rot) {
  switch (item.type) {
    case 'sticker': return { ...item, size: item.size * f, rot };
    case 'photo': return { ...item, w: item.w * f, h: item.h * f, rot };
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
    this.scale = s;
    this.el.style.transform = `scale(${s})`;
    this.el.style.setProperty('--inv', String(1 / s));
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
      el.textContent = item.lines.join('\n');
      el.style.color = item.color;
    }
    this.place(el, item);
    return el;
  }

  // Positions an element (an item or the selection box) over the page.
  place(el, item) {
    const [w, h] = itemSize(item);
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.setProperty('--w', w + 'px');
    el.style.setProperty('--h', h + 'px');
    el.style.transform = `translate(${item.x - w / 2}px, ${item.y - h / 2}px) rotate(${item.rot || 0}deg)`;
    if (item.type === 'text' && el !== this.sel) {
      el.style.font = fontCss(item.font, item.fontSize);
      el.style.lineHeight = String(LINE_HEIGHT);
    }
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

    const move = ev => {
      const [qx, qy] = this.toPage(ev);
      const dx = qx - px, dy = qy - py;
      if (!moved && Math.hypot(dx, dy) * this.scale < 5) return;
      moved = true;
      live = { ...item, x: clamp(item.x + dx, 0, this.W), y: clamp(item.y + dy, 0, this.H) };
      this.place(el, live);
      this.place(this.sel, live);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      // Moving something brings it to the front.
      if (moved) this.commit(this.items.filter(i => i.id !== id).concat(live));
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
