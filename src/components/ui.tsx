import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
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
    { to: '/caderno', icon: 'book', label: 'Caderno' },
    { to: '/dupla', icon: 'heart', label: 'Dupla' },
  ]
  return (
    <nav className="nav" aria-label="Navegação principal">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={i.icon} />
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Botão que toca o áudio em chinês. */
export function SpeakerButton({ text, small, auto, label = 'Ouvir' }: { text: string; small?: boolean; auto?: boolean; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const play = async () => {
    setPlaying(true)
    await speak(text)
    setPlaying(false)
  }
  useEffect(() => {
    if (auto) {
      const t = window.setTimeout(play, 250)
      return () => window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, auto])
  return (
    <button type="button" className={`speaker${small ? ' small' : ''}${playing ? ' playing' : ''}`} onClick={play} aria-label={label}>
      <Icon name="speaker" size={small ? 24 : 40} />
    </button>
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
