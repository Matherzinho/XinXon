import type { Mode, Step } from '../../lib/session'

/** O que mostrar na barra de resposta depois de responder. */
export interface Reveal {
  hanzi?: string
  pinyin?: string
  pt?: string
  note?: string
}

export interface ExerciseProps {
  step: Step & { type: 'exercise' }
  mode: Mode
  /** Força atual do item na revisão espaçada (0 = novo). */
  box: number
  locked: boolean
  onAnswer: (correct: boolean, reveal: Reveal) => void
  /** Pular sem contar como erro (ex.: não dá para falar agora). */
  onSkip: () => void
}
