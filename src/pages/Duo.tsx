import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GIFT_NAMES } from '../components/GiftInbox'
import { GiftArt, Icon, Jiaozi } from '../components/Icon'
import { Bar, BottomNav, Mascot, Toast } from '../components/ui'
import { cloudEnabled, linkPartner, partnerInfo, recentGifts, sendGift, type Gift, type GiftKind } from '../lib/cloud'
import { addDays, currentWeek, dayKey } from '../lib/date'
import { sfx } from '../lib/sounds'
import { refreshCloudProfile, useCloud } from '../lib/useCloudSync'
import { streakToday, useApp, useProfile } from '../store/useApp'
import type { Progress } from '../store/types'

const SHOP: { kind: GiftKind; name: string; price: number }[] = [
  { kind: 'flor', name: 'Flor', price: 30 },
  { kind: 'cha', name: 'Chá de bolha', price: 50 },
  { kind: 'lanterna', name: 'Lanterna', price: 80 },
  { kind: 'congelar', name: 'Congelar ofensiva', price: 100 },
]

function week(p: Progress) {
  const days = currentWeek()
  return days.reduce((acc, d) => ({ xp: acc.xp + (p.days[d]?.xp ?? 0), sessions: acc.sessions + (p.days[d]?.sessions ?? 0) }), { xp: 0, sessions: 0 })
}

