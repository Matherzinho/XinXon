import { useMemo, useState } from 'react'
import type { Word } from '../../content'
import { withChoices, wordDistractors } from '../../lib/session'
import { speak } from '../../lib/speech'
import { SpeakerButton } from '../ui'
import type { ExerciseProps } from './types'

/** Palavras: ver hanzi → escolher significado; ver português → escolher hanzi; ouvir → escolher hanzi. */
export function ChoiceExercise({ step, mode, box, locked, onAnswer }: ExerciseProps) {
  const word = (step.item as { word: Word }).word
  const kind = step.kind as 'meaning' | 'hanzi' | 'listen'
  const options = useMemo(() => withChoices(word, wordDistractors(word, 3)), [step.key]) // eslint-disable-line react-hooks/exhaustive-deps
  const [chosen, setChosen] = useState<string | null>(null)
  const showPinyin = kind === 'meaning' || box < 3

  const choose = (w: Word) => {
    if (locked || chosen) return
    setChosen(w.hanzi)
    if (mode.canListen && kind !== 'meaning') void speak(w.hanzi)
    onAnswer(w.hanzi === word.hanzi, { hanzi: word.hanzi, pinyin: word.pinyin, pt: word.pt, note: word.note })
  }

  const state = (w: Word) => {
    if (!chosen) return ''
    if (w.hanzi === word.hanzi) return ' correct'
    if (w.hanzi === chosen) return ' wrong'
    return ''
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 20 }}>
      {kind === 'meaning' && (
        <>
          <h2>O que significa?</h2>
          <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div className="prompt-hz">{word.hanzi}</div>
            <div className="prompt-py">{word.pinyin}</div>
            {mode.canListen && <SpeakerButton text={word.hanzi} small auto />}
          </div>
        </>
      )}
      {kind === 'hanzi' && (
        <>
          <h2>Como se escreve em chinês?</h2>
          <div className="card purple pop-in center" style={{ fontSize: 24, fontWeight: 900 }}>
            “{word.pt}”
          </div>
        </>
      )}
      {kind === 'listen' && (
        <>
          <h2>O que você ouviu?</h2>
          <SpeakerButton text={word.hanzi} auto />
          <p className="center muted small">Toque no alto-falante para ouvir de novo</p>
        </>
      )}

      <div className={`choices${kind === 'meaning' ? '' : ' two'}`}>
        {options.map((w) => (
          <button key={w.hanzi} type="button" className={`choice${state(w)}`} onClick={() => choose(w)} disabled={!!chosen || locked}>
            {kind === 'meaning' ? (
              <span>{w.pt}</span>
            ) : (
              <>
                <span className="hz">{w.hanzi}</span>
                {showPinyin && <span className="py">{w.pinyin}</span>}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
