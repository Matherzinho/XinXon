import { ALL_WORDS, ITEMS, coreItems, extraItems, type Item, type Lesson, type Tip, type Word } from '../content'
import type { Progress, Settings } from '../store/types'
import { currentLesson } from './progress'

// Monta uma sessão de ~5 minutos misturando:
// - itens novos da lição atual (apresentação + exercício logo depois + de novo um pouco mais tarde),
// - revisões vencidas (revisão espaçada),
// - frases e escrita quando a lição já foi toda apresentada.
// Os exercícios escolhidos dependem do modo: posso ouvir? posso falar?

export type ExerciseKind =
  | 'meaning' // vê o hanzi e escolhe o significado
  | 'hanzi' // vê o português e escolhe o hanzi
  | 'listen' // ouve e escolhe o hanzi
  | 'tone' // identifica o tom
  | 'quiz' // pergunta livre (sons do pinyin)
  | 'build' // monta a frase a partir do português
  | 'dictation' // ouve e monta a frase
  | 'speak' // lê e fala em voz alta
  | 'pimsleur' // ouve a pergunta em português, responde falando, ouve a resposta
  | 'write' // traça o caractere

export type Step =
  | { type: 'tip'; key: string; lesson: Lesson; tip: Tip }
  | { type: 'intro'; key: string; item: Item }
  | { type: 'exercise'; key: string; item: Item; kind: ExerciseKind; retry?: boolean }

export interface Mode {
  canListen: boolean
  canSpeak: boolean
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
let seq = 0
const key = () => `k${++seq}`

/** Escolhe o tipo de exercício para um item, conforme a força dele e o modo atual. */
export function chooseKind(item: Item, box: number, mode: Mode, stage: 'first' | 'second' | 'review'): ExerciseKind {
  const { canListen, canSpeak } = mode
  switch (item.kind) {
    case 'tone':
      return 'tone'
    case 'quiz':
      return 'quiz'
    case 'write':
      return 'write'
    case 'sentence': {
      const opts: ExerciseKind[] = ['build']
      if (canListen) opts.push('dictation')
      if (canSpeak && box >= 1) opts.push(canListen ? 'pimsleur' : 'speak')
      return pick(opts)
    }
    case 'word': {
      if (stage === 'first') return canListen && Math.random() < 0.4 ? 'listen' : 'meaning'
      const opts: ExerciseKind[] = ['hanzi', 'meaning']
      if (canListen) opts.push('listen')
      if (canSpeak) opts.push(canListen ? 'pimsleur' : 'speak', canListen ? 'pimsleur' : 'speak')
      if (box >= 3) opts.splice(opts.indexOf('meaning'), 1)
      return pick(opts)
    }
  }
}

export function buildSession(progress: Progress, settings: Settings, mode: Mode): Step[] {
  const now = Date.now()
  const lesson = currentLesson(progress, settings)
  const state = (id: string) => progress.items[id]
  const steps: Step[] = []

  // 1) Dicas da lição na primeira vez.
  if (!progress.tipsSeen.includes(lesson.id)) {
    for (const tip of lesson.tips) steps.push({ type: 'tip', key: key(), lesson, tip })
  }

  // 2) Itens novos (máx. 3; 4 nas lições de tons e sons, que são rápidas).
  const core = coreItems(lesson.id)
  const fresh = core.filter((i) => !state(i.id))
  const newLimit = lesson.unit === 'Fundação' && !lesson.words.length ? 4 : 3
  const newItems = fresh.slice(0, newLimit)

  // 3) Revisões vencidas (de qualquer lição), as mais atrasadas primeiro.
  const due = Object.entries(progress.items)
    .filter(([id, s]) => s.due <= now && ITEMS[id])
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => ITEMS[id])
  const reviews = due.slice(0, newItems.length ? 4 : 7)