/** Dias seguidos em que os dois estudaram. */
function coupleStreak(a: Progress, b: Progress) {
  const both = (d: string) => (a.days[d]?.sessions ?? 0) > 0 && (b.days[d]?.sessions ?? 0) > 0
  let d = dayKey()
  if (!both(d)) d = addDays(d, -1)
  let n = 0
  while (both(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

function Scoreboard({ people }: { people: { name: string; progress: Progress; me?: boolean }[] }) {
  const rows = people.map((p) => ({ ...p, w: week(p.progress) }))
  const max = Math.max(1, ...rows.map((r) => r.w.xp))
  return (
    <div className="card purple">
      <div className="spread">
        <span className="label" style={{ color: 'var(--purple-light)' }}>
          Placar da semana
        </span>
        {people.length === 2 && (
          <span className="stat fire small">
            <Icon name="flame" size={16} /> Ofensiva do casal: {coupleStreak(people[0].progress, people[1].progress)}
          </span>
        )}
      </div>
      {rows.map((r, i) => (
        <div key={r.name + i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="spread" style={{ fontWeight: 800 }}>
            <span>
              {r.name}
              {r.me ? ' (você)' : ''}
            </span>
            <span className="small">
              {r.w.xp} XP · {r.w.sessions} {r.w.sessions === 1 ? 'lição' : 'lições'} · <Icon name="flame" size={14} /> {streakToday(r.progress).count}
            </span>
          </div>
          <Bar value={r.w.xp / max} color={i === 0 ? 'red' : undefined} />
        </div>
      ))}
    </div>
  )
}

export function Duo() {
  const profile = useProfile()!
  const profiles = useApp((s) => s.profiles)
  const spendCoins = useApp((s) => s.spendCoins)
  const { userId, profile: cloudProfile, partner } = useCloud()
  const [partnerProgress, setPartnerProgress] = useState<Progress | null>(null)
  const [history, setHistory] = useState<Gift[]>([])
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const partnerId = cloudProfile?.partner_id ?? null

  useEffect(() => {
    if (!partnerId || !userId) return
    partnerInfo(partnerId).then((r) => setPartnerProgress(r.progress)).catch(() => {})
    recentGifts(userId).then(setHistory).catch(() => {})
  }, [partnerId, userId])

  const send = async (kind: GiftKind, price = 0, message?: string) => {
    if (!userId || !partnerId || busy) return
    if (kind === 'cutucada') {
      const k = `xinxon-cutucada-${dayKey()}`
      if (localStorage.getItem(k)) return setToast('Você já cutucou hoje. Amanhã tem mais!')
      localStorage.setItem(k, '1')
    }
    if (price && !spendCoins(price)) return setToast('Jiaozinhos insuficientes. Estude mais um pouco!')
    setBusy(true)
    try {
      await sendGift(userId, partnerId, kind, message)
      sfx.coin()
      setToast(`Você mandou ${GIFT_NAMES[kind]} para ${partner?.name ?? 'sua dupla'}!`)
      setNote('')
      setHistory(await recentGifts(userId))
    } catch {
      setToast('Não consegui enviar agora. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const link = async () => {
    setBusy(true)
    try {
      const name = await linkPartner(code)
      await refreshCloudProfile()
      setToast(`Pronto! Agora você e ${name} são uma dupla.`)
    } catch (e) {
      setToast((e as Error).message.includes('não encontrado') ? 'Código não encontrado.' : 'Não deu certo. Confira o código.')
    } finally {
      setBusy(false)
    }
  }

  // ---------- Sem nuvem: placar entre os perfis deste aparelho ----------
  if (!cloudEnabled || !userId) {
    const locals = Object.values(profiles).map((p) => ({ name: p.name, progress: p.progress, me: p.id === profile.id }))
    return (
      <div className="screen with-nav">
        <h1>Dupla</h1>
        {locals.length > 1 ? <Scoreboard people={locals} /> : null}
        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Mascot pose="pensando" size={150} />
          <h2>Estude junto com sua dupla</h2>
          <p className="muted small">
            {cloudEnabled
              ? 'Entre com uma conta para ligar seu perfil ao da sua dupla, ver o placar da semana e mandar presentinhos.'
              : 'O modo dupla completo (placar entre celulares, cutucadas e presentes) liga quando a nuvem do app estiver configurada. Enquanto isso, dá para criar dois perfis neste aparelho e comparar o placar.'}
          </p>
          <Link to="/perfil" className="btn block">
            {cloudEnabled ? 'Entrar ou criar conta' : 'Ir para o perfil'}
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  // ---------- Com nuvem, ainda sem par ----------
  if (!partnerId) {
    return (
      <div className="screen with-nav">
        <h1>Dupla</h1>
        <div className="card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Mascot pose="pensando" size={140} />
          <h2>Ligue sua conta à da sua dupla</h2>
          <p className="muted small">Mande seu código para ela (ou ele) digitar, ou digite o código que você recebeu.</p>
          <span className="label">Seu código</span>
          <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: 6, color: 'var(--yellow)' }}>{cloudProfile?.invite_code}</span>
        </div>
        <div className="card">
          <div className="field">
            <label htmlFor="code">Código da sua dupla</label>
            <input id="code" className="input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="EX.: 4F2A9C" autoCapitalize="characters" />
          </div>
          <button type="button" className="btn block purple" disabled={code.length < 6 || busy} onClick={link}>
            Ligar contas
          </button>
        </div>
        {toast && <Toast text={toast} onDone={() => setToast(null)} />}
        <BottomNav />
      </div>
    )
  }

  // ---------- Dupla completa ----------
  return (
    <div className="screen with-nav">
      <div className="spread">
        <h1>Dupla</h1>
        <span className="stat gold">
          <Jiaozi /> {profile.progress.coins}
        </span>
      </div>
      <Scoreboard
        people={[{ name: profile.name, progress: profile.progress, me: true }, ...(partnerProgress ? [{ name: partner?.name ?? 'Dupla', progress: partnerProgress }] : [])]}
      />

      <button type="button" className="btn ghost block" disabled={busy} onClick={() => send('cutucada')} style={{ borderColor: 'var(--purple)' }}>
        <Icon name="hand" /> Cutucar: <span className="hz">加油！</span> bora estudar
      </button>

      <h2>Mandar um presentinho</h2>
      <div className="gift-grid">
        {SHOP.map((g) => (
          <button key={g.kind} type="button" className="gift" disabled={busy || profile.progress.coins < g.price} onClick={() => send(g.kind, g.price)}>
            <GiftArt kind={g.kind} />
            <span>{g.name}</span>
            <span className="price">
              {g.price} <Jiaozi size={14} />
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="note">Bilhetinho (tente usar chinês!)</label>
          <input id="note" className="input hz" value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="我爱你 · wǒ ài nǐ" />
        </div>
        <button type="button" className="btn block" disabled={!note.trim() || busy} onClick={() => send('bilhete', 0, note.trim())}>
          Enviar bilhete
        </button>
      </div>

      {history.length > 0 && (
        <div className="card">
          <span className="label">Mural da dupla</span>
          {history.slice(0, 8).map((g) => (
            <div key={g.id} className="row small">
              <GiftArt kind={g.kind} size={26} />
              <span className="grow">
                {g.from_id === userId ? 'Você mandou' : `${partner?.name ?? 'Sua dupla'} mandou`} {GIFT_NAMES[g.kind]}
                {g.message ? `: “${g.message}”` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
      <BottomNav />
    </div>
  )
}
