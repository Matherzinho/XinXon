import { useMemo, useState } from 'react'
import { ALL_WORDS, type Sentence } from '../../content'
import { shuffle, tokenDistractors } from '../../lib/session'
import { speak } from '../../lib/speech'
import { SpeakerButton } from '../ui'
import type { ExerciseProps } from './types'

const pinyinOf = (hz: string) => ALL_WORDS.find((w) => w.hanzi === hz)?.pinyin

/** Montar a frase: a partir do português (build) ou ouvindo (dictation). */
export function BuildExercise({ step, mode, box, locked, onAnswer }: ExerciseProps) {
  const s = (step.item as { sentence: Sentence }).sentence
  const dictation = step.kind === 'dictation'
  const bank = useMemo(
    () => shuffle([...s.tokens, ...tokenDistractors(s.tokens, s.tokens.length > 3 ? 2 : 1)]).map((t, i) => ({ t, i })),
    [step.key], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [picked, setPicked] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const showPinyin = box < 2

  const add = (i: number) => {
    if (locked || checked || picked.includes(i)) return
    setPicked([...picked, i])
    if (mode.canListen) void speak(bank[i].t)
  }
  const remove = (i: number) => {
    if (locked || checked) return
    setPicked(picked.filter((p) => p !== i))
  }
  const check = () => {
    setChecked(true)
    const answer = picked.map((i) => bank[i].t).join('')
    onAnswer(answer === s.tokens.join(''), { hanzi: s.hanzi, pinyin: s.pinyin, pt: s.pt })
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 18 }}>
      <h2>{dictation ? 'Monte o que você ouviu' : 'Monte a frase em chinês'}</h2>
      {dictation ? (
        <SpeakerButton text={s.hanzi} auto />
      ) : (
        <div className="row">
          {mode.canListen && <SpeakerButton text={s.hanzi} small />}
          <div className="card purple grow" style={{ fontSize: 20, fontWeight: 900 }}>
            “{s.pt}”
          </div>
        </div>
      )}
      <div className="answer-line" aria-label="Sua resposta">
        {picked.map((i) => (
          <button key={i} type="button" className="token" onClick={() => remove(i)}>
            {bank[i].t}
          </button>
        ))}
      </div>
      <div className="tokens">
        {bank.map(({ t, i }) => (
          <button key={i} type="button" className={`token${picked.includes(i) ? ' used' : ''}`} onClick={() => add(i)} disabled={picked.includes(i)}>
            {t}
            {showPinyin && pinyinOf(t) && (
              <span style={{ display: 'block', fontFamily: "'Nunito', system-ui, sans-serif", fontSize: 11, color: 'var(--muted)' }}>{pinyinOf(t)}</span>
            )}
          </button>
        ))}
      </div>
      {!checked && (
        <button type="button" className="btn block" disabled={!picked.length || locked} onClick={check}>
          Verificar
        </button>
      )}
    </div>
  )
}
