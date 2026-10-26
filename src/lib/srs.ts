// Revisão espaçada simples (sistema de caixas de Leitner).
// Acertou: o item sobe de caixa e demora mais para voltar.
// Errou: volta para a caixa 1 e reaparece logo.

export interface SrsState {
  box: number
  /** Quando o item deve voltar para revisão (timestamp em ms). */
  due: number
  right: number
  wrong: number
  last: number
}

const DAY = 86_400_000
/** Intervalo (em dias) de cada caixa. */
const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60]
export const MAX_BOX = INTERVALS.length - 1

export function grade(prev: SrsState | undefined, correct: boolean, now = Date.now()): SrsState {
  const base: SrsState = prev ?? { box: 0, due: now, right: 0, wrong: 0, last: now }
  if (correct) {
    const box = Math.min(base.box + 1, MAX_BOX)
    return { box, due: now + INTERVALS[box] * DAY, right: base.right + 1, wrong: base.wrong, last: now }
  }
  return { box: 1, due: now + 10 * 60_000, right: base.right, wrong: base.wrong + 1, last: now }
}

export const isDue = (s: SrsState, now = Date.now()) => s.due <= now

/** Força do item de 0 a 1 (para barrinhas no caderno). */
export const strength = (s?: SrsState) => (s ? Math.min(s.box / 5, 1) : 0)
