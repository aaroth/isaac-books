// Dialogs for adding things to a page: words, stickers, pictures, camera
// snapshots, and choosing the paper.

import { h, openDialog } from './ui.js';
import { STICKER_GROUPS, getStickerSrc, isEmojiSticker } from './stickers.js';
import { FONTS, fontCss, ensureFont, PAPER_PATTERNS, PAPER_COLORS, drawPaper } from './render.js';
import { SHAPES } from './model.js';

// Text sizes in page pixels (pages are 200 pixels per inch).
export const TEXT_SIZES = [
  { label: 'Small', px: 60 },
  { label: 'Medium', px: 95 },
  { label: 'Big', px: 150 },
];

const nearestSize = px => TEXT_SIZES.reduce((best, s, i) =>
  Math.abs(s.px - px) < Math.abs(TEXT_SIZES[best].px - px) ? i : best, 0);

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.8;
}

// Returns { text, font, fontSize } or null. fontSize is null when the size
// wasn't changed, so an item that was resized by hand keeps its size.
export async function textDialog({ item = null, color, cover = null, authorName = 'Isaac' }) {
  await Promise.all(FONTS.map(f => ensureFont(f.id)));
  const state = {
    text: item ? item.text : '',
    font: item ? item.font : 'Fredoka',
    sizeIndex: item ? nearestSize(item.fontSize) : (cover ? 2 : 1),
  };
  const startSize = state.sizeIndex;
  const textColor = item ? item.color : color;

  return openDialog(close => {
    const input = h('textarea.text-input', {
      value: state.text,
      rows: 2,
      placeholder: cover === 'front' ? "Your book's title" : 'Type your words here',
      oninput: () => { state.text = input.value; done.disabled = !input.value.trim(); },
      onkeydown: e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) finish(); },
    });
    input.style.color = textColor;
    input.style.background = isLight(textColor) ? '#5b6b7a' : '#ffffff';
    const applyFont = () => { input.style.font = fontCss(state.font, [28, 36, 46][state.sizeIndex]); };
    applyFont();

    const choiceRow = (options, isSel, onPick, render) => {
      const buttons = options.map((opt, i) => {
        const b = h('button.choice', {
          onclick: () => { onPick(opt, i); buttons.forEach((x, j) => x.classList.toggle('selected', isSel(options[j], j))); applyFont(); },
        }, render(opt, i));
        b.classList.toggle('selected', isSel(opt, i));
        return b;
      });
      return h('div.choice-row', {}, buttons);
    };

    const insert = words => {
      const pos = input.selectionStart ?? input.value.length;
      const before = input.value.slice(0, pos);
      const sep = before && !before.endsWith('\n') ? '\n' : '';
      input.value = before + sep + words + input.value.slice(pos);
      input.dispatchEvent(new Event('input'));
      input.focus();
    };
    const chips = cover === 'front' ? [`by ${authorName}`] : cover === 'back' ? ['The End', `by ${authorName}`] : [];

    const finish = () => {
      if (!state.text.trim()) return;
      close({
        text: state.text.replace(/\s+$/, ''),
        font: state.font,
        fontSize: state.sizeIndex === startSize && item ? null : TEXT_SIZES[state.sizeIndex].px,
      });
    };
    const done = h('button.btn.btn-big.btn-go', { onclick: finish, disabled: !state.text.trim() }, 'Done ✓');

    setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 50);

    return h('div.text-dialog', {},
      h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
      h('h2', {}, item ? 'Change the words' : (cover === 'front' ? 'Title' : 'Words')),
      input,
      chips.length ? h('div.chip-row', {}, chips.map(c => h('button.chip', { onclick: () => insert(c) }, '+ ' + c))) : null,
      h('h3', {}, 'Letters'),
      choiceRow(FONTS, f => f.id === state.font, f => { state.font = f.id; },
        f => [h('span.font-sample', { style: { font: fontCss(f.id, 30) } }, 'Abc'), h('span.choice-label', {}, f.label)]),
      h('h3', {}, 'Size'),
      choiceRow(TEXT_SIZES, (s, i) => i === state.sizeIndex, (s, i) => { state.sizeIndex = i; },
        (s, i) => [h('span.size-sample', { style: { fontSize: [18, 26, 36][i] + 'px' } }, 'A'), h('span.choice-label', {}, s.label)]),
      h('div.dialog-buttons', {},
        h('button.btn.btn-big.btn-soft', { onclick: () => close(null) }, 'Cancel'),
        done),
    );
  }, { className: 'dialog-medium' });
}

// ---------- stickers ----------

let lastGroup = STICKER_GROUPS[0].id;

export function stickerDialog() {
  return openDialog(close => {
    const grid = h('div.sticker-grid');
    const tabs = STICKER_GROUPS.map(g => h('button.sticker-tab', {
      title: g.label,
      onclick: () => show(g.id),
    }, h('span.tab-icon', {}, g.icon), h('span.tab-label', {}, g.label)));

    function show(id) {
      lastGroup = id;
      const group = STICKER_GROUPS.find(g => g.id === id);
      tabs.forEach((t, i) => t.classList.toggle('selected', STICKER_GROUPS[i].id === id));
      grid.replaceChildren(...group.items.map(sticker => {
        const b = h('button.sticker-btn', { onclick: () => close(sticker), title: 'Add this sticker' });
        if (isEmojiSticker(sticker)) b.append(h('span.emoji-fallback', {}, sticker));
        getStickerSrc(sticker).then(src => {
          if (src) b.replaceChildren(h('img', { src, alt: '', draggable: false }));
        });
        return b;
      }));
      grid.scrollTop = 0;
    }
    show(lastGroup);

    return h('div.sticker-dialog', {},
      h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
      h('h2', {}, 'Stickers'),
      h('div.sticker-tabs', {}, tabs),
      grid,
    );
  }, { className: 'dialog-wide' });
}

