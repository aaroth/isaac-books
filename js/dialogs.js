// Dialogs for adding things to a page: words, stickers, pictures, camera
// snapshots, and choosing the paper.

import { h, openDialog } from './ui.js';
import { STICKER_GROUPS, STICKER_NAMES, getStickerSrc, isEmojiSticker } from './stickers.js';
import { FONTS, fontCss, ensureFont, PAPER_PATTERNS, PAPER_COLORS, drawPaper } from './render.js';
import { SHAPES } from './model.js';
import { shutterSound } from './sound.js';

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

// When the words are edited, keep each remaining letter's size; new
// letters get the size of the letter just before them.
function keepScales(oldText, newText, oldScales) {
  const a = [...oldText], b = [...newText];
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let q = 0;
  while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
  const fill = p > 0 ? oldScales[p - 1] : (oldScales[p] ?? 1);
  return [...oldScales.slice(0, p), ...Array(b.length - p - q).fill(fill ?? 1), ...oldScales.slice(a.length - q)];
}

const SCALE_STEP = 1.25;
const clampScale = s => Math.round(Math.max(0.4, Math.min(4, s)) * 100) / 100;

// Returns { text, scales, font, fontSize } or null. fontSize is null when
// the size wasn't changed, so an item that was resized by hand keeps its
// size. scales[i] is how big letter i is (1 = normal).
export async function textDialog({ item = null, color, cover = null, authorName = 'Isaac' }) {
  await Promise.all(FONTS.map(f => ensureFont(f.id)));
  const startText = item ? item.text : '';
  const state = {
    text: startText,
    scales: item && item.scales ? [...item.scales] : Array([...startText].length).fill(1),
    font: item ? item.font : 'Fredoka',
    sizeIndex: item ? nearestSize(item.fontSize) : (cover ? 2 : 1),
    sel: null, // [start, end) of picked letters
  };
  const startSize = state.sizeIndex;
  const textColor = item ? item.color : color;

  return openDialog(close => {
    const input = h('textarea.text-input', {
      value: state.text,
      rows: 2,
      placeholder: cover === 'front' ? "Your book's title" : 'Type your words here',
      oninput: () => {
        state.scales = keepScales(state.text, input.value, state.scales);
        state.text = input.value;
        state.sel = null;
        done.disabled = !input.value.trim();
        paintPreview();
      },
      onkeydown: e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) finish(); },
    });

    // ---- making single words or letters bigger or smaller ----
    const preview = h('div.size-preview');
    const hint = h('p.size-hint');
    const bigger = h('button.btn.btn-soft.size-change', { onclick: () => changeSize(SCALE_STEP) },
      h('span.small-a', {}, 'A'), h('span.big-a', {}, 'A'), ' Bigger');
    const smaller = h('button.btn.btn-soft.size-change', { onclick: () => changeSize(1 / SCALE_STEP) },
      h('span.big-a', {}, 'A'), h('span.small-a', {}, 'A'), ' Smaller');
    const same = h('button.btn.btn-soft.size-change', { onclick: () => resetSizes() }, '↺ Same size');

    function paintPreview() {
      const chars = [...state.text];
      preview.style.font = fontCss(state.font, 30);
      preview.style.color = textColor;
      preview.style.background = isLight(textColor) ? '#5b6b7a' : '#fffaf2';
      const [a, b] = state.sel || [-1, -1];
      preview.replaceChildren(...chars.map((c, i) => c === '\n' ? h('br')
        : h('span.letter' + (i >= a && i < b ? '.picked' : ''), {
          'data-i': i, style: { fontSize: Math.round(30 * (state.scales[i] || 1)) + 'px' },
        }, c)));
      if (!chars.length) preview.append(h('span.size-empty', {}, 'Your words will show up here'));
      const has = !!state.sel;
      bigger.disabled = smaller.disabled = !has;
      hint.textContent = has ? 'Now make them bigger or smaller!' : 'Tap a word, or slide across letters, to pick them';
    }

    function changeSize(f) {
      if (!state.sel) return;
      const [a, b] = state.sel;
      for (let i = a; i < b; i++) state.scales[i] = clampScale((state.scales[i] || 1) * f);
      paintPreview();
    }

    function resetSizes() {
      const [a, b] = state.sel || [0, state.scales.length];
      for (let i = a; i < b; i++) state.scales[i] = 1;
      paintPreview();
    }

    // Tap picks a whole word; sliding picks the letters slid across.
    let anchor = null, slid = false;
    const letterAt = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const sp = el && el.closest && el.closest('.letter');
      return sp && preview.contains(sp) ? Number(sp.dataset.i) : null;
    };
    preview.addEventListener('pointerdown', e => {
      const i = letterAt(e);
      if (i === null) { state.sel = null; paintPreview(); return; }
      e.preventDefault();
      anchor = i; slid = false;
      state.sel = [i, i + 1];
      try { preview.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      paintPreview();
    });
    preview.addEventListener('pointermove', e => {
      if (anchor === null) return;
      const j = letterAt(e);
      if (j === null) return;
      if (j !== anchor) slid = true;
      state.sel = [Math.min(anchor, j), Math.max(anchor, j) + 1];
      paintPreview();
    });
    const endPick = () => {
      if (anchor === null) return;
      if (!slid) {
        const chars = [...state.text];
        const isGap = c => c === ' ' || c === '\n';
        let a = anchor, b = anchor + 1;
        if (!isGap(chars[anchor])) {
          while (a > 0 && !isGap(chars[a - 1])) a--;
          while (b < chars.length && !isGap(chars[b])) b++;
        }
        state.sel = [a, b];
      }
      anchor = null;
      paintPreview();
    };
    preview.addEventListener('pointerup', endPick);
    preview.addEventListener('pointercancel', endPick);
    input.style.color = textColor;
    input.style.background = isLight(textColor) ? '#5b6b7a' : '#ffffff';
    const applyFont = () => {
      input.style.font = fontCss(state.font, [28, 36, 46][state.sizeIndex]);
      paintPreview();
    };
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
      const text = state.text.replace(/\s+$/, '');
      close({
        text,
        scales: state.scales.slice(0, [...text].length),
        font: state.font,
        fontSize: state.sizeIndex === startSize && item ? null : TEXT_SIZES[state.sizeIndex].px,
      });
    };
    const done = h('button.btn.btn-big.btn-go', { onclick: finish, disabled: !state.text.trim() }, 'Done ✓');

    setTimeout(() => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }, 50);

    return h('div.text-dialog', {},
      h('button.dialog-close', { onclick: () => close(null), 'aria-label': 'Close' }, '✖'),
      h('h2', {}, item ? 'Change the words' : (cover === 'front' ? 'Title' : 'Words')),
      h('div.text-dialog-body', {},
        h('div.text-left', {},
          input,
          chips.length ? h('div.chip-row', {}, chips.map(c => h('button.chip', { onclick: () => insert(c) }, '+ ' + c))) : null,
          h('h3', {}, 'Letters'),
          choiceRow(FONTS, f => f.id === state.font, f => { state.font = f.id; },
            f => [h('span.font-sample', { style: { font: fontCss(f.id, 30) } }, 'Abc'), h('span.choice-label', {}, f.label)]),
          h('h3', {}, 'Size of all the words'),
          choiceRow(TEXT_SIZES, (s, i) => i === state.sizeIndex, (s, i) => { state.sizeIndex = i; },
            (s, i) => [h('span.size-sample', { style: { fontSize: [18, 26, 36][i] + 'px' } }, 'A'), h('span.choice-label', {}, s.label)]),
        ),
        h('div.text-right', {},
          h('h3', {}, 'Make words bigger or smaller'),
          hint,
          preview,
          h('div.size-buttons', {}, smaller, bigger, same),
        ),
      ),
      h('div.dialog-buttons', {},
        h('button.btn.btn-big.btn-soft', { onclick: () => close(null) }, 'Cancel'),
        done),
    );
  }, { className: 'dialog-wide' });
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
        const name = STICKER_NAMES[sticker];
        const pic = h('div.sticker-pic');
        const b = h('button.sticker-btn' + (name ? '.named' : ''), { onclick: () => close(sticker), title: name || 'Add this sticker' },
          pic, name ? h('span.sticker-name', {}, name) : null);
        if (isEmojiSticker(sticker)) pic.append(h('span.emoji-fallback', {}, sticker));
        getStickerSrc(sticker).then(src => {
          if (src) pic.replaceChildren(h('img', { src, alt: '', draggable: false }));
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

export const pickPictureFile = () => pickFile('image/*');

// Opens the file chooser. Resolves with a File, or null if cancelled.
export function pickFile(accept) {
  return new Promise(resolve => {
    const input = h('input', { type: 'file', accept, style: { display: 'none' } });
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
        shutterSound();
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
