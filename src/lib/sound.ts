/** Tiny Web Audio sound kit — synthesized, no files to download. */
const KEY = "darts:sound";
let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "off";
}
export function setSoundEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? "on" : "off");
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !soundEnabled()) return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noiseBurst(c: AudioContext, at: number, dur: number, freq: number, gain: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(at);
}

/** Crisp dart-into-sisal "thwack" plus a little buzz in the hand. */
export function playThwack() {
  navigator.vibrate?.([25, 30, 45]);
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  noiseBurst(c, t, 0.05, 3200, 0.9); // tip snap
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
  g.gain.setValueAtTime(0.6, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.2);
}

/** Short pub-crowd cheer swell for big moments. */
export function playCheer() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 6; i++) noiseBurst(c, t + i * 0.08, 0.6, 900 + Math.random() * 900, 0.25);
  [523, 659, 784].forEach((hz, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = hz;
    g.gain.setValueAtTime(0.0001, t + i * 0.1);
    g.gain.exponentialRampToValueAtTime(0.15, t + i * 0.1 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.1 + 0.4);
    o.connect(g).connect(c.destination);
    o.start(t + i * 0.1);
    o.stop(t + i * 0.1 + 0.45);
  });
}