// ---------- pictures ----------

// Opens the file chooser. Resolves with a File, or null if cancelled.
export function pickPictureFile() {
  return new Promise(resolve => {
    const input = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    input.addEventListener('change', () => { resolve(input.files[0] || null); input.remove(); });
    input.addEventListener('cancel', () => { resolve(null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

export function messageDialog(icon, text) {
  return openDialog(close => h('div.confirm', {},
    h('div.confirm-icon', {}, icon),
    h('p.confirm-text', {}, text),
    h('div.confirm-buttons', {}, h('button.btn.btn-big.btn-go', { onclick: () => close() }, 'OK')),
  ));
}

export const hasCamera = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

// Takes a snapshot with the camera. Resolves with a canvas, or null.
export async function cameraDialog() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false,
    });
  } catch (err) {
    console.warn(err);
    await messageDialog('📷', err && err.name === 'NotAllowedError'
      ? 'The camera is turned off for this page. A grown-up can allow it in the browser.'
      : "Couldn't find a camera.");
    return null;
  }

  try {
    return await openDialog(close => {
      const video = h('video.camera-video', { autoplay: true, muted: true, playsInline: true });
      video.srcObject = stream;
      const shot = h('canvas.camera-shot');
      const count = h('div.camera-count');
      const flash = h('div.camera-flash');
      const view = h('div.camera-view', {}, video, shot, count, flash);
      let snapshot = null;

      const shutter = h('button.camera-shutter', { onclick: () => countdown(), 'aria-label': 'Take picture' });
      const again = h('button.btn.btn-big.btn-soft', { onclick: () => retake() }, '↺ Try again');
      const use = h('button.btn.btn-big.btn-go', { onclick: () => close(snapshot) }, 'Use it ✓');
      const controls = h('div.camera-controls', {}, shutter);

      async function countdown() {
        shutter.disabled = true;
        for (const n of ['3', '2', '1']) {
          count.textContent = n;
          count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
          await new Promise(r => setTimeout(r, 700));
        }
        count.textContent = '';
        take();
      }

      function take() {
        const w = video.videoWidth, hgt = video.videoHeight;
        if (!w || !hgt) { shutter.disabled = false; return; }
        shot.width = w; shot.height = hgt;
        const ctx = shot.getContext('2d');
        // Saved the way it looked on screen, like a mirror.
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, hgt);
        snapshot = shot;
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
        view.classList.add('taken');
        controls.replaceChildren(again, use);
      }

      function retake() {
        snapshot = null;
        view.classList.remove('taken');
        shutter.disabled = false;
        controls.replaceChildren(shutter);
      }

      return h('div.camera-dialog', {},
        h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
        view, controls);
    }, { className: 'dialog-medium' });
  } finally {
    stream.getTracks().forEach(t => t.stop());
  }
}

// ---------- paper ----------

// Returns { color, pattern } or null.
export function paperDialog({ color, pattern, shape }) {
  const state = { color, pattern };
  const { w, h: ph } = SHAPES[shape];
  return openDialog(close => {
    const preview = h('canvas.paper-preview', { width: Math.round(w / 5), height: Math.round(ph / 5) });
    const patternButtons = PAPER_PATTERNS.map(p => {
      const c = h('canvas', { width: Math.round(w / 14), height: Math.round(ph / 14) });
      return { p, c, b: h('button.choice.pattern-btn', { onclick: () => { state.pattern = p.id; update(); } }, c, h('span.choice-label', {}, p.label)) };
    });
    const swatches = PAPER_COLORS.map(c => h('button.swatch-btn', {
      style: { '--c': c }, 'aria-label': 'Paper color ' + c, onclick: () => { state.color = c; update(); },
    }));

    function update() {
      drawPaper(preview.getContext('2d'), preview.width, preview.height, state.color, state.pattern);
      for (const { p, c, b } of patternButtons) {
        drawPaper(c.getContext('2d'), c.width, c.height, state.color, p.id);
        b.classList.toggle('selected', p.id === state.pattern);
      }
      swatches.forEach((s, i) => s.classList.toggle('active', PAPER_COLORS[i] === state.color));
    }
    update();

    return h('div.paper-dialog', {},
      h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
      h('h2', {}, 'Paper'),
      h('div.paper-body', {},
        h('div.paper-preview-wrap', {}, preview),
        h('div.paper-choices', {},
          h('h3', {}, 'Color'),
          h('div.paper-swatches', {}, swatches),
          h('h3', {}, 'Pattern'),
          h('div.choice-row', {}, patternButtons.map(x => x.b)),
        ),
      ),
      h('div.dialog-buttons', {},
        h('button.btn.btn-big.btn-soft', { onclick: () => close(null) }, 'Cancel'),
        h('button.btn.btn-big.btn-go', { onclick: () => close(state) }, 'Done ✓')),
    );
  }, { className: 'dialog-wide' });
}
