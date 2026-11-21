// The page editor: draw on one page at a time, with a strip of all pages.

import * as db from './db.js';
import {
  SHAPES, pageLabel, shortPageLabel, isCover, insidePageCount, makePage,
  MAX_INSIDE_PAGES, MIN_INSIDE_PAGES,
} from './model.js';
import {
  TOOLS, SIZES, MARKER_ALPHA, makeStroke, addPoint, drawSegment, drawStrokeEnd,
  floodFill, History, commitLayer, grainCanvas,
} from './draw.js';
import { h, confirmDialog } from './ui.js';

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
    pages.set(id, records[i] || { ...makePage(book.id, bg), id });
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
    this.history = null;
    this.stroke = null;
    this.dirty = false;
    this.saveTimer = 0;
    this.saveChain = Promise.resolve();
    this.thumbUrls = new Map();
    this.loadToken = 0;

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
    this.drawCanvas = h('canvas.draw', { width: W, height: H });
    this.overlay = h('canvas.overlay', { width: W, height: H });
    this.drawCtx = this.drawCanvas.getContext('2d', { willReadFrequently: true });
    this.overlayCtx = this.overlay.getContext('2d');
    this.overlay.style.setProperty('--grain-url', `url(${grainCanvas().toDataURL()})`);
    this.grainSize = grainCanvas().width;
    this.pageBg = h('div.page-bg');
    this.cursorRing = h('div.cursor-ring');
    this.pageWrap = h('div.page-wrap.tool-brush', {
      onpointerdown: e => this.onDown(e),
      onpointermove: e => this.onMove(e),
      onpointerup: e => this.onUp(e),
      onpointercancel: e => this.onUp(e),
      onpointerleave: () => this.cursorRing.classList.remove('show'),
      oncontextmenu: e => e.preventDefault(),
    }, this.pageBg, this.drawCanvas, this.overlay, this.cursorRing);
    this.stage = h('main.stage', {}, this.pageWrap);

    // Top bar
    this.prevBtn = h('button.btn-icon', { onclick: () => this.goTo(this.index - 1), 'aria-label': 'Previous page' }, '◀');
    this.nextBtn = h('button.btn-icon', { onclick: () => this.goTo(this.index + 1), 'aria-label': 'Next page' }, '▶');
    this.pageName = h('div.page-name');
    this.saveStatus = h('div.save-status');
    this.undoBtn = h('button.btn-tool.btn-undo', { onclick: () => this.undo() }, h('span.ico', {}, '↩️'), h('span.lbl', {}, 'Undo'));
    this.redoBtn = h('button.btn-tool.btn-undo', { onclick: () => this.redo() }, h('span.ico', {}, '↪️'), h('span.lbl', {}, 'Redo'));
    const topbar = h('header.topbar', {},
      h('button.btn-home', { onclick: () => this.goHome(), 'aria-label': 'Back to bookshelf' }, '🏠'),
      h('div.page-nav', {}, this.prevBtn, this.pageName, this.nextBtn),
      h('div.spacer'),
      this.saveStatus,
      this.undoBtn, this.redoBtn,
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
    this.paperBtn = h('button.btn-tool', { onclick: () => this.setPaper(), title: 'Color the paper' },
      h('span.paper-ico'), h('span.lbl', {}, 'Paper'));
    const tools = h('aside.tools', {},
      toolGrid,
      h('div.size-row', {}, this.sizeButtons),
      h('div.tool-grid', {},
        this.paperBtn,
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
    if (e.pointerType === 'touch' || !TOOLS[this.tool].widthScale) { ring.classList.remove('show'); return; }
    const r = this.pageWrap.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) translate(-50%, -50%)`;
    ring.classList.add('show');
  }

  setBg(color) {
    this.bg = color;
    this.pageBg.style.background = color;
  }

  setPaper() {
    if (!this.history || this.color === this.bg) return;
    this.history.push({ type: 'bg', color: this.color });
    this.setBg(this.color);
    this.markDirty();
  }

  async startOver() {
    if (!this.history) return;
    const ok = await confirmDialog({ icon: '🧹', text: 'Wipe this page clean and start over?', yes: 'Start over', no: 'Keep it' });
    if (!ok) return;
    this.drawCtx.clearRect(0, 0, this.W, this.H);
    this.history.push({ type: 'clear' });
    this.markDirty();
  }

  undo() {
    if (this.stroke || !this.history) return;
    const bg = this.history.undo(this.drawCtx);
    if (bg !== null) { this.setBg(bg); this.markDirty(); }
  }

  redo() {
    if (this.stroke || !this.history) return;
    const bg = this.history.redo(this.drawCtx, this.bg);
    if (bg !== null) { this.setBg(bg); this.markDirty(); }
  }

  updateUndoButtons() {
    this.undoBtn.disabled = !this.history || !this.history.canUndo;
    this.redoBtn.disabled = !this.history || !this.history.canRedo;
  }

  onKey(e) {
    if (e.target instanceof HTMLInputElement) return;
    if (document.querySelector('#dialog-root .backdrop')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); }
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
    this.setBg(page.bg);
    this.history = new History(this.drawCanvas, page.bg);
    this.updateUndoButtons();
    this.updateChrome();
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
      const thumb = h('button.thumb' + (cover ? '.cover' : '') + (current ? '.current' : ''), {
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
      return thumb;
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

  // A small picture of the page: paper color plus drawing.
  composite(maxDim) {
    const s = maxDim / Math.max(this.W, this.H);
    const c = document.createElement('canvas');
    c.width = Math.round(this.W * s);
    c.height = Math.round(this.H * s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = this.bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.drawCanvas, 0, 0, c.width, c.height);
    return c;
  }

  save() {
    clearTimeout(this.saveTimer);
    if (!this.dirty || !this.page) return this.saveChain;
    this.dirty = false;
    const { page, book, bg } = this;
    const isFront = this.index === 0;
    // Take the pictures now, before anything else is drawn.
    const drawingP = toBlob(this.drawCanvas, 'image/png');
    const thumbC = this.composite(240);
    const coverC = isFront ? this.composite(480) : null;
    this.saveStatus.textContent = 'Saving…';

    this.saveChain = this.saveChain.then(async () => {
      try {
        const [drawing, thumb, coverThumb] = await Promise.all([
          drawingP,
          toBlob(thumbC, 'image/jpeg', 0.85),
          coverC ? toBlob(coverC, 'image/jpeg', 0.88) : null,
        ]);
        page.drawing = drawing;
        page.bg = bg;
        page.thumb = thumb;
        if (isFront) { book.coverThumb = coverThumb; book.coverColor = bg; }
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

  async destroy() {
    document.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pagehide', this.onPageHide);
    this.resizeObserver.disconnect();
    await this.flush();
    for (const { url } of this.thumbUrls.values()) URL.revokeObjectURL(url);
  }
}
