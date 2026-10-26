import { LESSONS, coreItems, extraItems, type Lesson } from '../content'
import type { Progress, Settings } from '../store/types'

export interface LessonStatus {
  lesson: Lesson
  /** 0 a 1. */
  percent: number
  done: boolean
  started: boolean
}

export function lessonStatus(lesson: Lesson, progress: Progress): LessonStatus {
  const core = coreItems(lesson.id)
  const extra = extraItems(lesson.id)
  const all = [...core, ...extra]
  const learned = all.filter((i) => (progress.items[i.id]?.right ?? 0) > 0).length
  const coreSeen = core.every((i) => progress.items[i.id])
  const extraTried = extra.every((i) => (progress.items[i.id]?.right ?? 0) + (progress.items[i.id]?.wrong ?? 0) > 0)
  const started = all.some((i) => progress.items[i.id])
  return { lesson, percent: all.length ? learned / all.length : 1, done: coreSeen && extraTried, started }
}

/** Lições visíveis na trilha (pula a Fundação se a pessoa já sabe pinyin). */
export function visibleLessons(settings: Settings): Lesson[] {
  return settings.skipFoundation ? LESSONS.filter((l) => l.unit !== 'Fundação') : LESSONS
}

/** A lição atual é a primeira ainda não concluída. */
export function currentLesson(progress: Progress, settings: Settings): Lesson {
  const lessons = visibleLessons(settings)
  return lessons.find((l) => !lessonStatus(l, progress).done) ?? lessons[lessons.length - 1]
}

export function unitProgress(progress: Progress, settings: Settings, unit: Lesson['unit']) {
  const lessons = visibleLessons(settings).filter((l) => l.unit === unit)
  if (!lessons.length) return 0
  return lessons.reduce((sum, l) => sum + lessonStatus(l, progress).percent, 0) / lessons.length
}

/** Quantos itens estão vencidos para revisão agora. */
export function dueCount(progress: Progress, now = Date.now()): number {
  return Object.values(progress.items).filter((s) => s.due <= now).length
}
