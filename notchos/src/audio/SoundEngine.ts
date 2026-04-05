import { DEFAULT_SOUNDS } from './defaultSounds';

let audioCtx: AudioContext | null = null;
let muted = false;
let volume = 0.5;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playSound(name: string) {
  if (muted) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const def = DEFAULT_SOUNDS[name];
  if (!def) return;

  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = def.waveform;
  osc.frequency.setValueAtTime(def.frequency, ctx.currentTime);
  if (def.ramp) {
    osc.frequency.linearRampToValueAtTime(def.ramp, ctx.currentTime + def.duration / 1000);
  }

  gainNode.gain.setValueAtTime(def.gain * volume, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + def.duration / 1000);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + def.duration / 1000);
}

export function setMuted(m: boolean) { muted = m; }
export function isMuted(): boolean { return muted; }
export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); }
export function getVolume(): number { return volume; }