  // 4) Extras (escrita e frases) quando a lição já foi toda apresentada.
  const extras: Item[] = []
  if (!fresh.length) {
    const pending = extraItems(lesson.id).filter((i) => !state(i.id) || state(i.id)!.due <= now)
    extras.push(...shuffle(pending.filter((i) => !reviews.includes(i))).slice(0, 3))
  }

  // Monta a fila no estilo Pimsleur: apresenta, testa já, e testa de novo depois de outros itens.
  const reviewQueue = [...reviews]
  const later: Step[] = []
  for (const item of newItems) {
    if (item.kind === 'word' || item.kind === 'tone') steps.push({ type: 'intro', key: key(), item })
    steps.push({ type: 'exercise', key: key(), item, kind: chooseKind(item, 0, mode, 'first') })
    const delayed = later.shift()
    if (delayed) steps.push(delayed)
    const rev = reviewQueue.shift()
    if (rev) steps.push({ type: 'exercise', key: key(), item: rev, kind: chooseKind(rev, state(rev.id)?.box ?? 0, mode, 'review') })
    if (item.kind !== 'quiz') later.push({ type: 'exercise', key: key(), item, kind: chooseKind(item, 1, mode, 'second') })
  }
  steps.push(...later)
  for (const rev of reviewQueue) steps.push({ type: 'exercise', key: key(), item: rev, kind: chooseKind(rev, state(rev.id)?.box ?? 0, mode, 'review') })
  for (const ex of extras) steps.push({ type: 'exercise', key: key(), item: ex, kind: chooseKind(ex, state(ex.id)?.box ?? 0, mode, 'review') })

  // 5) Se ficou curta, completa com prática dos itens já vistos da lição (os mais fracos primeiro).
  const count = () => steps.filter((s) => s.type === 'exercise').length
  const seen = [...core, ...extraItems(lesson.id)]
    .filter((i) => state(i.id) && !steps.some((s) => s.type === 'exercise' && s.item.id === i.id))
    .sort((a, b) => (state(a.id)?.box ?? 0) - (state(b.id)?.box ?? 0))
  for (const item of seen) {
    if (count() >= 8) break
    steps.push({ type: 'exercise', key: key(), item, kind: chooseKind(item, state(item.id)?.box ?? 0, mode, 'review') })
  }

  return steps.slice(0, 22)
}

/** Repetição de um item errado, um pouco mais para frente na fila. */
export function retryStep(step: Step & { type: 'exercise' }, mode: Mode): Step {
  const kind = step.kind === 'pimsleur' || step.kind === 'speak' ? step.kind : chooseKind(step.item, 0, mode, 'first')
  return { type: 'exercise', key: key(), item: step.item, kind, retry: true }
}

// ---------- Alternativas para os exercícios ----------

/** Palavras parecidas (mesma lição primeiro) para servirem de alternativa errada. */
export function wordDistractors(word: Word, n = 3): Word[] {
  const lesson = ITEMS[`w:${word.hanzi}`]?.lessonId
  const same = ALL_WORDS.filter((w) => ITEMS[`w:${w.hanzi}`]?.lessonId === lesson)
  const pool = shuffle(same).concat(shuffle(ALL_WORDS))
  const out: Word[] = []
  for (const w of pool) {
    if (out.length >= n) break
    if (w.hanzi === word.hanzi || w.pt === word.pt || w.pinyin === word.pinyin) continue
    if (out.some((o) => o.hanzi === w.hanzi || o.pt === w.pt)) continue
    out.push(w)
  }
  return out
}

export function withChoices<T>(answer: T, wrong: T[]): T[] {
  return shuffle([answer, ...wrong])
}

/** Peças extras para confundir no exercício de montar frase. */
export function tokenDistractors(tokens: string[], n = 2): string[] {
  const pool = shuffle(ALL_WORDS.map((w) => w.hanzi)).filter((h) => !tokens.includes(h) && h.length <= 2)
  return pool.slice(0, n)
}

export { shuffle }
