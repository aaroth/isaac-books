// The page editor: draw on one page at a time, add words, stickers and
// pictures, with a strip of all pages along the bottom.

import * as db from './db.js';
import {
  SHAPES, pageLabel, shortPageLabel, isCover, insidePageCount, makePage, uid,
  MAX_INSIDE_PAGES, MIN_INSIDE_PAGES,
} from './model.js';
import {
  TOOLS, SIZES, MARKER_ALPHA, makeStroke, addPoint, drawSegment, drawStrokeEnd,
  floodFill, History, commitLayer, grainCanvas,
} from './draw.js';
import { drawPaper, renderItems, layoutRichText, shrinkPicture, ensureFont } from './render.js';
import { ItemsLayer } from './items.js';
import {
  textDialog, stickerDialog, pickPictureFile, cameraDialog, hasCamera, paperDialog, messageDialog,
} from './dialogs.js';
import { h, confirmDialog } from './ui.js';
import { readerPositionForPage } from './reader.js';

const PALETTE = [
  '#212121', '#9e9e9e', '#ffffff',
  '#e53935', '#ff6f91', '#f8bbd0',
  '#fb8c00', '#ffb74d', '#fdd835',
  '#fff59d', '#9ccc65', '#43a047',
  '#1b5e20', '#00bcd4', '#64b5f6',
  '#1e88e5', '#0d47a1', '#8e24aa',
  '#ce93d8', '#f1c27d', '#e0ac69',
  '#a1887f', '#8d5524', '#6d4c41',
];

const AUTHOR = 'Isaac';

const toBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not save picture'))), type, quality));

export async function openEditor(root, bookId, startIndex) {
  const book = await db.getBook(bookId);
  if (!book) { location.hash = '#/'; return { destroy() {} }; }
  const records = await db.getPages(book.pageIds);
  const pages = new Map();
  book.pageIds.forEach((id, i) => {
    const bg = isCover(book, i) ? book.coverColor : '#ffffff';
    const page = records[i] || { ...makePage(book.id, bg), id };
    page.bgPattern = page.bgPattern || 'none';
    page.items = page.items || [];
    pages.set(id, page);
  });
  const editor = new Editor(root, book, pages);
  const last = book.pageIds.length - 1;
  await editor.goTo(Math.max(0, Math.min(last, startIndex | 0)));
  return editor;
}

