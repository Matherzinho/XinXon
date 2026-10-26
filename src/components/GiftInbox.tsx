import { useEffect, useState } from 'react'
import { inbox, openGift, type Gift } from '../lib/cloud'
import { sfx } from '../lib/sounds'
import { useCloud } from '../lib/useCloudSync'
import { useApp } from '../store/useApp'
import { GiftArt } from './Icon'
import { Confetti, Overlay } from './ui'

export const GIFT_NAMES: Record<string, string> = {
  flor: 'uma flor',
  cha: 'um chá de bolha',
  lanterna: 'uma lanterna chinesa',
  congelar: 'um congelamento de ofensiva',
  bilhete: 'um bilhetinho',
  cutucada: 'uma cutucada',
}

/** Mostra os presentes recebidos da dupla (só com a nuvem ligada). */
export function GiftInbox() {
  const userId = useCloud((s) => s.userId)
  const partnerName = useCloud((s) => s.partner?.name ?? 'Sua dupla')
  const addFreezes = useApp((s) => s.addFreezes)
  const [gifts, setGifts] = useState<Gift[]>([])
  const [opening, setOpening] = useState<Gift | null>(null)

  useEffect(() => {
    if (!userId) return
    const load = () => inbox(userId).then(setGifts).catch(() => {})
    void load()
    const id = window.setInterval(load, 60_000)
    return () => window.clearInterval(id)
  }, [userId])

  if (!userId || !gifts.length) return null

  const open = async () => {
    const g = gifts[0]
    setOpening(g)
    sfx.complete()
    if (g.kind === 'congelar') addFreezes(1)
    await openGift(g.id).catch(() => {})
  }
  const close = () => {
    setGifts(gifts.slice(1))
    setOpening(null)
  }

  return (
    <>
      <button
        type="button"
        className="card purple pop-in"
        style={{ border: '2px solid var(--purple)', flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}
        onClick={open}
      >
        <GiftArt kind={gifts[0].kind} size={40} />
        <span style={{ fontWeight: 800 }}>
          {gifts.length === 1 ? 'Você recebeu um presente!' : `Você recebeu ${gifts.length} presentes!`} Toque para abrir.
        </span>
      </button>
      {opening && (
        <>
          <Confetti count={40} />
          <Overlay onClose={close}>
            <GiftArt kind={opening.kind} size={96} />
            <h2>
              {partnerName} te mandou {GIFT_NAMES[opening.kind] ?? 'um presente'}!
            </h2>
            {opening.message && (
              <p className="hz" style={{ fontSize: 20 }}>
                “{opening.message}”
              </p>
            )}
            {opening.kind === 'congelar' && <p className="muted small">+1 congelamento: sua ofensiva está protegida por um dia.</p>}
            <button type="button" className="btn block" onClick={close}>
              Oba!
            </button>
          </Overlay>
        </>
      )}
    </>
  )
}
