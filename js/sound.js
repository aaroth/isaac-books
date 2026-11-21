// Little sounds, made with the Web Audio API (no sound files needed):
// a paper "fwip" for turning pages, a "pop" for placing things, a chime
// for a new book and a click for the camera. They can be switched off.

let audio = null;
let noise = null;
const KEY = 'isaacs-books-sound';

export function soundOn() {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setSoundOn(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
}

function ready() {
  if (!soundOn()) return false;
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audio = new Ctx();
    const len = Math.floor(audio.sampleRate * 0.5);
    noise = audio.createBuffer(1, len, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  if (audio.state === 'suspended') audio.resume();
  return true;
}

function envelope(t, peak, attack, release) {
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

function noiseBurst({ from, to, q = 0.8, peak = 0.35, attack = 0.05, release = 0.35, rate = 1 }) {
  const t = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = rate;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + attack + release);
  src.connect(filter).connect(envelope(t, peak, attack, release)).connect(audio.destination);
  src.start(t);
  src.stop(t + attack + release + 0.05);
}

function tone(freq, start, dur, peak = 0.2, type = 'sine', slideTo = null) {
  const t = audio.currentTime + start;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  osc.connect(envelope(t, peak, 0.01, dur)).connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const play = fn => () => { try { if (ready()) fn(); } catch { /* sound is optional */ } };

export const pageTurnSound = play(() =>
  noiseBurst({ from: 3200, to: 900, rate: 0.9 + Math.random() * 0.2 }));

export const popSound = play(() => tone(520, 0, 0.12, 0.22, 'sine', 980));

export const chimeSound = play(() => {
  tone(660, 0, 0.35, 0.16, 'triangle');
  tone(880, 0.12, 0.35, 0.16, 'triangle');
  tone(1320, 0.24, 0.5, 0.14, 'triangle');
});

export const shutterSound = play(() =>
  noiseBurst({ from: 5000, to: 2000, q: 1.5, peak: 0.4, attack: 0.005, release: 0.08 }));
