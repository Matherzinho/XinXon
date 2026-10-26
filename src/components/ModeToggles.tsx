import { Icon } from './Icon'

export function modeName(canListen: boolean, canSpeak: boolean) {
  if (canListen && canSpeak) return { name: 'Turbo', desc: 'estilo Pimsleur: ouvir, responder falando e repetir.' }
  if (canListen) return { name: 'Escuta', desc: 'ouvir, ditado e treino de tons.' }
  if (canSpeak) return { name: 'Fala', desc: 'ler a frase e falar em voz alta.' }
  return { name: 'Silencioso', desc: 'ler, montar frases e traçar caracteres.' }
}

export function ModeToggles({
  canListen,
  canSpeak,
  onChange,
  compact,
}: {
  canListen: boolean
  canSpeak: boolean
  onChange: (patch: { canListen?: boolean; canSpeak?: boolean }) => void
  compact?: boolean
}) {
  if (compact)
    return (
      <div className="row" style={{ gap: 4 }}>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={canListen}
          aria-label={canListen ? 'Desligar áudio' : 'Ligar áudio'}
          onClick={() => onChange({ canListen: !canListen })}
          style={{ color: canListen ? 'var(--purple-light)' : undefined }}
        >
          <Icon name={canListen ? 'headphones' : 'headphones-off'} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={canSpeak}
          aria-label={canSpeak ? 'Desligar fala' : 'Ligar fala'}
          onClick={() => onChange({ canSpeak: !canSpeak })}
          style={{ color: canSpeak ? 'var(--purple-light)' : undefined }}
        >
          <Icon name={canSpeak ? 'mic' : 'mic-off'} />
        </button>
      </div>
    )
  const mode = modeName(canListen, canSpeak)
  return (
    <div className="card">
      <span className="small muted" style={{ fontWeight: 800 }}>
        Como você pode estudar agora?
      </span>
      <div className="mode-grid">
        <button type="button" className={`mode-btn${canListen ? ' on' : ''}`} aria-pressed={canListen} onClick={() => onChange({ canListen: !canListen })}>
          <Icon name={canListen ? 'headphones' : 'headphones-off'} size={26} />
          {canListen ? 'Posso ouvir' : 'Sem áudio'}
        </button>
        <button type="button" className={`mode-btn${canSpeak ? ' on' : ''}`} aria-pressed={canSpeak} onClick={() => onChange({ canSpeak: !canSpeak })}>
          <Icon name={canSpeak ? 'mic' : 'mic-off'} size={26} />
          {canSpeak ? 'Posso falar' : 'Sem falar'}
        </button>
      </div>
      <span className="small muted">
        Modo <strong style={{ color: 'var(--purple-light)' }}>{mode.name}</strong>: {mode.desc}
      </span>
    </div>
  )
}
