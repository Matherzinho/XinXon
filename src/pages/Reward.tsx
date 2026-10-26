import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Icon, Jiaozi } from '../components/Icon'
import { Confetti, Mascot } from '../components/ui'
import { sfx } from '../lib/sounds'
import { useApp } from '../store/useApp'

export function Reward() {
  const result = useApp((s) => s.lastResult)
  useEffect(() => {
    sfx.complete()
  }, [])
  if (!result) return <Navigate to="/" replace />
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 100
  const title = accuracy === 100 ? 'Perfeito!' : accuracy >= 80 ? 'Sessão completa!' : 'Bom trabalho!'

  return (
    <div className="screen center" style={{ alignItems: 'center', gap: 16 }}>
      <Confetti />
      <Mascot pose="torcendo" size={220} bounce alt="Panda XinXon comemorando" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{ color: 'var(--yellow)', fontSize: 30 }}>{title}</h1>
        <span className="hz muted" style={{ fontSize: 20 }}>
          太好了！ tài hǎo le
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, width: '100%' }}>
        <div className="card" style={{ border: '2px solid var(--yellow)', padding: 12, gap: 4 }}>
          <span className="label" style={{ color: 'var(--yellow)' }}>XP</span>
          <span style={{ fontSize: 24, fontWeight: 900 }}>+{result.xp}</span>
        </div>
        <div className="card" style={{ border: '2px solid var(--orange)', padding: 12, gap: 4 }}>
          <span className="label" style={{ color: 'var(--orange)' }}>Ofensiva</span>
          <span style={{ fontSize: 24, fontWeight: 900 }}>
            {result.streak} {result.streak === 1 ? 'dia' : 'dias'}
          </span>
        </div>
        <div className="card" style={{ border: '2px solid var(--purple)', padding: 12, gap: 4 }}>
          <span className="label" style={{ color: 'var(--purple-light)' }}>Acertos</span>
          <span style={{ fontSize: 24, fontWeight: 900 }}>{accuracy}%</span>
        </div>
      </div>

      {result.streakUp && result.streak > 1 && (
        <div className="row card" style={{ width: '100%', color: 'var(--orange)', fontWeight: 800 }}>
          <Icon name="flame" /> Ofensiva subiu para {result.streak} dias!
        </div>
      )}

      <div className="card purple pop-in" style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, textAlign: 'left' }}>
        <Jiaozi size={40} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {result.chest > 0 ? (
            <>
              <strong style={{ fontSize: 17 }}>Baú surpresa!</strong>
              <span className="small">
                Você ganhou {result.coins} jiaozinhos ({result.chest} de bônus) para dar presentes.
              </span>
            </>
          ) : (
            <>
              <strong style={{ fontSize: 17 }}>+{result.coins} jiaozinhos</strong>
              <span className="small">Junte para mandar presentes para sua dupla.</span>
            </>
          )}
        </div>
      </div>

      {result.bestCombo >= 3 && <span className="chip yellow">Maior sequência: {result.bestCombo} acertos seguidos</span>}

      <div className="grow" />
      <Link to="/" className="btn block big" replace>
        Continuar
      </Link>
      <Link to="/sessao" className="btn link" replace>
        Mais uma rapidinha
      </Link>
    </div>
  )
}
