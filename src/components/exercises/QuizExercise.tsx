import { useMemo, useState } from 'react'
import type { QuizItem } from '../../content'
import { shuffle } from '../../lib/session'
import { SpeakerButton } from '../ui'
import type { ExerciseProps } from './types'

/** Perguntas sobre os sons do pinyin. */
export function QuizExercise({ step, mode, locked, onAnswer }: ExerciseProps) {
  const quiz = (step.item as { quiz: QuizItem }).quiz
  const options = useMemo(() => shuffle(quiz.options), [step.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [chosen, setChosen] = useState<string | null>(null)

  const choose = (o: string) => {
    if (locked || chosen) return
    setChosen(o)
    onAnswer(o === quiz.answer, { pt: quiz.answer, note: quiz.explain })
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 20 }}>
      <h2>{quiz.prompt}</h2>
      {quiz.audio && mode.canListen && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <SpeakerButton text={quiz.audio} small auto />
          <span className="hz" style={{ fontSize: 34, fontWeight: 700 }}>
            {quiz.audio}
          </span>
        </div>
      )}
      <div className="choices">
        {options.map((o) => {
          const cls = !chosen ? '' : o === quiz.answer ? ' correct' : o === chosen ? ' wrong' : ''
          return (
            <button key={o} type="button" className={`choice${cls}`} disabled={!!chosen || locked} onClick={() => choose(o)}>
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}
