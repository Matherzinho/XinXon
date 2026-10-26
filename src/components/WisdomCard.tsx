import { useState } from 'react'
import { WISDOM } from '../content'
import { dayKey, dayNumber } from '../lib/date'
import { sfx } from '../lib/sounds'
import { speak } from '../lib/speech'
import { useApp } from '../store/useApp'
import type { Progress } from '../store/types'
import { Icon, Jiaozi } from './Icon'

export const wisdomIndexToday = () => dayNumber() % WISDOM.length

/** Bilhetinho de sabedoria do dia: abre uma vez por dia e vai para a coleção. */
export function WisdomCard({ progress, canListen }: { progress: Progress; canListen: boolean }) {
  const collect = useApp((s) => s.collectWisdom)
  const index = wisdomIndexToday()
  const w = WISDOM[index]
  const opened = progress.wisdom.last === dayKey()
  const [justOpened, setJustOpened] = useState(false)

  if (!opened)
    return (
      <button
        type="button"
        className="card paper"
        style={{ border: 'none', cursor: 'pointer', flexDirection: 'row', alignItems: 'center', gap: 14, textAlign: 'left' }}
        onClick={() => {
          if (collect(index)) {
            sfx.coin()
            setJustOpened(true)
          }
        }}
      >
        <span className="hz" style={{ width: 48, height: 48, borderRadius: 10, background: '#C8282C', color: '#FFF4E6', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          智
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 900, fontSize: 16 }}>Sabedoria do dia</span>
          <span style={{ fontSize: 14, color: '#6B4A36' }}>
            Toque para abrir seu bilhetinho · +5 <Jiaozi size={14} />
          </span>
        </span>
      </button>
    )

  return (
    <div className={`card paper${justOpened ? ' pop-in' : ''}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <span className="hz" style={{ width: 44, height: 44, borderRadius: 8, background: '#C8282C', color: '#FFF4E6', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        智
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#9A3A1E', textTransform: 'uppercase', letterSpacing: 1 }}>Sabedoria do dia</span>
        <span className="hz" style={{ fontWeight: 700, fontSize: 19 }}>
          {w.hanzi}
        </span>
        <span style={{ fontSize: 13, color: '#6B4A36' }}>{w.pinyin}</span>
        <span style={{ fontSize: 14 }}>
          “{w.pt}”{w.author ? ` · ${w.author}` : ''}
        </span>
      </div>
      {canListen && (
        <button type="button" className="icon-btn" style={{ color: '#9A3A1E' }} aria-label="Ouvir a sabedoria" onClick={() => speak(w.hanzi)}>
          <Icon name="speaker" />
        </button>
      )}
    </div>
  )
}
