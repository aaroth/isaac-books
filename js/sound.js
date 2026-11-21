// A soft paper "fwip" for turning pages, made with the Web Audio API (no
// sound files needed).

let audio = null;
let noise = null;

function setup() {
  if (audio) return true;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  audio = new Ctx();
  const len = Math.floor(audio.sampleRate * 0.5);
  noise = audio.createBuffer(1, len, audio.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return true;
}

export function pageTurnSound() {
  try {
    if (!setup()) return;
    if (audio.state === 'suspended') audio.resume();
    const t = audio.currentTime;
    const src = audio.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(filter).connect(gain).connect(audio.destination);
    src.start(t);
    src.stop(t + 0.45);
  } catch { /* sound is optional */ }
}
