// Reading a book: a 3D book lying on the table. Tap or swipe to turn the
// pages. The stacks of page edges on each side get thicker or thinner as
// pages are turned, and the whole book is as thick as its page count.
//
// A book is a pile of "leaves" (sheets): the front cover, the inside
// pages two to a leaf, and the back cover. p is how many leaves have been
// turned over to the left.

import * as db from './db.js';
import { SHAPES, isCover, thicknessPx } from './model.js';
import { renderPageCanvas } from './render.js';
import { pageTurnSound } from './sound.js';
import { h } from './ui.js';

const TILT = 36;         // degrees the book leans back, as if lying on a table
const TURN_MS = 800;
const BLANK = '#fffdf8';  // the insides of the covers

const toBlob = (canvas, type, quality) => new Promise(r => canvas.toBlob(r, type, quality));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Builds the leaves: [front face, back face] as page indexes, null = blank.
function makeLeaves(pageCount) {
  const inside = pageCount - 2;
  const leaves = [[0, null]];
  for (let k = 1; k <= inside; k += 2) leaves.push([k, k + 1 <= inside ? k + 1 : null]);
  leaves.push([null, pageCount - 1]);
  return leaves;
}

// The reading position that shows a given page.
export function readerPositionForPage(pageCount, index) {
  const leaves = makeLeaves(pageCount).length;
  if (index <= 0) return 0;
  if (index >= pageCount - 1) return leaves;
  return index % 2 === 1 ? (index + 1) / 2 : index / 2 + 1;
}

export async function openReader(root, bookId, start) {
  const book = await db.getBook(bookId);
  if (!book) { location.hash = '#/'; return { destroy() {} }; }
  const records = await db.getPages(book.pageIds);
  const pages = records.map((p, i) => p || { bg: isCover(book, i) ? book.coverColor : '#ffffff', items: [] });
  return new Reader(root, book, pages, start);
}

