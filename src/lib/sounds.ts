// Efeitos sonoros curtos gerados na hora (sem arquivos) + vibração no Android.

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

const vibrate = (p: number | number[]) => navigator.vibrate?.(p)

export const sfx = {
  correct(combo = 0) {
    const lift = Math.min(combo, 6) * 40
    tone(660 + lift, 0, 0.18, 'triangle')
    tone(880 + lift, 0.09, 0.25, 'triangle')
    vibrate(15)
  },
  wrong() {
    tone(220, 0, 0.22, 'sawtooth', 0.08)
    tone(180, 0.1, 0.25, 'sawtooth', 0.08)
    vibrate([40, 30, 40])
  },
  tap() {
    tone(520, 0, 0.06, 'sine', 0.08)
  },
  complete() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.35, 'triangle', 0.16))
    vibrate([20, 40, 20, 40, 60])
  },
  coin() {
    tone(988, 0, 0.08, 'square', 0.06)
    tone(1319, 0.07, 0.2, 'square', 0.06)
  },
  unlock() {
    audio()
  },
}
