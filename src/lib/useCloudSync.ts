import { useEffect } from 'react'
import { create } from 'zustand'
import { useApp } from '../store/useApp'
import type { Progress } from '../store/types'
import { cloudEnabled, fetchProgress, myProfile, pushProgress, supabase, type CloudProfile } from './cloud'

interface CloudState {
  ready: boolean
  userId: string | null
  email: string | null
  profile: CloudProfile | null
  partner: CloudProfile | null
  syncing: boolean
  error: string | null
  set: (patch: Partial<Omit<CloudState, 'set'>>) => void
}

export const useCloud = create<CloudState>((set) => ({
  ready: !cloudEnabled,
  userId: null,
  email: null,
  profile: null,
  partner: null,
  syncing: false,
  error: null,
  set: (patch) => set(patch),
}))

const isBlank = (p: Progress) => p.xp === 0 && Object.keys(p.items).length === 0

async function adopt(userId: string, email: string | null) {
  const cloud = useCloud.getState()
  cloud.set({ userId, email, syncing: true, error: null })
  try {
    const profile = await myProfile(userId)
    cloud.set({ profile, partner: profile?.partner_id ? await myProfile(profile.partner_id) : null })
    const app = useApp.getState()
    if (!app.profiles[userId]) app.createProfile(profile?.name ?? 'Estudante', false, userId, true)
    else app.switchProfile(userId)
    const local = useApp.getState().profiles[userId].progress
    const remote = await fetchProgress(userId)
    if (remote && (isBlank(local) || remote.updatedAt > local.updatedAt)) useApp.getState().replaceProgress(remote)
    else await pushProgress(userId, local)
  } catch (e) {
    cloud.set({ error: (e as Error).message })
  } finally {
    cloud.set({ syncing: false, ready: true })
  }
}

export async function refreshCloudProfile() {
  const { userId, set } = useCloud.getState()
  if (!userId) return
  const profile = await myProfile(userId)
  set({ profile, partner: profile?.partner_id ? await myProfile(profile.partner_id) : null })
}

/** Liga o login da nuvem ao perfil local e mantém o progresso sincronizado. */
export function useCloudSync() {
  useEffect(() => {
    if (!supabase) return
    let pushTimer = 0
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) void adopt(user.id, user.email ?? null)
      else useCloud.getState().set({ ready: true })
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user && session.user.id !== useCloud.getState().userId)
        void adopt(session.user.id, session.user.email ?? null)
      if (event === 'SIGNED_OUT') {
        useCloud.getState().set({ userId: null, email: null, profile: null, partner: null })
        useApp.getState().switchProfile(null)
      }
    })
    // Envia o progresso alguns segundos depois de cada mudança.
    let lastSent = 0
    const unsub = useApp.subscribe((state) => {
      const { userId } = useCloud.getState()
      const prof = userId ? state.profiles[userId] : undefined
      if (!prof || state.activeId !== userId || prof.progress.updatedAt === lastSent) return
      window.clearTimeout(pushTimer)
      pushTimer = window.setTimeout(() => {
        lastSent = prof.progress.updatedAt
        pushProgress(userId!, useApp.getState().profiles[userId!].progress).catch((e) =>
          useCloud.getState().set({ error: (e as Error).message }),
        )
      }, 2500)
    })
    // Ao voltar para o app, busca o progresso mais novo (estudou em outro aparelho?).
    const onFocus = async () => {
      const { userId } = useCloud.getState()
      if (!userId || document.visibilityState !== 'visible') return
      const remote = await fetchProgress(userId).catch(() => null)
      const local = useApp.getState().profiles[userId]?.progress
      if (remote && local && remote.updatedAt > local.updatedAt) useApp.getState().replaceProgress(remote)
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      sub.subscription.unsubscribe()
      unsub()
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])
}