class Reader {
  constructor(root, book, pages, start) {
    this.book = book;
    this.pages = pages;
    this.leaves = makeLeaves(pages.length);
    this.N = this.leaves.length;
    this.p = clamp(start | 0, 0, this.N);
    this.urls = [];
    this.busy = false;
    this.destroyed = false;

    this.build(root);
    this.onKey = this.onKey.bind(this);
    document.addEventListener('keydown', this.onKey);
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.stage);
    this.layout();
    this.renderPictures();
  }

  // ---------- building ----------

  build(root) {
    const title = this.book.title || 'My book';
    this.label = h('div.reader-label');
    this.prevBtn = h('button.turn-btn.prev', { onclick: () => this.turn(-1), 'aria-label': 'Turn back' }, '◀');
    this.nextBtn = h('button.turn-btn.next', { onclick: () => this.turn(1), 'aria-label': 'Turn the page' }, '▶');

    this.leafEls = this.leaves.map((faces, i) => {
      const cover = i === 0 || i === this.N - 1;
      const face = (pageIndex, side) => {
        const bg = pageIndex === null ? BLANK : this.pages[pageIndex].bg;
        return h(`div.face.${side}`, { style: { background: bg } }, h('div.face-shade'));
      };
      return h('div.leaf' + (cover ? '.cover' : ''), {}, face(faces[0], 'front'), face(faces[1], 'back'));
    });
    this.edgeLeft = h('div.edge.left');
    this.edgeRight = h('div.edge.right');
    this.shadow = h('div.table-shadow');
    this.bookEl = h('div.reader-book', {}, this.shadow, this.edgeLeft, this.edgeRight, ...this.leafEls);
    this.scene = h('div.book-scene', {}, this.bookEl);
    this.stage = h('main.reader-stage', {
      onpointerdown: e => this.onDown(e),
      onpointermove: e => this.onMove(e),
      onpointerup: e => this.onUp(e),
      onpointercancel: e => this.onUp(e),
    }, this.prevBtn, this.scene, this.nextBtn);

    this.el = h('div.reader', {},
      h('header.reader-top', {},
        h('button.btn-home', { onclick: () => { location.hash = '#/'; }, 'aria-label': 'Back to bookshelf' }, '🏠'),
        h('div.reader-title', {}, title),
        h('div.spacer'),
        this.label,
        h('button.btn-add.add-text', { onclick: () => this.edit(), title: 'Change this page' },
          h('span.ico', {}, '✏️'), h('span.lbl', {}, 'Change it')),
        h('button.btn-add.add-picture', { onclick: () => { location.hash = `#/book/${this.book.id}/print`; }, title: 'Print this book' },
          h('span.ico', {}, '🖨️'), h('span.lbl', {}, 'Print')),
      ),
      this.stage,
    );
    root.append(this.el);
  }

  // ---------- sizes ----------

  layout() {
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const { w, h: hh } = SHAPES[this.book.shape];
    const ratio = w / hh;
    const aw = r.width - 170;  // room for the arrow buttons
    const ah = r.height - 50;
    const cos = Math.cos(TILT * Math.PI / 180);
    // A thick book stands taller on the table, so leave room for it.
    const insideCount = this.pages.length - 2;
    const thickPerPh = thicknessPx(insideCount, (Math.min(1, ratio) / 180) * 1.6);
    const ph = Math.max(100, Math.min(ah / (cos + 0.3 + 0.6 * thickPerPh), (aw / 2) / ratio));
    const pw = ph * ratio;
    this.pw = pw; this.ph = ph;
    this.bookEl.style.setProperty('--pw', pw + 'px');
    this.bookEl.style.setProperty('--ph', ph + 'px');

    // Same thickness rule as the bookshelf, scaled to the page's shorter
    // side so tall books don't turn into towers.
    const inside = this.pages.length - 2;
    const total = thicknessPx(inside, (Math.min(pw, ph) / 180) * 1.6);
    const tb = Math.max(2, total * 0.12);
    const t = Math.max(0.4, (total - 2 * tb) / Math.max(1, this.N - 2));
    const th = i => (i === 0 || i === this.N - 1 ? tb : t);
    this.zRight = []; this.zLeft = [];
    let sum = 0;
    for (let i = this.N - 1; i >= 0; i--) { sum += th(i); this.zRight[i] = sum; }
    sum = 0;
    for (let i = 0; i < this.N; i++) { sum += th(i); this.zLeft[i] = sum; }
    this.boardThickness = tb;

    // Snap into place without animating, then measure where the tilted
    // book actually lands and move it to the middle of the table.
    this.bookEl.classList.add('no-anim');
    this.dy = 0;
    this.update();
    const parts = [...this.leafEls, this.edgeLeft, this.edgeRight].map(el => el.getBoundingClientRect()).filter(b => b.height);
    if (parts.length) {
      const top = Math.min(...parts.map(b => b.top)), bottom = Math.max(...parts.map(b => b.bottom));
      this.dy = Math.round((r.top + r.height / 2) - (top + bottom) / 2);
      this.update();
    }
    void this.bookEl.offsetWidth;
    this.bookEl.classList.remove('no-anim');
    this.renderSize = this.renderSize || Math.round(Math.max(pw, ph) * (window.devicePixelRatio || 1));
  }

  leafTransform(i, turned) {
    const z = turned ? this.zLeft[i] : this.zRight[i];
    return `translateZ(${z.toFixed(2)}px) rotateY(${turned ? -180 : 0}deg)`;
  }

  update() {
    const { p, N, pw } = this;
    this.leafEls.forEach((el, i) => { el.style.transform = this.leafTransform(i, i < p); });

    // Page edges: the bottom strip is the cover board.
    const rightH = p < N ? this.zRight[p] : 0;
    const leftH = p > 0 ? this.zLeft[p - 1] : 0;
    const back = this.pages[this.pages.length - 1].bg, front = this.pages[0].bg;
    this.edgeRight.style.height = rightH + 'px';
    this.edgeLeft.style.height = leftH + 'px';
    this.edgeRight.style.setProperty('--board', back);
    this.edgeLeft.style.setProperty('--board', front);
    this.edgeRight.style.setProperty('--tb', this.boardThickness + 'px');
    this.edgeLeft.style.setProperty('--tb', this.boardThickness + 'px');

    // Closed books sit in the middle of the table.
    const shift = p === 0 ? -pw / 2 : p === N ? pw / 2 : 0;
    this.bookEl.style.transform = `translate(${shift}px, ${this.dy || 0}px) rotateX(${TILT}deg)`;
    this.shadow.style.left = (p === 0 ? pw : 0) + 'px';
    this.shadow.style.width = (p === 0 || p === N ? pw : 2 * pw) + 'px';

    this.prevBtn.disabled = p === 0;
    this.nextBtn.disabled = p === N;
    this.label.textContent = this.labelText();
    history.replaceState(null, '', `#/book/${this.book.id}/read/${p}`);
  }

  labelText() {
    const { p, N } = this;
    if (p === 0) return 'Front cover';
    if (p === N) return 'The end!';
    const left = this.leaves[p - 1][1], right = this.leaves[p][0];
    const nums = [left, right].filter(x => x !== null);
    if (!nums.length) return '';
    return nums.length === 2 ? `Pages ${nums[0]} and ${nums[1]}` : `Page ${nums[0]}`;
  }

  // ---------- turning ----------

  turn(dir) {
    if (this.busy || this.drag) return;
    const next = this.p + dir;
    if (next < 0 || next > this.N) return;
    const leaf = this.leafEls[dir > 0 ? this.p : this.p - 1];
    this.p = next;
    this.animateLeaf(leaf);
    this.update();
    pageTurnSound();
    this.busy = true;
    setTimeout(() => { this.busy = false; }, TURN_MS * 0.55);
  }

  animateLeaf(leaf) {
    leaf.classList.remove('turning');
    void leaf.offsetWidth;
    leaf.classList.add('turning');
    clearTimeout(leaf._t);
    leaf._t = setTimeout(() => leaf.classList.remove('turning'), TURN_MS);
  }

  directionAt(x) {
    if (this.p === 0) return 1;
    if (this.p === this.N) return -1;
    const r = this.stage.getBoundingClientRect();
    return x > r.left + r.width / 2 ? 1 : -1;
  }

  onDown(e) {
    if (e.target.closest('button') || this.busy) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const dir = this.directionAt(e.clientX);
    const leafIndex = dir > 0 ? this.p : this.p - 1;
    if (leafIndex < 0 || leafIndex >= this.N) return;
    this.press = { x: e.clientX, dir, leafIndex, id: e.pointerId, t: performance.now() };
    try { this.stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  onMove(e) {
    const press = this.press;
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.x;
    if (!this.drag) {
      // Only start dragging when moving the way the page turns.
      if (Math.abs(dx) < 8 || Math.sign(dx) === press.dir) return;
      this.drag = { leaf: this.leafEls[press.leafIndex], prog: 0 };
      this.drag.leaf.classList.add('dragging');
    }
    const prog = clamp((-dx * press.dir) / (this.pw * 1.3), 0, 1);
    this.drag.prog = prog;
    const i = press.leafIndex;
    const turned = press.dir > 0 ? prog : 1 - prog;   // 0 = lying right, 1 = lying left
    const z = this.zRight[i] + (this.zLeft[i] - this.zRight[i]) * turned;
    this.drag.leaf.style.transform = `translateZ(${z.toFixed(2)}px) rotateY(${(-180 * turned).toFixed(1)}deg)`;
    this.drag.leaf.style.setProperty('--shade', (Math.sin(turned * Math.PI) * 0.18).toFixed(3));
  }

  onUp(e) {
    const press = this.press;
    if (!press || e.pointerId !== press.id) return;
    this.press = null;
    if (!this.drag) { this.turn(press.dir); return; }
    const { leaf, prog } = this.drag;
    this.drag = null;
    leaf.classList.remove('dragging');
    leaf.style.removeProperty('--shade');
    const quick = performance.now() - press.t < 300 && prog > 0.08;
    if (prog > 0.3 || quick) {
      this.p += press.dir;
      pageTurnSound();
    }
    this.update();
  }

  onKey(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); this.turn(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); this.turn(-1); }
    else if (e.key === 'Home') { this.p = 0; this.update(); }
  }

  // ---------- pictures of the pages ----------

  async renderPictures() {
    // Pages nearest the open spot first.
    const jobs = [];
    this.leaves.forEach((faces, i) => faces.forEach((pageIndex, side) => {
      if (pageIndex !== null) jobs.push({ i, side, pageIndex });
    }));
    jobs.sort((a, b) => Math.abs(a.i - this.p + 0.5) - Math.abs(b.i - this.p + 0.5));
    for (const job of jobs) {
      if (this.destroyed) return;
      try {
        const canvas = await renderPageCanvas(this.pages[job.pageIndex], this.book.shape, this.renderSize || 900);
        const blob = await toBlob(canvas, 'image/jpeg', 0.9);
        if (this.destroyed) return;
        const url = URL.createObjectURL(blob);
        this.urls.push(url);
        const face = this.leafEls[job.i].children[job.side];
        face.prepend(h('img', { src: url, alt: '', draggable: false }));
      } catch (err) { console.error(err); }
    }
  }

  edit() {
    const { p, N } = this;
    let index = 0;
    if (p === N) index = this.pages.length - 1;
    else if (p > 0) index = this.leaves[p][0] ?? this.leaves[p - 1][1] ?? 1;
    location.hash = `#/book/${this.book.id}/edit/${index}`;
  }

  destroy() {
    this.destroyed = true;
    document.removeEventListener('keydown', this.onKey);
    this.resizeObserver.disconnect();
    this.urls.forEach(u => URL.revokeObjectURL(u));
  }
}
