import { useState } from 'react'
import { LESSONS, type ToneSyllable } from '../../content'
import { speak } from '../../lib/speech'
import { stripTones, TONE_NAMES, TONE_PATHS } from '../../lib/pinyin'
import { SpeakerButton } from '../ui'
import type { ExerciseProps } from './types'

export function ToneShape({ tone, size = 40, color = 'var(--yellow)' }: { tone: number; size?: number; color?: string }) {
  return (
    <svg className="tone-shape" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="8" fill="none" stroke="var(--line)" strokeWidth="2" />
      <path d={TONE_PATHS[tone]} fill={tone === 0 ? color : 'none'} stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Treino de tons: com áudio, identifica de ouvido; sem áudio, identifica pela marca do pinyin. */
export function ToneExercise({ step, mode, locked, onAnswer }: ExerciseProps) {
  const syl = (step.item as { tone: ToneSyllable }).tone
  const [chosen, setChosen] = useState<number | null>(null)
  const options = syl.tone === 0 ? [1, 2, 3, 4, 0] : [1, 2, 3, 4]
  const byEar = mode.canListen

  // Mesma sílaba nos outros tons (ex.: mā má mǎ mà), para ouvir cada opção.
  const base = stripTones(syl.pinyin)
  const variants = LESSONS.flatMap((l) => l.tones ?? []).filter((v) => stripTones(v.pinyin) === base)
  const sample = (t: number) => variants.find((v) => v.tone === t)?.hanzi
  const [picked, setPicked] = useState<number | null>(null)

  const confirm = (t: number) => {
    if (locked || chosen !== null) return
    setChosen(t)
    onAnswer(t === syl.tone, { hanzi: syl.hanzi, pinyin: syl.pinyin, pt: syl.pt, note: TONE_NAMES[syl.tone] })
  }
  // De ouvido: tocar uma opção faz ela soar; depois confirma embaixo.
  const choose = (t: number) => {
    if (locked || chosen !== null) return
    if (!byEar) return confirm(t)
    setPicked(t)
    const hz = sample(t)
    if (hz) void speak(hz)
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 20 }}>
      <h2>{byEar ? 'Qual tom você ouviu?' : 'Que tom essa marca indica?'}</h2>
      <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="prompt-hz">{syl.hanzi}</div>
        <div className="prompt-py" style={{ fontSize: 30 }}>
          {byEar && chosen === null ? stripTones(syl.pinyin) : syl.pinyin}
        </div>
        {byEar && <SpeakerButton text={syl.hanzi} auto />}
      </div>
      <div className="choices two">
        {options.map((t) => {
          const cls = chosen === null ? (picked === t ? ' selected' : '') : t === syl.tone ? ' correct' : t === chosen ? ' wrong' : ''
          return (
            <button key={t} type="button" className={`choice${cls}`} disabled={chosen !== null || locked} onClick={() => choose(t)}>
              <ToneShape tone={t} />
              <span className="small">{TONE_NAMES[t].split(' · ')[0]}</span>
              <span className="py">{TONE_NAMES[t].split(' · ')[1]}</span>
            </button>
          )
        })}
      </div>
      {byEar && chosen === null && (
        <>
          <p className="center small muted">Toque nos tons para ouvir cada um e confirme o que você ouviu.</p>
          <button type="button" className="btn block" disabled={picked === null || locked} onClick={() => picked !== null && confirm(picked)}>
            Confirmar
          </button>
        </>
      )}
    </div>
  )
}
