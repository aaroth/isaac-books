// The bookshelf (home screen) and the "make a new book" dialog.

import * as db from './db.js';
import { makeBook, insidePageCount, PAGE_COUNT_CHOICES, COVER_COLORS, SHAPES } from './model.js';
import { h, openDialog, confirmDialog, book3d, rainbowTitle } from './ui.js';

export async function openShelf(root) {
  const urls = [];
  const objectUrl = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };

  const books = (await db.getAllBooks()).sort((a, b) => b.updated - a.updated);

  const newTile = h('button.shelf-slot.new-book', { onclick: () => newBookDialog(), 'aria-label': 'Make a new book' },
    h('div.new-book-card', {}, h('span.plus', {}, '+'), h('span.new-label', {}, 'New book')));

  const bookTiles = books.map(book => {
    const cover = book3d({
      shape: book.shape,
      insidePages: insidePageCount(book),
      coverColor: book.coverColor,
      coverUrl: book.coverThumb ? objectUrl(book.coverThumb) : null,
      size: book.shape === 'wide' ? 196 : 186,
    });
    return h('button.shelf-slot.shelf-book', { onclick: () => bookMenu(book, cover), 'aria-label': 'Open book' }, cover);
  });

  const view = h('div.shelf-screen', {},
    h('header.shelf-header', {}, rainbowTitle("Isaac's Books")),
    h('div.shelf', {}, newTile, ...bookTiles),
    books.length === 0 ? h('p.shelf-empty', {}, 'Tap the big + to make your first book!') : null,
  );
  root.append(view);

  async function bookMenu(book, coverEl) {
    const choice = await openDialog(close => h('div.book-menu', {},
      h('div.book-menu-cover', {}, coverEl.cloneNode(true)),
      h('div.book-menu-buttons', {},
        h('button.btn.btn-big.btn-go', { onclick: () => close('edit') }, h('span', {}, '✏️'), 'Make pages'),
        h('button.btn.btn-soft.btn-small-danger', { onclick: () => close('delete') }, h('span', {}, '🗑️'), 'Throw away'),
      ),
    ));
    if (choice === 'edit') location.hash = `#/book/${book.id}/edit/0`;
    if (choice === 'delete') {
      const ok = await confirmDialog({
        icon: '🗑️', text: 'Throw this book away? It will be gone forever.',
        yes: 'Throw it away', no: 'Keep it', danger: true,
      });
      if (ok) {
        await db.deleteBook(book.id);
        rerender();
      }
    }
  }

  function rerender() {
    destroy();
    root.innerHTML = '';
    openShelf(root).then(v => { current.destroy = v.destroy; });
  }

  function destroy() { urls.forEach(u => URL.revokeObjectURL(u)); urls.length = 0; }
  const current = { destroy };
  return current;
}

async function newBookDialog() {
  const choice = { shape: 'tall', insidePages: 8, coverColor: COVER_COLORS[5] };

  const result = await openDialog(close => {
    const preview = h('div.nb-preview');
    const updatePreview = () => {
      preview.replaceChildren(book3d({ ...choice, size: 210 }));
      preview.append(h('div.nb-count', {}, `${choice.insidePages} pages`));
    };

    const group = (items, key, render) => {
      const row = h('div.nb-options');
      const buttons = items.map(value => {
        const b = h('button.nb-option', {
          onclick: () => {
            choice[key] = value;
            buttons.forEach(x => x.classList.toggle('selected', x === b));
            updatePreview();
          },
        }, render(value));
        if (choice[key] === value) b.classList.add('selected');
        return b;
      });
      row.append(...buttons);
      return row;
    };

    updatePreview();
    return h('div.new-book', {},
      h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
      h('h2', {}, 'Make a new book'),
      h('div.nb-body', {},
        preview,
        h('div.nb-choices', {},
          h('h3', {}, 'What shape?'),
          group(['tall', 'wide'], 'shape', s => [
            h('span.shape-pic.' + s), h('span', {}, SHAPES[s].label),
          ]),
          h('h3', {}, 'How many pages?'),
          group(PAGE_COUNT_CHOICES, 'insidePages', n => [
            h('span.stack', { style: { '--n': n } }), h('span.num', {}, n),
          ]),
          h('h3', {}, 'Cover color'),
          group(COVER_COLORS, 'coverColor', c => h('span.swatch', { style: { background: c } })),
        ),
      ),
      h('button.btn.btn-big.btn-go.nb-make', { onclick: () => close(choice) }, 'Make my book! ✨'),
    );
  }, { className: 'dialog-wide' });

  if (!result) return;
  const { book, pages } = makeBook(result);
  await db.putBookAndPages(book, pages);
  location.hash = `#/book/${book.id}/edit/0`;
}
