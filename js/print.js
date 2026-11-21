// Printing a book as a booklet: sheets of letter paper printed on both
// sides, two book pages per side, then stacked, folded in half and stapled
// on the fold.
//
// Tall books: each half of a landscape sheet is one 5.5 x 8.5 in page.
// Wide books don't fit side by side on letter paper, so their pages are
// turned sideways on the sheet; the finished booklet opens at the top,
// like a calendar.

import * as db from './db.js';
import { SHAPES, isCover } from './model.js';
import { renderPageCanvas, fontCss, ensureFont } from './render.js';
import { h } from './ui.js';

// ---------- page order ----------

// The pages in reading order as printed: the covers, the blank insides of
// the covers, and the inside pages, with blank pages added before the
// inside of the back cover so the total is a multiple of 4 (each sheet
// holds 4 pages).
export function printSequence(pageCount) {
  const inside = pageCount - 2;
  const seq = [{ page: 0 }, { blank: 'inside of front cover' }];
  for (let k = 1; k <= inside; k++) seq.push({ page: k, number: k });
  const total = Math.ceil((inside + 4) / 4) * 4;
  while (seq.length < total - 2) seq.push({ blank: 'extra' });
  seq.push({ blank: 'inside of back cover' }, { page: pageCount - 1 });
  return seq;
}

// Which pages go on each sheet. Sheet 0 is the outside one. Side 1 of a
// sheet faces out when folded; side 2 faces in. Each side is [left, right].
export function imposeBooklet(seq) {
  const T = seq.length;
  const sheets = [];
  for (let k = 0; k < T / 4; k++) {
    sheets.push({
      side1: [seq[T - 1 - 2 * k], seq[2 * k]],
      side2: [seq[2 * k + 1], seq[T - 2 - 2 * k]],
    });
  }
  return sheets;
}

// ---------- the print screen ----------

export async function openPrint(root, bookId) {
  const book = await db.getBook(bookId);
  if (!book) { location.hash = '#/'; return { destroy() {} }; }
  const records = await db.getPages(book.pageIds);
  const pages = records.map((p, i) => p || { bg: isCover(book, i) ? book.coverColor : '#ffffff', items: [] });
  return new PrintScreen(root, book, pages);
}

const STEP_PICTURES = {
  printer: `<svg viewBox="0 0 120 90"><rect x="18" y="34" width="84" height="36" rx="8" fill="#90a4ae"/><rect x="30" y="14" width="60" height="26" fill="#fff" stroke="#b0bec5" stroke-width="2"/><rect x="30" y="62" width="60" height="22" fill="#fff" stroke="#b0bec5" stroke-width="2"/><circle cx="90" cy="46" r="4" fill="#66bb6a"/><path d="M46 70 h28 M46 76 h20" stroke="#ffb74d" stroke-width="3"/><path d="M104 22 a14 14 0 1 1 -10 -8" fill="none" stroke="#ff7043" stroke-width="4" stroke-linecap="round"/><path d="M92 8 l4 7 -8 2" fill="none" stroke="#ff7043" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  stack: `<svg viewBox="0 0 120 90"><g stroke="#b0bec5" stroke-width="2"><rect x="22" y="44" width="76" height="34" fill="#fff" transform="rotate(-4 60 61)"/><rect x="22" y="36" width="76" height="34" fill="#fff" transform="rotate(2 60 53)"/><rect x="22" y="28" width="76" height="34" fill="#fff"/></g><line x1="60" y1="28" x2="60" y2="62" stroke="#ccc" stroke-dasharray="3 3" stroke-width="2"/><text x="40" y="51" font-family="Fredoka, sans-serif" font-size="14" font-weight="600" fill="#ff7043" text-anchor="middle">1</text><text x="80" y="51" font-family="Fredoka, sans-serif" font-size="11" fill="#90a4ae" text-anchor="middle">2 3…</text></svg>`,
  fold: `<svg viewBox="0 0 120 90"><path d="M20 70 L60 60 L100 70 L100 38 L60 28 L20 38 Z" fill="#fff" stroke="#b0bec5" stroke-width="2"/><line x1="60" y1="28" x2="60" y2="60" stroke="#ff7043" stroke-width="2" stroke-dasharray="4 3"/><path d="M92 30 C88 10 70 6 62 16" fill="none" stroke="#4aa3ff" stroke-width="4" stroke-linecap="round"/><path d="M60 8 l2 10 9 -4" fill="none" stroke="#4aa3ff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  staple: `<svg viewBox="0 0 120 90"><path d="M26 22 L84 18 L94 70 L36 76 Z" fill="#ffd23f" stroke="#c79100" stroke-width="2"/><path d="M26 22 L36 76" stroke="#c79100" stroke-width="3"/><rect x="25" y="34" width="5" height="14" rx="1" fill="#607d8b" transform="rotate(-10 27 41)"/><rect x="29" y="56" width="5" height="14" rx="1" fill="#607d8b" transform="rotate(-10 31 63)"/><path d="M50 40 h28 M52 50 h20" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
};

