import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { splitSyllables, TONE_COLORS, toneOf } from '../lib/pinyin'
import { speak } from '../lib/speech'
import { Icon } from './Icon'

export type Pose = 'torcendo' | 'duvida' | 'pensando' | 'escrevendo' | 'dormindo' | 'caderno'

export function Mascot({ pose, size = 160, bounce = false, alt = '' }: { pose: Pose; size?: number; bounce?: boolean; alt?: string }) {
  return (
    <img
      className={`mascot${bounce ? ' bounce' : ''}`}
      src={`/mascote/panda-${pose}.png`}
      alt={alt}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}

export function Bar({ value, color, thin }: { value: number; color?: 'red' | 'purple'; thin?: boolean }) {
  return (
    <div className={`bar${thin ? ' thin' : ''}${color ? ` ${color}` : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function BottomNav() {
  const items = [
    { to: '/', icon: 'home', label: 'Início' },
    { to: '/trilha', icon: 'path', label: 'Trilha' },
    { to: '/prof', icon: 'chat', label: 'Prof' },
    { to: '/caderno', icon: 'book', label: 'Caderno' },
    { to: '/dupla', icon: 'heart', label: 'Dupla' },
  ]
  return (
    <nav className="nav" aria-label="Navegação principal">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end className={({ isActive }) => `${isActive ? 'active' : ''}${i.to === '/prof' ? ' prof-tab' : ''}`}>
          {i.to === '/prof' ? (
            <span className="prof-badge">
              <img src="/mascote/panda-pensando.png" alt="" />
            </span>
          ) : (
            <Icon name={i.icon} />
          )}
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Botão que toca o áudio em chinês (+ tartaruga para ouvir bem devagar). */
export function SpeakerButton({
  text,
  small,
  auto,
  label = 'Ouvir',
  slow = true,
}: {
  text: string
  small?: boolean
  auto?: boolean
  label?: string
  /** Mostra o botão da tartaruga. */
  slow?: boolean
}) {
  const [playing, setPlaying] = useState<'normal' | 'slow' | null>(null)
  const play = async (veryslow = false) => {
    setPlaying(veryslow ? 'slow' : 'normal')
    await speak(text, 'zh-CN', { veryslow })
    setPlaying(null)
  }
  useEffect(() => {
    if (auto) {
      const t = window.setTimeout(() => play(), 250)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, auto])
  return (
    <div className="speaker-group">
      <button type="button" className={`speaker${small ? ' small' : ''}${playing === 'normal' ? ' playing' : ''}`} onClick={() => play()} aria-label={label}>
        <Icon name="speaker" size={small ? 24 : 40} />
      </button>
      {slow && (
        <button
          type="button"
          className={`speaker turtle${playing === 'slow' ? ' playing' : ''}`}
          onClick={() => play(true)}
          aria-label="Ouvir bem devagar"
          title="Ouvir bem devagar"
        >
          <Icon name="turtle" size={small ? 22 : 28} />
        </button>
      )}
    </div>
  )
}

/** Pinyin colorido por tom: cada cor é um tom. */
export function Pinyin({ text, size, className = '' }: { text: string; size?: number; className?: string }) {
  const parts = text.split(/(\s+|[,.!?，。！？])/)
  return (
    <span className={`pinyin ${className}`} style={size ? { fontSize: size } : undefined}>
      {parts.map((part, i) => {
        const syls = splitSyllables(part)
        if (!syls.length) return <span key={i}>{part}</span>
        // Mantém o texto original (com maiúsculas) mas pinta cada sílaba.
        let rest = part
        const out: ReactNode[] = []
        syls.forEach((s, j) => {
          const at = rest.toLowerCase().indexOf(s.toLowerCase())
          if (at > 0) out.push(rest.slice(0, at))
          out.push(
            <span key={j} style={{ color: TONE_COLORS[toneOf(s)] }}>
              {rest.slice(Math.max(at, 0), Math.max(at, 0) + s.length)}
            </span>,
          )
          rest = rest.slice(Math.max(at, 0) + s.length)
        })
        if (rest) out.push(rest)
        return <span key={i}>{out}</span>
      })}
    </span>
  )
}

/** Caixinhas por sílaba: toque para ouvir cada caractere sozinho. */
export function SyllableChips({ hanzi, pinyin }: { hanzi: string; pinyin: string }) {
  const chars = [...hanzi].filter((c) => /[\u4e00-\u9fff]/.test(c))
  const syls = splitSyllables(pinyin)
  if (chars.length < 2 || chars.length !== syls.length) return null
  return (
    <div className="syllables" aria-label="Ouvir sílaba por sílaba">
      {chars.map((c, i) => (
        <button key={i} type="button" className="syllable" onClick={() => speak(c, 'zh-CN', { veryslow: true })}>
          <span className="hz">{c}</span>
          <span style={{ color: TONE_COLORS[toneOf(syls[i])] }}>{syls[i]}</span>
        </button>
      ))}
    </div>
  )
}

/** Legenda pequena das cores dos tons. */
export function ToneLegend() {
  const names: [number, string][] = [[1, '1º alto'], [2, '2º sobe'], [3, '3º desce-sobe'], [4, '4º desce']]
  return (
    <div className="tone-legend" aria-label="Cores dos tons">
      {names.map(([t, n]) => (
        <span key={t} style={{ color: TONE_COLORS[t] }}>
          ● {n}
        </span>
      ))}
    </div>
  )
}

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.8,
        color: ['#E5383B', '#FFC93C', '#9B5DE5', '#C9A6FF', '#FF7A45'][i % 5],
        rot: Math.random() * 360,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{ left: `${p.left}%`, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, transform: `rotate(${p.rot}deg)` }}
        />
      ))}
    </div>
  )
}

export function Overlay({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="card">{children}</div>
    </div>
  )
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(t)
  }, [onDone])
  return (
    <div className="toast" role="status">
      {text}
    </div>
  )
}

export function Dots({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="dots" aria-label={`força ${value} de ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? 'on' : ''} />
      ))}
    </span>
  )
}
