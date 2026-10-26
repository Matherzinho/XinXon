import { CHARS, type Item, type Tip } from '../../content'
import { soundTips, TONE_NAMES } from '../../lib/pinyin'
import { Mascot, Pinyin, SpeakerButton, SyllableChips, ToneLegend } from '../ui'
import { ToneShape } from './ToneExercise'

/** Apresenta um item novo antes de testar. */
export function IntroCard({ item, canListen, onNext }: { item: Item; canListen: boolean; onNext: () => void }) {
  if (item.kind === 'tone') {
    const t = item.tone
    return (
      <div className="screen" style={{ padding: 0, gap: 18 }}>
        <span className="chip yellow" style={{ alignSelf: 'flex-start' }}>
          Som novo
        </span>
        <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="prompt-hz">{t.hanzi}</div>
          <div className="prompt-py">
            <Pinyin text={t.pinyin} size={34} />
          </div>
          <ToneShape tone={t.tone} size={56} />
          <div style={{ fontWeight: 800 }}>{TONE_NAMES[t.tone]}</div>
          <div className="muted">significa “{t.pt}”</div>
          {canListen && <SpeakerButton text={t.hanzi} auto />}
        </div>
        <SoundTips pinyin={t.pinyin} />
        <div className="grow" />
        <button type="button" className="btn block big" onClick={onNext}>
          Entendi!
        </button>
      </div>
    )
  }
  if (item.kind !== 'word') return null
  const w = item.word
  const singles = [...w.hanzi].filter((c) => CHARS[c])
  return (
    <div className="screen" style={{ padding: 0, gap: 16 }}>
      <span className="chip yellow" style={{ alignSelf: 'flex-start' }}>
        Palavra nova
      </span>
      <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className={`prompt-hz${w.hanzi.length > 3 ? ' sm' : ''}`}>{w.hanzi}</div>
        <div className="prompt-py">
          <Pinyin text={w.pinyin} size={26} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{w.pt}</div>
        {canListen && <SpeakerButton text={w.hanzi} auto />}
        {canListen && <SyllableChips hanzi={w.hanzi} pinyin={w.pinyin} />}
        <ToneLegend />
      </div>
      <SoundTips pinyin={w.pinyin} />
      {w.note && <div className="card small">{w.note}</div>}
      {singles.map((c) => (
        <div key={c} className="card purple small" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <span className="hz" style={{ fontSize: 30, fontWeight: 700, color: 'var(--purple-light)' }}>
            {c}
          </span>
          <span>{CHARS[c].mnemonic}</span>
        </div>
      ))}
      <div className="grow" />
      <button type="button" className="btn block big" onClick={onNext}>
        Entendi!
      </button>
    </div>
  )
}

/** Dica da lição (mostrada uma vez, antes da primeira sessão). */
export function TipCard({ tip, canListen, onNext, index, total }: { tip: Tip; canListen: boolean; onNext: () => void; index: number; total: number }) {
  return (
    <div className="screen" style={{ padding: 0, gap: 16 }}>
      <span className="chip" style={{ alignSelf: 'flex-start' }}>
        Dica {index + 1} de {total}
      </span>
      <Mascot pose={index === 0 ? 'pensando' : 'escrevendo'} size={150} />
      <div className="card pop-in">
        <h2>{tip.title}</h2>
        <p>{tip.body}</p>
        {tip.example && (
          <p className="hz" style={{ fontSize: 20, color: 'var(--yellow)', fontWeight: 700 }}>
            {tip.example}
          </p>
        )}
      </div>
      {tip.audio && canListen && <SpeakerButton text={tip.audio} auto />}
      <div className="grow" />
      <button type="button" className="btn block big" onClick={onNext}>
        {index + 1 < total ? 'Próximo' : 'Bora praticar!'}
      </button>
    </div>
  )
}

/** "Como falar": dicas em português para os sons difíceis da palavra. */
export function SoundTips({ pinyin }: { pinyin: string }) {
  const tips = soundTips(pinyin)
  if (!tips.length) return null
  return (
    <div className="card small" style={{ gap: 6 }}>
      <strong style={{ color: 'var(--yellow)' }}>Como falar</strong>
      <ul className="tips-list">
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