class PrintScreen {
  constructor(root, book, pages) {
    this.book = book;
    this.pages = pages;
    this.wide = book.shape === 'wide';
    this.seq = printSequence(pages.length);
    this.sheets = imposeBooklet(this.seq);
    this.twoSided = true;
    this.numbers = true;
    this.cache = new Map();   // page index + numbers -> image URL
    this.urls = [];
    this.build(root);
    this.renderPreviews();
  }

  build(root) {
    const n = this.sheets.length;
    const extra = this.seq.filter(s => s.blank === 'extra').length;
    this.status = h('p.print-status');
    this.optionsEl = h('div.print-options');
    this.buttonsEl = h('div.print-buttons');
    this.stepsEl = h('ol.print-steps');
    this.previewEl = h('div.sheet-previews');

    this.el = h('div.print-screen', {},
      h('header.reader-top', {},
        h('button.btn-home', { onclick: () => { location.hash = '#/'; }, 'aria-label': 'Back to bookshelf' }, '🏠'),
        h('div.reader-title', {}, 'Print ' + (this.book.title ? `“${this.book.title}”` : 'my book')),
        h('div.spacer'),
        h('button.btn-add.add-read', { onclick: () => { location.hash = `#/book/${this.book.id}/read/0`; } },
          h('span.ico', {}, '📖'), h('span.lbl', {}, 'Read')),
      ),
      h('main.print-body', {},
        h('section.print-left', {},
          h('h2', {}, 'How to make your book'),
          this.stepsEl,
          this.optionsEl,
          this.buttonsEl,
          this.status,
        ),
        h('section.print-right', {},
          h('h2', {}, `${n} sheet${n === 1 ? '' : 's'} of paper`),
          h('p.print-note', {},
            `Each sheet holds 4 pages of the book.`,
            extra ? ` ${extra} blank page${extra === 1 ? ' was' : 's were'} added at the end so it folds evenly.` : '',
            this.wide ? ' Wide books open at the top, like a calendar.' : ''),
          n > 11 ? h('p.print-note.thick', {},
            '📚 This is a thick book! Fold the pile a few sheets at a time and press each fold flat, then line them all up again. ',
            'A long-reach stapler works best, or punch two holes near the fold and tie it with yarn.') : null,
          this.previewEl,
        ),
      ),
    );
    root.append(this.el);
    this.renderControls();
  }

  renderControls() {
    const steps = this.twoSided ? [
      ['printer', 'Print it on both sides', 'In the print window, turn on “Print on both sides” (or “Two-sided”) and pick “Flip on short edge”.'],
    ] : [
      ['printer', 'Print side 1, then side 2', 'Print side 1. Put the printed pages back in the printer and print side 2. Every printer feeds paper differently, so try it with one sheet first.'],
    ];
    steps.push(
      ['stack', 'Put the sheets in order', `Each sheet has a little number on it. Make a pile with sheet 1 at the bottom, its number facing down.`],
      ['fold', 'Fold the pile in half', 'Fold all the sheets together, so sheet 1 is on the outside with the front cover showing.'],
      ['staple', 'Staple on the fold', 'Two staples along the fold, pushed in from the outside. A grown-up can help. Tape or yarn works too!'],
    );
    this.stepsEl.replaceChildren(...steps.map(([pic, title, text], i) => {
      const art = h('div.step-pic');
      art.innerHTML = STEP_PICTURES[pic];
      return h('li.print-step', {}, art, h('div', {}, h('h3', {}, `${i + 1}. ${title}`), h('p', {}, text)));
    }));

    const radio = (value, label) => h('label.print-choice' + (this.twoSided === value ? '.selected' : ''), {},
      h('input', { type: 'radio', name: 'sides', checked: this.twoSided === value, onchange: () => { this.twoSided = value; this.renderControls(); } }),
      label);
    this.optionsEl.replaceChildren(
      radio(true, 'My printer prints on both sides'),
      radio(false, 'My printer prints on one side'),
      h('label.print-choice.check', {},
        h('input', { type: 'checkbox', checked: this.numbers, onchange: e => { this.numbers = e.target.checked; } }),
        'Put page numbers on the pages'),
    );

    const btn = (label, which, cls = 'btn-go') =>
      h(`button.btn.btn-big.${cls}`, { onclick: () => this.print(which) }, label);
    this.buttonsEl.replaceChildren(...(this.twoSided
      ? [btn('🖨️ Print my book', 'both')]
      : [btn('🖨️ Print side 1', 'side1'), btn('🖨️ Print side 2', 'side2', 'btn-blue')]));
  }

  // ---------- previews ----------

  async renderPreviews() {
    const thumbs = await Promise.all(this.pages.map(p => (p.thumb ? createImageBitmap(p.thumb).catch(() => null) : null)));
    this.previewEl.replaceChildren(...this.sheets.map((sheet, k) => h('div.sheet-preview', {},
      h('div.sheet-label', {}, `Sheet ${k + 1}`),
      h('div.sheet-sides', {},
        h('figure', {}, this.previewSide(sheet.side1, thumbs), h('figcaption', {}, 'Side 1')),
        h('figure', {}, this.previewSide(sheet.side2, thumbs), h('figcaption', {}, 'Side 2'))),
    )));
  }

