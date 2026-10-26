import { useEffect, useRef, useState } from 'react'
import { callInstructions, LiveCall, type CallState } from '../lib/call'
import { Icon } from './Icon'

export interface CallLine {
  role: 'user' | 'prof'
  text: string
}

const STATUS: Record<CallState, string> = {
  conectando: 'Ligando…',
  ouvindo: 'Pode falar, estou ouvindo',
  falando: 'Prof falando…',
  encerrada: 'Ligação encerrada',
  erro: 'Não deu certo',
}

/** Tela de ligação com o Prof (voz em tempo real). */
export function CallScreen({ name, known, onEnd }: { name: string; known: string[]; onEnd: (lines: CallLine[]) => void }) {
  const [state, setState] = useState<CallState>('conectando')
  const [lines, setLines] = useState<CallLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const call = useRef<LiveCall | null>(null)
  const linesRef = useRef<CallLine[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const c = new LiveCall(callInstructions(name, known), {
      onState: setState,
      onError: setError,
      onTranscript: (role, text, final) => {
        if (final || !text) return
        const cur = linesRef.current
        const last = cur[cur.length - 1]
        const next = last && last.role === role ? [...cur.slice(0, -1), { role, text: last.text + text }] : [...cur, { role, text: text.trimStart() }]
        linesRef.current = next
        setLines(next)
      },
    })
    call.current = c
    void c.start()
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state === 'encerrada' || state === 'erro' || state === 'conectando') return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [state])

  useEffect(() => {
    void endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lines])

  const hangUp = () => {
    call.current?.stop()
    onEnd(linesRef.current)
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="call" role="dialog" aria-label="Ligação com o Prof. Zhonghua">
      <div className="call-head">
        <div className={`call-avatar${state === 'falando' ? ' speaking' : ''}${state === 'ouvindo' ? ' listening' : ''}`}>
          <img src="/mascote/panda-pensando.png" alt="" />
        </div>
        <h2>Prof. Zhonghua</h2>
        <span className="muted small">
          {error ?? STATUS[state]}
          {state !== 'conectando' && !error ? ` · ${mm}:${ss}` : ''}
        </span>
      </div>

      <div className="call-transcript" aria-live="polite">
        {lines.map((l, i) => (
          <p key={i} className={l.role === 'user' ? 'me' : 'prof'}>
            <strong>{l.role === 'user' ? 'Você' : 'Prof'}:</strong> {l.text}
          </p>
        ))}
        {!lines.length && !error && (
          <p className="muted small center">
            Fale normalmente, em chinês ou em português. Pode pedir para ele repetir, ir mais devagar ou explicar.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="call-actions">
        {!error && (
          <button
            type="button"
            className={`call-btn${muted ? ' off' : ''}`}
            aria-label={muted ? 'Ligar microfone' : 'Silenciar microfone'}
            onClick={() => {
              setMuted(!muted)
              call.current?.setMuted(!muted)
            }}
          >
            <Icon name={muted ? 'mic-off' : 'mic'} size={28} />
          </button>
        )}
        {!error && state !== 'conectando' && (
          <button type="button" className="call-btn" aria-label="Pedir para repetir mais devagar" onClick={() => call.current?.sendText('Pode repetir mais devagar, por favor?')}>
            <Icon name="turtle" size={28} />
          </button>
        )}
        <button type="button" className="call-btn hang" aria-label="Desligar" onClick={hangUp}>
          <Icon name="phone" size={30} />
        </button>
      </div>
    </div>
  )
}
