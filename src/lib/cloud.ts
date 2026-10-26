import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Progress } from '../store/types'

// Nuvem (Supabase): login, progresso sincronizado entre aparelhos e o modo dupla.
// Sem as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY o app funciona só no aparelho.

// Valores públicos do projeto (a chave publishable é feita para ficar no app; o acesso é protegido por RLS).
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://wagrkgbtbsilnkvpjnms.supabase.co'
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_IqkTOfjLe0bvBRe3ompk3w_h7mX02Ab'

export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
export const cloudEnabled = !!supabase

export interface CloudProfile {
  id: string
  name: string
  invite_code: string
  partner_id: string | null
}

export type GiftKind = 'flor' | 'cha' | 'lanterna' | 'congelar' | 'bilhete' | 'cutucada'

export interface Gift {
  id: number
  from_id: string
  to_id: string
  kind: GiftKind
  message: string | null
  created_at: string
  opened_at: string | null
}

function db() {
  if (!supabase) throw new Error('Nuvem não configurada')
  return supabase
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await db().auth.signUp({ email, password, options: { data: { name } } })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

export async function signIn(email: string, password: string) {
  const { error } = await db().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}

export async function myProfile(userId: string): Promise<CloudProfile | null> {
  const { data, error } = await db().from('profiles').select('id,name,invite_code,partner_id').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function renameCloud(userId: string, name: string) {
  await db().from('profiles').update({ name }).eq('id', userId)
}

export async function fetchProgress(userId: string): Promise<Progress | null> {
  const { data, error } = await db().from('progress').select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as Progress) ?? null
}

export async function pushProgress(userId: string, progress: Progress) {
  const { error } = await db()
    .from('progress')
    .upsert({ user_id: userId, data: progress, updated_at: new Date(progress.updatedAt).toISOString() })
  if (error) throw error
}

/** Liga sua conta à do seu par usando o código de convite dele. */
export async function linkPartner(code: string): Promise<string> {
  const { data, error } = await db().rpc('link_partner', { code: code.trim().toUpperCase() })
  if (error) throw error
  return data as string
}

export async function partnerInfo(partnerId: string): Promise<{ profile: CloudProfile | null; progress: Progress | null }> {
  const [profile, progress] = await Promise.all([myProfile(partnerId), fetchProgress(partnerId)])
  return { profile, progress }
}

export async function sendGift(fromId: string, toId: string, kind: GiftKind, message?: string) {
  const { error } = await db().from('gifts').insert({ from_id: fromId, to_id: toId, kind, message: message ?? null })
  if (error) throw error
}

export async function inbox(userId: string): Promise<Gift[]> {
  const { data, error } = await db()
    .from('gifts')
    .select('*')
    .eq('to_id', userId)
    .is('opened_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Gift[]
}

export async function recentGifts(userId: string): Promise<Gift[]> {
  const { data, error } = await db()
    .from('gifts')
    .select('*')
    .or(`to_id.eq.${userId},from_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as Gift[]
}

export async function openGift(id: number) {
  await db().from('gifts').update({ opened_at: new Date().toISOString() }).eq('id', id)
}