  // A small picture of one side of a sheet, laid out as it will print.
  previewSide(pair, thumbs) {
    const W = 220, H = 170;
    const c = h('canvas.side-canvas', { width: W, height: H });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    pair.forEach((entry, i) => {
      const slot = { x: i * W / 2, y: 0, w: W / 2, h: H };
      if (entry.page !== undefined) {
        const page = this.pages[entry.page];
        const bmp = thumbs[entry.page];
        this.drawIntoSlot(ctx, slot, (cx, w, hh) => {
          cx.fillStyle = page.bg;
          cx.fillRect(0, 0, w, hh);
          if (bmp) cx.drawImage(bmp, 0, 0, w, hh);
        });
      } else {
        ctx.fillStyle = '#c7bfb4';
        ctx.font = '11px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('blank', slot.x + slot.w / 2, slot.y + slot.h / 2);
      }
    });
    ctx.strokeStyle = '#ddd';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    return c;
  }

  // Calls draw(ctx, w, h) with ctx set up so a page drawn at (0,0,w,h)
  // lands in the slot: upright for tall books, turned left for wide ones.
  drawIntoSlot(ctx, slot, draw) {
    ctx.save();
    if (this.wide) {
      ctx.translate(slot.x, slot.y + slot.h);
      ctx.rotate(-Math.PI / 2);
      draw(ctx, slot.h, slot.w);
    } else {
      ctx.translate(slot.x, slot.y);
      draw(ctx, slot.w, slot.h);
    }
    ctx.restore();
  }

  // ---------- printing ----------

  // A full-size picture of one book page, placed upright in a 5.5 x 8.5
  // slot (200 pixels per inch).
  async slotImage(entry) {
    if (entry.page === undefined) return null;
    const key = `${entry.page}:${this.numbers}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const page = this.pages[entry.page];
    const pageCanvas = await renderPageCanvas(page, this.book.shape, 1700);
    if (this.numbers && entry.number) {
      await ensureFont('Fredoka');
      const pc = pageCanvas.getContext('2d');
      pc.font = fontCss('Fredoka', 34);
      pc.textAlign = 'center';
      pc.textBaseline = 'alphabetic';
      pc.lineWidth = 6;
      pc.strokeStyle = 'rgba(255,255,255,0.85)';
      pc.fillStyle = '#6d6d6d';
      const x = pageCanvas.width / 2, y = pageCanvas.height - 30;
      pc.strokeText(String(entry.number), x, y);
      pc.fillText(String(entry.number), x, y);
    }
    const slot = document.createElement('canvas');
    slot.width = 1100; slot.height = 1700;
    this.drawIntoSlot(slot.getContext('2d'), { x: 0, y: 0, w: 1100, h: 1700 },
      (cx, w, hh) => cx.drawImage(pageCanvas, 0, 0, w, hh));
    const blob = await new Promise(r => slot.toBlob(r, 'image/jpeg', 0.92));
    const url = URL.createObjectURL(blob);
    this.urls.push(url);
    this.cache.set(key, url);
    return url;
  }

  async print(which) {
    if (this.printing) return;
    this.printing = true;
    try {
      const sides = [];
      this.sheets.forEach((sheet, k) => {
        if (which !== 'side2') sides.push({ pair: sheet.side1, sheet: k + 1, outside: true });
        if (which !== 'side1') sides.push({ pair: sheet.side2, sheet: k + 1, outside: false });
      });
      const needed = [...new Set(sides.flatMap(s => s.pair).filter(e => e.page !== undefined))];
      let done = 0;
      for (const entry of needed) {
        this.status.textContent = `Getting the pages ready… ${++done} of ${needed.length}`;
        await this.slotImage(entry);
      }

      let rootEl = document.getElementById('print-root');
      if (!rootEl) { rootEl = h('div', { id: 'print-root' }); document.body.append(rootEl); }
      const sheetsEls = [];
      for (const side of sides) {
        const slots = await Promise.all(side.pair.map(async entry => {
          const url = await this.slotImage(entry);
          return h('div.print-slot', {}, url ? h('img', { src: url, alt: '' }) : null);
        }));
        sheetsEls.push(h('div.print-sheet', {},
          h('div.print-spread' + (this.wide ? '.wide' : ''), {}, ...slots),
          h('div.fold-mark.top'), h('div.fold-mark.bottom'),
          side.outside ? h('div.sheet-number', {}, `sheet ${side.sheet}`) : null,
        ));
      }
      rootEl.replaceChildren(...sheetsEls);
      await Promise.all([...rootEl.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
      this.status.textContent = '';
      window.print();
    } catch (err) {
      console.error(err);
      this.status.textContent = 'Something went wrong getting the pages ready. Try again?';
    } finally {
      this.printing = false;
    }
  }

  destroy() {
    document.getElementById('print-root')?.remove();
    this.urls.forEach(u => URL.revokeObjectURL(u));
  }
}
