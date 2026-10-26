import { CHARS } from './chars'
import { LESSONS } from './lessons'
import type { CharInfo, Lesson, QuizItem, Sentence, ToneSyllable, Word } from './types'
import { WISDOM } from './wisdom'

export { CHARS, LESSONS, WISDOM }
export type * from './types'

/** Tudo o que pode ser estudado e revisado vira um "item" com id único. */
export type Item =
  | { kind: 'word'; id: string; lessonId: string; word: Word }
  | { kind: 'tone'; id: string; lessonId: string; tone: ToneSyllable }
  | { kind: 'quiz'; id: string; lessonId: string; quiz: QuizItem }
  | { kind: 'sentence'; id: string; lessonId: string; sentence: Sentence }
  | { kind: 'write'; id: string; lessonId: string; char: string; info: CharInfo }

export const ITEMS: Record<string, Item> = {}

/** Itens principais da lição (apresentados um a um, na ordem). */
const CORE: Record<string, Item[]> = {}
/** Itens que liberam quando a lição já foi toda apresentada: frases e escrita. */
const EXTRA: Record<string, Item[]> = {}

for (const lesson of LESSONS) {
  const core: Item[] = []
  for (const tone of lesson.tones ?? []) core.push({ kind: 'tone', id: `t:${tone.hanzi}`, lessonId: lesson.id, tone })
  for (const quiz of lesson.quiz ?? []) core.push({ kind: 'quiz', id: `q:${quiz.id}`, lessonId: lesson.id, quiz })
  for (const word of lesson.words) core.push({ kind: 'word', id: `w:${word.hanzi}`, lessonId: lesson.id, word })
  const extra: Item[] = []
  for (const char of lesson.trace) {
    const info = CHARS[char]
    if (info) extra.push({ kind: 'write', id: `h:${char}`, lessonId: lesson.id, char, info })
  }
  for (const sentence of lesson.sentences) extra.push({ kind: 'sentence', id: `s:${sentence.id}`, lessonId: lesson.id, sentence })
  CORE[lesson.id] = core
  EXTRA[lesson.id] = extra
  for (const item of [...core, ...extra]) ITEMS[item.id] = item
}

export const coreItems = (lessonId: string) => CORE[lessonId] ?? []
export const extraItems = (lessonId: string) => EXTRA[lessonId] ?? []
export const allLessonItems = (lessonId: string) => [...coreItems(lessonId), ...extraItems(lessonId)]
export const lessonById = (id: string): Lesson | undefined => LESSONS.find((l) => l.id === id)

/** Todas as palavras (para montar alternativas erradas nos exercícios). */
export const ALL_WORDS: Word[] = LESSONS.flatMap((l) => l.words)

/** Texto em hanzi que representa o item (para tocar o áudio). */
export function itemHanzi(item: Item): string {
  switch (item.kind) {
    case 'word':
      return item.word.hanzi
    case 'tone':
      return item.tone.hanzi
    case 'quiz':
      return item.quiz.audio ?? ''
    case 'sentence':
      return item.sentence.hanzi
    case 'write':
      return item.char
  }
}

/** Todos os caracteres que aparecem no treino de escrita (o script de build copia os dados de traços deles). */
export const TRACE_CHARS = LESSONS.flatMap((l) => l.trace)
