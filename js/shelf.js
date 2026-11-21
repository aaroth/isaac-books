// The bookshelf (home screen) and the "make a new book" dialog.

import * as db from './db.js';
import { makeBook, insidePageCount, PAGE_COUNT_CHOICES, COVER_COLORS, SHAPES } from './model.js';
import { h, openDialog, confirmDialog, book3d, rainbowTitle } from './ui.js';
import { pickFile, messageDialog } from './dialogs.js';
import { saveBooksToFile, readBookFile, addBookFromFile, FILE_EXTENSION } from './bookfile.js';
import { canInstall, install, onInstallChange } from './install.js';
import { soundOn, setSoundOn, chimeSound, popSound } from './sound.js';
import { canNarrate, getVoices, englishVoices, pickVoice, setVoiceName, getRate, setRate, speak } from './narrator.js';

// Settings for the "Read to me" voice, filled in once the voices load.
function voiceSettings() {
  const box = h('div.voice-settings');
  if (!canNarrate()) return box;
  getVoices().then(list => {
    const voices = englishVoices(list).length ? englishVoices(list) : list;
    if (!voices.length) {
      box.append(h('p', {}, 'This computer has no voices for “Read to me”.'));
      return;
    }
    const chosen = pickVoice(list);
    const select = h('select.voice-select', { onchange: () => setVoiceName(select.value) },
      voices.map(v => h('option', { value: v.name, selected: chosen && v.name === chosen.name },
        v.name + (v.localService ? '' : ' (needs internet)'))));
    const rate = h('input.voice-rate', {
      type: 'range', min: '0.6', max: '1.3', step: '0.05', value: String(getRate()),
      onchange: () => setRate(Number(rate.value)),
    });
    let trying = null;
    const tryIt = h('button.btn.btn-soft.grownup-btn', {
      onclick: () => { trying?.cancel(); trying = speak(['Once upon a time, Isaac made a book.']); },
    }, h('span', {}, '🔊'), 'Try it');
    box.append(
      h('label.voice-field', {}, h('span', {}, '“Read to me” voice'), select),
      h('label.voice-field', {}, h('span', {}, 'Speed'), h('span.rate-end', {}, '🐢'), rate, h('span.rate-end', {}, '🐇')),
      tryIt,
    );
  });
  return box;
}

export async function openShelf(root) {
  const urls = [];
  const objectUrl = blob => { const u = URL.createObjectURL(blob); urls.push(u); return u; };

  const books = (await db.getAllBooks()).sort((a, b) => b.updated - a.updated);

  const soundBtn = h('button.sound-toggle', {
    onclick: () => { setSoundOn(!soundOn()); paintSound(); if (soundOn()) popSound(); },
  });
  const paintSound = () => {
    soundBtn.textContent = soundOn() ? '🔊' : '🔇';
    soundBtn.title = soundOn() ? 'Sounds are on' : 'Sounds are off';
    soundBtn.setAttribute('aria-label', soundBtn.title);
  };
  paintSound();

  const installBtn = h('button.btn.btn-soft.grownup-btn', { onclick: () => install() }, h('span', {}, '⬇️'), 'Install as an app');
  const paintInstall = () => { installBtn.style.display = canInstall() ? '' : 'none'; };
  paintInstall();
  const stopInstallWatch = onInstallChange(paintInstall);

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
    h('header.shelf-header', {}, rainbowTitle("Isaac's Books"), soundBtn),
    h('div.shelf', {}, newTile, ...bookTiles),
    books.length === 0 ? h('p.shelf-empty', {}, 'Tap the big + to make your first book!') : null,
    h('section.grownups', {},
      h('h3', {}, 'For grown-ups'),
      h('p', {}, 'Books are kept in this browser on this computer. Save them to a file to back them up or to open them on another computer.'),
      h('div.grownup-buttons', {},
        h('button.btn.btn-soft.grownup-btn', { onclick: () => openBookFile() }, h('span', {}, '📂'), 'Open a book file'),
        books.length ? h('button.btn.btn-soft.grownup-btn', { onclick: () => saveAll() }, h('span', {}, '💾'), 'Save all books to a file') : null,
        installBtn,
      ),
      voiceSettings(),
    ),
    h('footer.credits', {}, 'Emoji stickers: ',
      h('a', { href: 'https://github.com/jdecked/twemoji', target: '_blank', rel: 'noopener' }, 'Twemoji'),
      ' (CC-BY 4.0)'),
  );
  root.append(view);

  async function bookMenu(book, coverEl) {
    const choice = await openDialog(close => h('div.book-menu', {},
      h('div.book-menu-cover', {}, coverEl.cloneNode(true)),
      h('div.book-menu-buttons', {},
        h('button.btn.btn-big.btn-go', { onclick: () => close('read') }, h('span', {}, '📖'), 'Read it'),
        h('button.btn.btn-big.btn-blue', { onclick: () => close('edit') }, h('span', {}, '✏️'), 'Make pages'),
        h('button.btn.btn-big.btn-soft', { onclick: () => close('print') }, h('span', {}, '🖨️'), 'Print it'),
        h('div.book-menu-small', {},
          h('button.btn.btn-soft.btn-small', { onclick: () => close('save') }, h('span', {}, '💾'), 'Save to a file'),
          h('button.btn.btn-soft.btn-small-danger', { onclick: () => close('delete') }, h('span', {}, '🗑️'), 'Throw away'),
        ),
      ),
    ));
    if (choice === 'read') location.hash = `#/book/${book.id}/read/0`;
    if (choice === 'edit') location.hash = `#/book/${book.id}/edit/0`;
    if (choice === 'print') location.hash = `#/book/${book.id}/print`;
    if (choice === 'save') await saveBooksToFile([book]);
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

  async function saveAll() {
    await saveBooksToFile(books);
  }

  async function openBookFile() {
    const file = await pickFile(FILE_EXTENSION + ',application/json,.json');
    if (!file) return;
    let fromFile;
    try {
      fromFile = await readBookFile(file);
    } catch (err) {
      console.warn(err);
      await messageDialog('📂', err.message === 'made by a newer version'
        ? 'That book file was made by a newer version. Reload the page and try again.'
        : "That isn't a book file from Isaac's Books.");
      return;
    }
    const onShelf = new Set((await db.getAllBooks()).map(b => b.id));
    let added = 0;
    for (const entry of fromFile) {
      let asCopy = false;
      if (onShelf.has(entry.book.id)) {
        const name = entry.book.title ? `“${entry.book.title}”` : 'This book';
        const choice = await openDialog(close => h('div.confirm', {},
          h('div.confirm-icon', {}, '📚'),
          h('p.confirm-text', {}, `${name} is already on the shelf.`),
          h('div.confirm-buttons', {},
            h('button.btn.btn-big.btn-soft', { onclick: () => close('skip') }, 'Skip it'),
            h('button.btn.btn-big.btn-blue', { onclick: () => close('copy') }, 'Keep both'),
            h('button.btn.btn-big.btn-go', { onclick: () => close('replace') }, 'Use the file’s copy'),
          ),
        ));
        if (choice !== 'copy' && choice !== 'replace') continue;
        asCopy = choice === 'copy';
      }
      await addBookFromFile(entry, { asCopy });
      added++;
    }
    if (added) { chimeSound(); rerender(); }
  }

  function rerender() {
    destroy();
    root.innerHTML = '';
    openShelf(root).then(v => { current.destroy = v.destroy; });
  }

  function destroy() { urls.forEach(u => URL.revokeObjectURL(u)); urls.length = 0; stopInstallWatch(); }
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
  chimeSound();
  location.hash = `#/book/${book.id}/edit/0`;
}
