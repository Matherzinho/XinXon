import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays, dayKey, daysBetween } from '../lib/date'
import { grade } from '../lib/srs'
import type { Profile, Progress, SessionResult, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  canListen: true,
  canSpeak: true,
  slowVoice: false,
  sound: true,
  skipFoundation: false,
}

export function emptyProgress(): Progress {
  return {
    xp: 0,
    coins: 20,
    streak: { count: 0, best: 0, last: null, freezes: 1 },
    days: {},
    items: {},
    tipsSeen: [],
    wisdom: { last: null, collected: [] },
    updatedAt: Date.now(),
  }
}

const MAX_FREEZES = 3

interface FinishInput {
  xp: number
  coins: number
  correct: number
  total: number
  bestCombo: number
  newItems: number
  minutes: number
}

interface AppState {
  profiles: Record<string, Profile>
  activeId: string | null
  lastResult: SessionResult | null

  createProfile: (name: string, skipFoundation: boolean, id?: string, cloud?: boolean) => string
  switchProfile: (id: string | null) => void
  deleteProfile: (id: string) => void
  renameProfile: (name: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  recordAnswer: (itemId: string, correct: boolean) => void
  markTipsSeen: (lessonId: string) => void
  finishSession: (input: FinishInput) => SessionResult
  spendCoins: (n: number) => boolean
  addCoins: (n: number) => void
  addFreezes: (n: number) => void
  collectWisdom: (index: number) => boolean
  replaceProgress: (progress: Progress) => void
  resetProgress: () => void
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Altera o progresso do perfil ativo e marca a hora da mudança (para sincronizar). */
      const patchProgress = (fn: (p: Progress) => Progress) =>
        set((s) => {
          const id = s.activeId
          if (!id || !s.profiles[id]) return s
          const prof = s.profiles[id]
          return { profiles: { ...s.profiles, [id]: { ...prof, progress: { ...fn(prof.progress), updatedAt: Date.now() } } } }
        })

      return {
        profiles: {},
        activeId: null,
        lastResult: null,

        createProfile(name, skipFoundation, id = uid(), cloud = false) {
          const profile: Profile = {
            id,
            name: name.trim() || 'Estudante',
            createdAt: Date.now(),
            cloud,
            settings: { ...DEFAULT_SETTINGS, skipFoundation },
            progress: emptyProgress(),
          }
          set((s) => ({ profiles: { ...s.profiles, [id]: profile }, activeId: id }))
          return id
        },

        switchProfile: (id) => set({ activeId: id }),

        deleteProfile: (id) =>
          set((s) => {
            const profiles = { ...s.profiles }
            delete profiles[id]
            return { profiles, activeId: s.activeId === id ? null : s.activeId }
          }),

        renameProfile: (name) =>
          set((s) => {
            const id = s.activeId
            if (!id) return s
            return { profiles: { ...s.profiles, [id]: { ...s.profiles[id], name } } }
          }),

        updateSettings: (patch) =>
          set((s) => {
            const id = s.activeId
            if (!id) return s
            const prof = s.profiles[id]
            return { profiles: { ...s.profiles, [id]: { ...prof, settings: { ...prof.settings, ...patch } } } }
          }),

        recordAnswer: (itemId, correct) =>
          patchProgress((p) => ({ ...p, items: { ...p.items, [itemId]: grade(p.items[itemId], correct) } })),

        markTipsSeen: (lessonId) =>
          patchProgress((p) => (p.tipsSeen.includes(lessonId) ? p : { ...p, tipsSeen: [...p.tipsSeen, lessonId] })),

        finishSession(input) {
          const today = dayKey()
          const prof = get().activeId ? get().profiles[get().activeId!] : null
          const prev = prof?.progress.streak ?? emptyProgress().streak
          let { count, freezes, best } = prev
          let streakUp = false
          if (prev.last !== today) {
            streakUp = true
            if (prev.last === addDays(today, -1)) count += 1
            else if (prev.last) {
              const missed = daysBetween(prev.last, today) - 1
              if (missed > 0 && freezes >= missed) {
                freezes -= missed
                count += 1
              } else count = 1
            } else count = 1
            // Ganha um congelamento a cada 7 dias seguidos.
            if (count % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1)
            best = Math.max(best, count)
          }
          // Baú surpresa: recompensa variável (dá mais vontade de voltar).
          const chest = Math.random() < 0.35 ? 10 + Math.floor(Math.random() * 21) : 0
          const coins = input.coins + chest
          patchProgress((p) => {
            const day = p.days[today] ?? { xp: 0, sessions: 0 }
            return {
              ...p,
              xp: p.xp + input.xp,
              coins: p.coins + coins,
              streak: { count, best, freezes, last: today },
              days: { ...p.days, [today]: { xp: day.xp + input.xp, sessions: day.sessions + 1 } },
            }
          })
          const result: SessionResult = { ...input, coins, chest, streak: count, streakUp }
          set({ lastResult: result })
          return result
        },

        spendCoins(n) {
          const prof = get().activeId ? get().profiles[get().activeId!] : null
          if (!prof || prof.progress.coins < n) return false
          patchProgress((p) => ({ ...p, coins: p.coins - n }))
          return true
        },

        addCoins: (n) => patchProgress((p) => ({ ...p, coins: p.coins + n })),

        addFreezes: (n) =>
          patchProgress((p) => ({ ...p, streak: { ...p.streak, freezes: Math.min(MAX_FREEZES, p.streak.freezes + n) } })),

        collectWisdom(index) {
          const today = dayKey()
          const prof = get().activeId ? get().profiles[get().activeId!] : null
          if (!prof || prof.progress.wisdom.last === today) return false
          patchProgress((p) => ({
            ...p,
            coins: p.coins + 5,
            wisdom: {
              last: today,
              collected: p.wisdom.collected.includes(index) ? p.wisdom.collected : [...p.wisdom.collected, index],
            },
          }))
          return true
        },

        replaceProgress: (progress) =>
          set((s) => {
            const id = s.activeId
            if (!id) return s
            return { profiles: { ...s.profiles, [id]: { ...s.profiles[id], progress } } }
          }),

        resetProgress: () => patchProgress(() => emptyProgress()),
      }
    },
    { name: 'xinxon', version: 1, partialize: (s) => ({ profiles: s.profiles, activeId: s.activeId, lastResult: s.lastResult }) },
  ),
)

/** Perfil ativo (ou null se ninguém entrou ainda). */
export const useProfile = () => useApp((s) => (s.activeId ? s.profiles[s.activeId] ?? null : null))

/** Ofensiva como deve aparecer hoje (zera se passou do prazo sem congelamento). */
export function streakToday(p: Progress, today = dayKey()) {
  const { last, count, freezes } = p.streak
  if (!last) return { count: 0, studiedToday: false, atRisk: false }
  const gap = daysBetween(last, today)
  if (gap === 0) return { count, studiedToday: true, atRisk: false }
  if (gap === 1) return { count, studiedToday: false, atRisk: true }
  if (gap - 1 <= freezes) return { count, studiedToday: false, atRisk: true }
  return { count: 0, studiedToday: false, atRisk: false }
}
