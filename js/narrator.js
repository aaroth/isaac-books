// Reading books aloud with the computer's built-in voices (the Web Speech
// API). No account or internet needed for voices that live on the computer.

const VOICE_KEY = 'isaacs-books-voice';
const RATE_KEY = 'isaacs-books-rate';
const wait = ms => new Promise(r => setTimeout(r, ms));

export const canNarrate = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } }

export const getRate = () => Number(load(RATE_KEY)) || 0.95;
export const setRate = r => save(RATE_KEY, String(r));
export const setVoiceName = name => save(VOICE_KEY, name);

// The list of voices can take a moment to appear.
export async function getVoices() {
  if (!canNarrate()) return [];
  let list = speechSynthesis.getVoices();
  if (list.length) return list;
  await Promise.race([
    new Promise(r => speechSynthesis.addEventListener('voiceschanged', r, { once: true })),
    wait(1500),
  ]);
  return speechSynthesis.getVoices();
}

export const englishVoices = list => list.filter(v => /^en([-_]|$)/i.test(v.lang));

// The saved voice, or a good English one that works without internet.
export function pickVoice(list) {
  const saved = load(VOICE_KEY);
  const found = saved && list.find(v => v.name === saved);
  if (found) return found;
  const en = englishVoices(list);
  return en.find(v => v.localService && /en[-_]US/i.test(v.lang))
    || en.find(v => v.localService)
    || en.find(v => /en[-_]US/i.test(v.lang))
    || en[0] || list[0] || null;
}

// The words on a page, in reading order: top to bottom, and left to right
// for words side by side. Each line break is a little pause.
export function pageWords(page, pageHeight) {
  const texts = (page.items || []).filter(i => i.type === 'text' && i.text && i.text.trim());
  const band = pageHeight * 0.06;
  texts.sort((a, b) => {
    const ta = a.y - a.h / 2, tb = b.y - b.h / 2;
    return Math.abs(ta - tb) < band ? a.x - b.x : ta - tb;
  });
  return texts.flatMap(t => t.text.split('\n').map(s => s.trim()).filter(Boolean));
}

// Long bits are split into sentences; some browsers stop speaking partway
// through very long ones.
function chunks(text) {
  const out = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*\s*/g) || [text]) {
    let s = sentence.trim();
    while (s.length > 180) {
      const cut = s.lastIndexOf(' ', 180) > 40 ? s.lastIndexOf(' ', 180) : 180;
      out.push(s.slice(0, cut));
      s = s.slice(cut).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

// Speaks the pieces one after another. Returns { done, cancel }: done
// resolves true when everything was read, false if cancelled.
export function speak(pieces) {
  let cancelled = false;
  const done = (async () => {
    const voice = pickVoice(await getVoices());
    const rate = getRate();
    for (const piece of pieces) {
      for (const text of chunks(piece)) {
        if (cancelled) return false;
        await new Promise(resolve => {
          const u = new SpeechSynthesisUtterance(text);
          if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
          u.rate = rate;
          u.pitch = 1.05;
          // In case the browser never says it finished.
          const guard = setTimeout(resolve, 2500 + (text.length * 110) / rate);
          u.onend = u.onerror = () => { clearTimeout(guard); resolve(); };
          speechSynthesis.speak(u);
        });
        if (!cancelled) await wait(250);
      }
    }
    return !cancelled;
  })();
  return {
    done,
    cancel() {
      cancelled = true;
      if (canNarrate()) speechSynthesis.cancel();
    },
  };
}

export function stopSpeaking() {
  if (canNarrate()) speechSynthesis.cancel();
}
