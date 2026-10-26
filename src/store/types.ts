import type { SrsState } from '../lib/srs'

export interface Settings {
  canListen: boolean
  canSpeak: boolean
  slowVoice: boolean
  sound: boolean
  skipFoundation: boolean
}

export interface DayStat {
  xp: number
  sessions: number
}

export interface Streak {
  count: number
  best: number
  /** Último dia com sessão concluída (AAAA-MM-DD). */
  last: string | null
  /** Congelamentos guardados: protegem a ofensiva num dia sem estudo. */
  freezes: number
}

export interface Progress {
  xp: number
  coins: number
  streak: Streak
  days: Record<string, DayStat>
  items: Record<string, SrsState>
  tipsSeen: string[]
  wisdom: { last: string | null; collected: number[] }
  updatedAt: number
}

export interface Profile {
  id: string
  name: string
  createdAt: number
  /** true quando o perfil está ligado a uma conta na nuvem. */
  cloud: boolean
  settings: Settings
  progress: Progress
}

export interface SessionResult {
  xp: number
  coins: number
  correct: number
  total: number
  bestCombo: number
  chest: number
  newItems: number
  streak: number
  streakUp: boolean
  minutes: number
}