class Editor {
  constructor(root, book, pages) {
    this.book = book;
    this.pages = pages;
    const { w, h: ph } = SHAPES[book.shape];
    this.W = w; this.H = ph;

    this.tool = 'brush';
    this.color = '#212121';
    this.sizeIndex = 1;
    this.index = -1;
    this.page = null;
    this.bg = '#ffffff';
    this.pattern = 'none';
    this.history = null;
    this.stroke = null;
    this.dirty = false;
    this.saveTimer = 0;
    this.saveChain = Promise.resolve();
    this.thumbUrls = new Map();
    this.loadToken = 0;
    this.addCount = 0;

    this.layer = new ItemsLayer({
      W: this.W, H: this.H,
      onChange: items => this.onItemsChanged(items),
      onEditText: item => this.editText(item),
    });

    this.build(root);
    this.onKey = this.onKey.bind(this);
    this.onPageHide = () => this.flush();
    document.addEventListener('keydown', this.onKey);
    window.addEventListener('pagehide', this.onPageHide);
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this.stage);
  }

  // ---------- building the screen ----------

  build(root) {
    const W = this.W, H = this.H;
    this.paperCanvas = h('canvas.page-bg', { width: W, height: H });
    this.drawCanvas = h('canvas.draw', { width: W, height: H });
    this.overlay = h('canvas.overlay', { width: W, height: H });
    this.paperCtx = this.paperCanvas.getContext('2d');
    this.drawCtx = this.drawCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCtx = this.overlay.getContext('2d');
    this.overlay.style.setProperty('--grain-url', `url(${grainCanvas().toDataURL()})`);
    this.grainSize = grainCanvas().width;
    this.cursorRing = h('div.cursor-ring');
    this.pageWrap = h('div.page-wrap.tool-brush', {
      onpointerdown: e => this.onDown(e),
      onpointermove: e => this.onMove(e),
      onpointerup: e => this.onUp(e),
      onpointercancel: e => this.onUp(e),
      onpointerleave: () => this.cursorRing.classList.remove('show'),
      oncontextmenu: e => e.preventDefault(),
    }, this.paperCanvas, this.drawCanvas, this.overlay, this.layer.el, this.cursorRing);
    this.titleHint = h('button.title-hint', { onclick: () => this.addText() }, '✨ Tap here to write the title');
    this.stage = h('main.stage', {}, this.pageWrap, this.titleHint);

    // Top bar
    this.prevBtn = h('button.btn-icon', { onclick: () => this.goTo(this.index - 1), 'aria-label': 'Previous page' }, '◀');
    this.nextBtn = h('button.btn-icon', { onclick: () => this.goTo(this.index + 1), 'aria-label': 'Next page' }, '▶');
    this.pageName = h('div.page-name');
    this.saveStatus = h('div.save-status');
    this.undoBtn = h('button.btn-tool.btn-undo', { onclick: () => this.undo() }, h('span.ico', {}, '↩️'), h('span.lbl', {}, 'Undo'));
    this.redoBtn = h('button.btn-tool.btn-undo', { onclick: () => this.redo() }, h('span.ico', {}, '↪️'), h('span.lbl', {}, 'Redo'));
    const addBtn = (cls, icon, label, onclick) =>
      h('button.btn-add.' + cls, { onclick, title: label }, h('span.ico', {}, icon), h('span.lbl', {}, label));
    const topbar = h('header.topbar', {},
      h('button.btn-home', { onclick: () => this.goHome(), 'aria-label': 'Back to bookshelf' }, '🏠'),
      h('div.page-nav', {}, this.prevBtn, this.pageName, this.nextBtn),
      h('div.add-buttons', {},
        addBtn('add-text', '🔤', 'Words', () => this.addText()),
        addBtn('add-sticker', '🦸', 'Stickers', () => this.addSticker()),
        addBtn('add-picture', '🖼️', 'Picture', () => this.addPicture()),
        hasCamera() ? addBtn('add-camera', '📷', 'Camera', () => this.addCameraShot()) : null,
      ),
      h('div.spacer'),
      this.saveStatus,
      this.undoBtn, this.redoBtn,
      addBtn('add-read', '📖', 'Read', () => this.read()),
    );

    // Tools
    this.toolButtons = {};
    const toolGrid = h('div.tool-grid', {}, Object.entries(TOOLS).map(([key, t]) => {
      const b = h('button.btn-tool', { onclick: () => this.setTool(key), title: t.label },
        h('span.ico', {}, t.icon), h('span.lbl', {}, t.label));
      this.toolButtons[key] = b;
      return b;
    }));
    this.sizeButtons = SIZES.map((s, i) => h('button.size-btn', {
      onclick: () => this.setSize(i), 'aria-label': ['Thin', 'Medium', 'Thick'][i],
    }, h('span.size-dot', { style: { '--d': [8, 16, 28][i] + 'px' } })));
    const tools = h('aside.tools', {},
      toolGrid,
      h('div.size-row', {}, this.sizeButtons),
      h('div.tool-grid', {},
        h('button.btn-tool', { onclick: () => this.choosePaper(), title: 'Choose the paper' },
          h('span.ico', {}, '📄'), h('span.lbl', {}, 'Paper')),
        h('button.btn-tool', { onclick: () => this.startOver(), title: 'Start this page over' },
          h('span.ico', {}, '🧹'), h('span.lbl', {}, 'Start over')),
      ),
    );

    // Palette
    this.swatches = PALETTE.map(c => h('button.swatch-btn', {
      style: { '--c': c }, onclick: () => this.setColor(c), 'aria-label': 'Color ' + c,
    }));
    this.customInput = h('input', {
      type: 'color', value: '#ff00aa', class: 'custom-color-input',
      oninput: e => this.setColor(e.target.value),
    });
    this.customBtn = h('label.swatch-btn.custom', { title: 'More colors' }, this.customInput);
    this.currentColor = h('div.current-color');
    const palette = h('aside.palette', {},
      this.currentColor,
      h('div.swatch-grid', {}, this.swatches, this.customBtn),
    );

    this.strip = h('footer.strip');

    this.el = h('div.editor', {}, topbar, tools, this.stage, palette, this.strip);
    root.append(this.el);
    this.setTool('brush');
    this.setColor(this.color);
    this.setSize(this.sizeIndex);
    this.updateUndoButtons();
  }

  fit() {
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = 20;
    const s = Math.max(0.05, Math.min((r.width - pad * 2) / this.W, (r.height - pad * 2) / this.H));
    this.scale = s;
    this.pageWrap.style.width = Math.floor(this.W * s) + 'px';
    this.pageWrap.style.height = Math.floor(this.H * s) + 'px';
    this.layer.setScale(Math.floor(this.W * s) / this.W);
    this.overlay.style.setProperty('--grain-size', (this.grainSize * this.pageWrap.offsetWidth / this.W) + 'px');
    this.updateCursorSize();
  }

  // ---------- choosing tools ----------

  setTool(key) {
    this.tool = key;
    if (key !== 'eraser') this.lastDrawTool = key;
    for (const [k, b] of Object.entries(this.toolButtons)) b.classList.toggle('active', k === key);
    this.pageWrap.className = 'page-wrap tool-' + key;
    this.sizeButtons.forEach(b => b.disabled = key === 'fill');
    this.updateCursorSize();
  }

  setColor(c) {
    this.color = c;
    this.swatches.forEach(s => s.classList.toggle('active', s.style.getPropertyValue('--c') === c));
    const custom = !PALETTE.includes(c);
    this.customBtn.classList.toggle('active', custom);
    if (custom) this.customBtn.style.setProperty('--c', c);
    this.currentColor.style.background = c;
    this.el.style.setProperty('--current', c);
    // With words picked, a color changes the words.
    const sel = this.layer.selected;
    if (sel && sel.type === 'text') { if (sel.color !== c) this.layer.updateSelected({ color: c }); return; }
    // Picking a color while erasing means he wants to draw again.
    if (this.tool === 'eraser') this.setTool(this.lastDrawTool || 'brush');
  }

  setSize(i) {
    this.sizeIndex = i;
    this.sizeButtons.forEach((b, j) => b.classList.toggle('active', j === i));
    this.updateCursorSize();
  }

  updateCursorSize() {
    const t = TOOLS[this.tool];
    if (!t.widthScale || !this.scale) return;
    const d = Math.max(6, SIZES[this.sizeIndex] * t.widthScale * this.scale);
    this.cursorRing.style.width = this.cursorRing.style.height = d + 'px';
  }

  // ---------- drawing ----------

  toPage(e) {
    const r = this.drawCanvas.getBoundingClientRect();
    return [(e.clientX - r.left) * this.W / r.width, (e.clientY - r.top) * this.H / r.height];
  }

  onDown(e) {
    if (this.stroke || !e.isPrimary || !this.history) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    // Tapping the page while something is picked just un-picks it.
    if (this.layer.selectedId) { this.layer.select(null); return; }
    const [x, y] = this.toPage(e);

    if (this.tool === 'fill') {
      if (floodFill(this.drawCtx, x, y, this.color)) {
        this.history.push({ type: 'fill', x, y, color: this.color });
        this.markDirty();
      }
      return;
    }

    const op = makeStroke(this.tool, this.color, this.sizeIndex);
    addPoint(op, x, y);
    this.stroke = op;
    this.strokePointer = e.pointerId;
    if (op.tool === 'eraser') {
      this.liveCtx = this.drawCtx;
      this.drawCtx.save();
      this.drawCtx.globalCompositeOperation = 'destination-out';
    } else {
      this.liveCtx = this.overlayCtx;
      this.overlay.style.opacity = op.tool === 'marker' ? MARKER_ALPHA : 1;
      // Show the crayon's paper texture while drawing; it is baked in on commit.
      this.overlay.classList.toggle('grain', op.tool === 'crayon');
    }
    try { this.pageWrap.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  onMove(e) {
    this.moveCursor(e);
    const op = this.stroke;
    if (!op || e.pointerId !== this.strokePointer) return;
    let events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (!events.length) events = [e];
    for (const ev of events) {
      const [x, y] = this.toPage(ev);
      if (addPoint(op, x, y)) drawSegment(this.liveCtx, op, op.points.length - 1);
    }
  }

  onUp(e) {
    const op = this.stroke;
    if (!op || e.pointerId !== this.strokePointer) return;
    drawStrokeEnd(this.liveCtx, op);
    if (op.tool === 'eraser') {
      this.drawCtx.restore();
    } else {
      commitLayer(this.drawCtx, this.overlay, op.tool);
      this.overlay.classList.remove('grain');
    }
    this.stroke = null;
    this.history.push(op);
    this.markDirty();
  }

  moveCursor(e) {
    const ring = this.cursorRing;
    const overItem = e.target.closest && e.target.closest('.item, .sel-handle');
    if (e.pointerType === 'touch' || overItem || !TOOLS[this.tool].widthScale || this.layer.selectedId) {
      ring.classList.remove('show');
      return;
    }
    const r = this.pageWrap.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    ring.classList.add('show');
  }

  // ---------- paper ----------

  setPaper(color, pattern) {
    this.bg = color;
    this.pattern = pattern;
    drawPaper(this.paperCtx, this.W, this.H, color, pattern);
  }

  async choosePaper() {
    if (!this.history) return;
    const result = await paperDialog({ color: this.bg, pattern: this.pattern, shape: this.book.shape });
    if (!result || (result.color === this.bg && result.pattern === this.pattern)) return;
    this.history.push({ type: 'bg', color: result.color, pattern: result.pattern });
    this.setPaper(result.color, result.pattern);
    this.markDirty();
  }

  async startOver() {
    if (!this.history) return;
    const ok = await confirmDialog({ icon: '🧹', text: 'Wipe this page clean and start over?', yes: 'Start over', no: 'Keep it' });
    if (!ok) return;
    this.drawCtx.clearRect(0, 0, this.W, this.H);
    this.history.push({ type: 'clear' });
    this.layer.select(null);
    this.layer.setItems([]);
    this.markDirty();
  }

  // ---------- words, stickers, pictures ----------

  get pageState() {
    return { bg: this.bg, pattern: this.pattern, items: this.layer.items };
  }

  applyState(state) {
    if (state.bg !== this.bg || state.pattern !== this.pattern) this.setPaper(state.bg, state.pattern);
    if (state.items !== this.layer.items) this.layer.setItems(state.items);
    this.updateTitleHint();
  }

  onItemsChanged(items) {
    if (!this.history) return;
    this.history.push({ type: 'items', after: items });
    this.markDirty();
    this.updateTitleHint();
  }

  coverKind() {
    if (this.index === 0) return 'front';
    if (this.index === this.book.pageIds.length - 1) return 'back';
    return null;
  }

  // Where a new thing goes: near the middle, a bit further each time so
  // several don't land exactly on top of each other.
  nextSpot() {
    const n = [0, 1, 2, -1, -2][this.addCount++ % 5];
    const step = Math.min(this.W, this.H) * 0.05;
    return [this.W / 2 + n * step, this.H / 2 + n * step];
  }

  async addText() {
    if (!this.history) return;
    const cover = this.coverKind();
    const res = await textDialog({ color: this.color, cover, authorName: AUTHOR });
    if (!res) return;
    const fields = await this.textFields(res.text, res.scales, res.font, res.fontSize, this.W * 0.85);
    // A title goes near the top of the front cover.
    const [x, y] = cover === 'front' && !this.layer.items.some(i => i.type === 'text')
      ? [this.W / 2, Math.max(fields.h / 2 + this.H * 0.06, this.H * 0.2)]
      : this.nextSpot();
    this.layer.add({ id: uid(), type: 'text', x, y, rot: 0, color: this.color, ...fields });
  }

  async editText(item) {
    const res = await textDialog({ item, color: item.color, cover: this.coverKind(), authorName: AUTHOR });
    if (!res) return;
    const current = this.layer.items.find(i => i.id === item.id);
    if (!current) return;
    // Without a new size picked, keep the size it was turned and stretched to.
    const fontSize = res.fontSize || current.fontSize;
    const maxWidth = res.fontSize ? this.W * 0.85 : Math.max(this.W * 0.85, current.w);
    const fields = await this.textFields(res.text, res.scales, res.font, fontSize, maxWidth);
    const { lines, ...rest } = current; // drop the old-style layout
    this.layer.replace({ ...rest, ...fields });
  }

  // Lays out words (each letter may have its own size) for a text item.
  async textFields(text, scales, font, fontSize, maxWidth) {
    await ensureFont(font, text);
    const layout = layoutRichText(text, scales, font, maxWidth / fontSize);
    return { text, scales, font, fontSize, layout, w: layout.w * fontSize, h: layout.h * fontSize };
  }

  async addSticker() {
    if (!this.history) return;
    const sticker = await stickerDialog();
    if (!sticker) return;
    const [x, y] = this.nextSpot();
    this.layer.add({ id: uid(), type: 'sticker', sticker, x, y, rot: 0, size: Math.round(Math.min(this.W, this.H) * 0.42) });
  }

  async addPicture() {
    if (!this.history) return;
    const file = await pickPictureFile();
    if (!file) return;
    try {
      await this.placePhoto(await shrinkPicture(file));
    } catch (err) {
      console.error(err);
      messageDialog('🖼️', "That picture couldn't be opened. Try a different one.");
    }
  }

  async addCameraShot() {
    if (!this.history) return;
    const shot = await cameraDialog();
    if (shot) await this.placePhoto(await shrinkPicture(shot));
  }

  // Adds a photo with a white border, fitted to most of the page.
  async placePhoto({ blob, width, height }) {
    const fit = Math.min((this.W * 0.6) / width, (this.H * 0.6) / height);
    const wi = width * fit, hi = height * fit;
    // Border chosen so that photoBorder() of the final size matches it.
    const b = 0.045 * Math.min(wi, hi) / (1 - 0.09);
    const [x, y] = this.nextSpot();
    this.layer.add({
      id: uid(), type: 'photo', blob, x, y, rot: 0,
      w: Math.round(wi + 2 * b), h: Math.round(hi + 2 * b),
    });
  }

  updateTitleHint() {
    const show = this.index === 0 && !this.layer.items.some(i => i.type === 'text');
    this.titleHint.classList.toggle('show', show);
  }

  // ---------- undo ----------

  undo() {
    if (this.stroke || !this.history) return;
    const state = this.history.undo(this.drawCtx);
    if (state) { this.applyState(state); this.markDirty(); }
  }

  redo() {
    if (this.stroke || !this.history) return;
    const state = this.history.redo(this.drawCtx, this.pageState);
    if (state) { this.applyState(state); this.markDirty(); }
  }

  updateUndoButtons() {
    this.undoBtn.disabled = !this.history || !this.history.canUndo;
    this.redoBtn.disabled = !this.history || !this.history.canRedo;
  }

  onKey(e) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (document.querySelector('#dialog-root .backdrop')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
    else if (!mod && (e.key === 'Delete' || e.key === 'Backspace') && this.layer.selectedId) {
      e.preventDefault(); this.layer.removeSelected();
    }
    else if (e.key === 'Escape' && this.layer.selectedId) this.layer.select(null);
    else if (!mod && e.key === 'ArrowLeft') this.goTo(this.index - 1);
    else if (!mod && e.key === 'ArrowRight') this.goTo(this.index + 1);
  }

  // ---------- pages ----------

  async goTo(i) {
    if (i < 0 || i >= this.book.pageIds.length || this.stroke) return;
    const token = ++this.loadToken;
    await this.flush();
    if (token !== this.loadToken) return;
    const page = this.pages.get(this.book.pageIds[i]);
    let bitmap = null;
    if (page.drawing) {
      try { bitmap = await createImageBitmap(page.drawing); } catch (err) { console.error(err); }
    }
    if (token !== this.loadToken) { bitmap?.close?.(); return; }

    const forward = i > this.index;
    this.index = i;
    this.page = page;
    this.drawCtx.clearRect(0, 0, this.W, this.H);
    if (bitmap) { this.drawCtx.drawImage(bitmap, 0, 0, this.W, this.H); bitmap.close?.(); }
    this.setPaper(page.bg, page.bgPattern || 'none');
    this.layer.select(null);
    this.layer.setItems(page.items || []);
    this.addCount = 0;
    this.history = new History(this.drawCanvas, this.pageState);
    this.updateUndoButtons();
    this.updateChrome();
    this.updateTitleHint();
    this.renderStrip();
    this.pageWrap.classList.remove('enter-left', 'enter-right');
    void this.pageWrap.offsetWidth; // restart the animation
    this.pageWrap.classList.add(forward ? 'enter-right' : 'enter-left');
    history.replaceState(null, '', `#/book/${this.book.id}/edit/${i}`);
  }

  updateChrome() {
    const n = this.book.pageIds.length;
    const i = this.index;
    this.pageName.textContent = isCover(this.book, i)
      ? pageLabel(this.book, i)
      : `Page ${i} of ${insidePageCount(this.book)}`;
    this.prevBtn.disabled = i <= 0;
    this.nextBtn.disabled = i >= n - 1;
  }

  thumbUrl(page) {
    if (!page.thumb) return null;
    let entry = this.thumbUrls.get(page.id);
    if (!entry || entry.blob !== page.thumb) {
      if (entry) URL.revokeObjectURL(entry.url);
      entry = { blob: page.thumb, url: URL.createObjectURL(page.thumb) };
      this.thumbUrls.set(page.id, entry);
    }
    return entry.url;
  }

  renderStrip() {
    const book = this.book;
    const n = book.pageIds.length;
    const items = book.pageIds.map((id, i) => {
      const page = this.pages.get(id);
      const url = this.thumbUrl(page);
      const cover = isCover(book, i);
      const current = i === this.index;
      const canDelete = current && !cover && insidePageCount(book) > MIN_INSIDE_PAGES;
      return h('button.thumb' + (cover ? '.cover' : '') + (current ? '.current' : ''), {
        'data-i': i,
        onclick: () => { if (this.justDragged) { this.justDragged = false; return; } this.goTo(i); },
        onpointerdown: e => this.onThumbDown(e, i),
      },
        h('div.thumb-page', { style: { aspectRatio: `${this.W} / ${this.H}`, background: page.bg } },
          url ? h('img', { src: url, alt: '', draggable: false }) : null),
        h('span.thumb-label', {}, shortPageLabel(book, i)),
        canDelete ? h('span.thumb-delete', {
          role: 'button', 'aria-label': 'Remove this page', title: 'Remove this page',
          onclick: e => { e.stopPropagation(); this.removeCurrentPage(); },
          onpointerdown: e => e.stopPropagation(),
        }, '✖') : null,
      );
    });
    if (insidePageCount(book) < MAX_INSIDE_PAGES) {
      const add = h('button.thumb.add-page', { onclick: () => this.addPage(), title: 'Add a page' },
        h('div.thumb-page', { style: { aspectRatio: `${this.W} / ${this.H}` } }, '+'),
        h('span.thumb-label', {}, 'Add'));
      items.splice(n - 1, 0, add);
    }
    this.strip.replaceChildren(...items);
    const cur = this.strip.querySelector('.thumb.current');
    cur?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  async addPage() {
    if (insidePageCount(this.book) >= MAX_INSIDE_PAGES) return;
    await this.flush();
    const page = makePage(this.book.id);
    const at = this.book.pageIds.length - 1;
    this.book.pageIds.splice(at, 0, page.id);
    this.pages.set(page.id, page);
    this.book.updated = Date.now();
    await db.putBookAndPages(this.book, [page]);
    await this.goTo(at);
  }

  async removeCurrentPage() {
    const i = this.index;
    if (isCover(this.book, i) || insidePageCount(this.book) <= MIN_INSIDE_PAGES) return;
    const ok = await confirmDialog({
      icon: '🗑️', text: `Throw away page ${i}?`, yes: 'Throw it away', no: 'Keep it', danger: true,
    });
    if (!ok) return;
    await this.flush();
    clearTimeout(this.saveTimer);
    this.dirty = false;
    const id = this.book.pageIds[i];
    this.book.pageIds.splice(i, 1);
    this.pages.delete(id);
    const entry = this.thumbUrls.get(id);
    if (entry) { URL.revokeObjectURL(entry.url); this.thumbUrls.delete(id); }
    this.book.updated = Date.now();
    await db.putBook(this.book);
    await db.deletePage(id);
    this.index = -1; // so goTo animates and reloads
    await this.goTo(Math.min(i, this.book.pageIds.length - 2));
  }

  // Dragging inside pages in the strip to reorder them (mouse or trackpad).
  onThumbDown(e, i) {
    if (isCover(this.book, i) || e.pointerType === 'touch' || e.button !== 0) return;
    const thumb = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    let ghost = null;
    let dropAt = null;

    // Everything after the front cover: inside pages, the + tile, the back cover.
    const targets = () => [...this.strip.querySelectorAll('.thumb')].filter(t => t.dataset.i !== '0');

    const move = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10) return;
        ghost = thumb.cloneNode(true);
        ghost.classList.add('drag-ghost');
        document.body.append(ghost);
        thumb.classList.add('dragging');
      }
      ghost.style.transform = `translate(${ev.clientX - 30}px, ${ev.clientY - 50}px) rotate(-6deg)`;
      // Insert before the first page whose middle is to the right of the pointer.
      this.strip.querySelectorAll('.drop-before').forEach(t => t.classList.remove('drop-before'));
      dropAt = null;
      for (const t of targets()) {
        const r = t.getBoundingClientRect();
        if (ev.clientX < r.left + r.width / 2) {
          dropAt = t.classList.contains('add-page') ? this.book.pageIds.length - 1 : Number(t.dataset.i);
          t.classList.add('drop-before');
          break;
        }
      }
      if (dropAt === null) dropAt = this.book.pageIds.length - 1;
      // Auto-scroll near the strip's edges.
      const sr = this.strip.getBoundingClientRect();
      if (ev.clientX < sr.left + 40) this.strip.scrollLeft -= 12;
      else if (ev.clientX > sr.right - 40) this.strip.scrollLeft += 12;
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) return;
      ghost.remove();
      this.justDragged = true;
      setTimeout(() => { this.justDragged = false; }, 0);
      this.movePage(i, Math.max(1, dropAt));
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  async movePage(from, insertBefore) {
    const ids = this.book.pageIds;
    let to = insertBefore > from ? insertBefore - 1 : insertBefore;
    to = Math.max(1, Math.min(ids.length - 2, to));
    if (to === from) { this.renderStrip(); return; }
    const currentId = ids[this.index];
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    this.index = ids.indexOf(currentId);
    this.book.updated = Date.now();
    await db.putBook(this.book);
    history.replaceState(null, '', `#/book/${this.book.id}/edit/${this.index}`);
    this.updateChrome();
    this.renderStrip();
  }

  // ---------- saving ----------

  markDirty() {
    this.dirty = true;
    this.updateUndoButtons();
    this.saveStatus.textContent = '';
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 1000);
  }

  // A small picture of the paper and drawing (items are added after).
  compositeBase(maxDim) {
    const s = maxDim / Math.max(this.W, this.H);
    const c = document.createElement('canvas');
    c.width = Math.round(this.W * s);
    c.height = Math.round(this.H * s);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.paperCanvas, 0, 0, c.width, c.height);
    ctx.drawImage(this.drawCanvas, 0, 0, c.width, c.height);
    return c;
  }

  save() {
    clearTimeout(this.saveTimer);
    if (!this.dirty || !this.page) return this.saveChain;
    this.dirty = false;
    const { page, book, bg, pattern } = this;
    const items = this.layer.items;
    const isFront = this.index === 0;
    // Take the pictures now, before anything else is drawn.
    const drawingP = toBlob(this.drawCanvas, 'image/png');
    const thumbC = this.compositeBase(240);
    const coverC = isFront ? this.compositeBase(480) : null;
    this.saveStatus.textContent = 'Saving…';

    this.saveChain = this.saveChain.then(async () => {
      try {
        await renderItems(thumbC.getContext('2d'), items, thumbC.width / this.W);
        if (coverC) await renderItems(coverC.getContext('2d'), items, coverC.width / this.W);
        const [drawing, thumb, coverThumb] = await Promise.all([
          drawingP,
          toBlob(thumbC, 'image/jpeg', 0.85),
          coverC ? toBlob(coverC, 'image/jpeg', 0.88) : null,
        ]);
        Object.assign(page, { drawing, bg, bgPattern: pattern, items, thumb });
        if (isFront) {
          book.coverThumb = coverThumb;
          book.coverColor = bg;
          const title = items.find(i => i.type === 'text');
          book.title = title ? title.text.split('\n')[0] : '';
        }
        book.updated = Date.now();
        // A page removed while saving is not written back.
        if (!book.pageIds.includes(page.id)) return;
        await db.putBookAndPages(book, [page]);
        if (!this.dirty) this.saveStatus.textContent = 'Saved ✓';
        this.refreshThumb(page);
      } catch (err) {
        console.error(err);
        this.dirty = true;
        this.saveStatus.textContent = '⚠️ Not saved';
      }
    });
    return this.saveChain;
  }

  refreshThumb(page) {
    const i = this.book.pageIds.indexOf(page.id);
    const el = this.strip.querySelector(`.thumb[data-i="${i}"] .thumb-page`);
    if (!el) return;
    el.style.background = page.bg;
    const url = this.thumbUrl(page);
    let img = el.querySelector('img');
    if (!img) { img = h('img', { alt: '', draggable: false }); el.append(img); }
    img.src = url;
  }

  flush() {
    return this.save();
  }

  async goHome() {
    await this.flush();
    location.hash = '#/';
  }

  // Opens the book in the reader at the page being worked on.
  async read() {
    await this.flush();
    const p = readerPositionForPage(this.book.pageIds.length, this.index);
    location.hash = `#/book/${this.book.id}/read/${p}`;
  }

  async destroy() {
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pagehide', this.onPageHide);
    this.resizeObserver.disconnect();
    await this.flush();
    for (const { url } of this.thumbUrls.values()) URL.revokeObjectURL(url);
    this.layer.destroy();
  }
}
