import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { BottomNav, Pinyin } from '../components/ui'
import { ITEMS } from '../content'
import { askProf, loadChat, ProfError, saveChat, speakZh, type ChatMsg, type Suggestion, type ZhPart } from '../lib/prof'
import { sfx } from '../lib/sounds'
import { listen, recognitionSupported, stopSpeaking, unlockAudio } from '../lib/speech'
import { useApp, useProfile } from '../store/useApp'

const uid = () => Math.random().toString(36).slice(2, 10)

const QUICK = ['O que você disse?', 'Como eu respondo?', 'Mais devagar e mais simples, por favor']

function ZhBubble({ part, canListen }: { part: ZhPart; canListen: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="bubble prof">
      <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
        <div className="grow">
          <div className="hz" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.25 }}>
            {part.hanzi}
          </div>
          <Pinyin text={part.pinyin} size={15} />
        </div>
        {canListen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button type="button" className="icon-btn" aria-label="Ouvir" onClick={() => speakZh(part.hanzi)} style={{ color: 'var(--purple-light)' }}>
              <Icon name="speaker" />
            </button>
            <button type="button" className="icon-btn" aria-label="Ouvir bem devagar" onClick={() => speakZh(part.hanzi, true)} style={{ color: 'var(--purple-light)' }}>
              <Icon name="turtle" />
            </button>
          </div>
        )}
      </div>
      {show ? (
        <div className="small" style={{ color: 'var(--yellow)', fontWeight: 700 }}>
          {part.pt}
        </div>
      ) : (
        <button type="button" className="btn link" style={{ minHeight: 32, padding: 0, fontSize: 14, justifyContent: 'flex-start' }} onClick={() => setShow(true)}>
          Ver tradução
        </button>
      )}
    </div>
  )
}

/** Prof. Zhonghua: conversa com IA que fala chinês e português. */
export function Prof() {
  const profile = useProfile()!
  const addXp = useApp((s) => s.addCoins)
  const canListen = profile.settings.canListen
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => loadChat(profile.id))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ status: number; text: string } | null>(null)
  const [micLang, setMicLang] = useState<'zh-CN' | 'pt-BR'>('zh-CN')
  const [listening, setListening] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const known = Object.keys(profile.progress.items)
    .map((id) => ITEMS[id])
    .filter((i) => i?.kind === 'word')
    .map((i) => (i.kind === 'word' ? i.word.hanzi : ''))

  useEffect(() => {
    saveChat(profile.id, msgs)
  }, [msgs, profile.id])
  useEffect(() => {
    // (scrollIntoView devolve uma Promise em navegadores novos: não pode ser o retorno do efeito)
    void endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, busy])
  useEffect(() => () => stopSpeaking(), [])

  const send = async (text: string | null) => {
    if (busy) return
    unlockAudio()
    const next = text ? [...msgs, { id: uid(), role: 'user' as const, text }] : msgs
    setMsgs(next)
    setInput('')
    setBusy(true)
    setError(null)
    try {
      const { parts, suggestions } = await askProf(next, known, profile.name)
      setMsgs([...next, { id: uid(), role: 'prof', parts, suggestions }])
      sfx.tap()
      // Mensagem em chinês do aluno vale um jiaozinho.
      if (text && /[一-鿿]|\b(ni|wo|hao|shi|ma|ne)\b/i.test(text)) addXp(1)
      const firstZh = parts.find((p): p is ZhPart => p.tipo === 'zh')
      if (canListen && firstZh) void speakZh(firstZh.hanzi)
    } catch (e) {
      const status = e instanceof ProfError ? e.status : 0
      setError({ status, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  // Primeira visita: o Prof começa a conversa (uma vez só).
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!msgs.length) void send(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickSuggestion = (s: Suggestion) => {
    setInput(s.hanzi)
    if (canListen) void speakZh(s.hanzi)
  }

  const mic = () => {
    if (listening) return
    setListening(true)
    listen(micLang, 8000)
      .result.then((alts) => {
        if (alts[0]) setInput((cur) => (cur ? `${cur} ${alts[0]}` : alts[0]))
      })
      .catch(() => setError({ status: 0, text: 'O microfone não funcionou neste navegador. Pode digitar (até pinyin sem acento funciona!).' }))
      .finally(() => setListening(false))
  }

  const last = msgs[msgs.length - 1]
  const canMic = recognitionSupported() && profile.settings.canSpeak

  return (
    <div className="screen with-nav prof-screen">
      <header className="row">
        <img src="/mascote/panda-pensando.png" alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />
        <div className="grow">
          <h2>
            Prof. Zhonghua <span className="hz muted" style={{ fontSize: 15 }}>中华老师</span>
          </h2>
          <span className="small muted">Fala chinês e português. Pode perguntar qualquer coisa!</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Nova conversa"
          title="Nova conversa"
          onClick={() => {
            setMsgs([])
            setTimeout(() => send(null), 0)
          }}
        >
          <Icon name="refresh" />
        </button>
      </header>

      <div className="chat">
        {msgs.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble me">
              {m.text}
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(m.parts ?? []).map((p, i) =>
                p.tipo === 'zh' ? (
                  <ZhBubble key={i} part={p} canListen={canListen} />
                ) : (
                  <div key={i} className="bubble prof">
                    {p.texto}
                  </div>
                ),
              )}
            </div>
          ),
        )}
        {busy && (
          <div className="bubble prof typing" aria-label="O Prof está escrevendo">
            <span />
            <span />
            <span />
          </div>
        )}
        {error && (
          <div className="card outline-red small">
            {error.status === 503 ? (
              <>
                <strong>O Prof. Zhonghua ainda não foi ligado.</strong>
                <span>Falta colocar a chave gratuita do Google Gemini no servidor (variável GEMINI_API_KEY na Vercel).</span>
              </>
            ) : error.status === 429 ? (
              <span>O Prof está atendendo muita gente agora. Espera um minutinho e tenta de novo.</span>
            ) : (
              <span>{error.status ? 'Não consegui falar com o Prof agora. Tenta de novo.' : error.text}</span>
            )}
            {error.status !== 503 && (
              <button type="button" className="btn ghost" onClick={() => send(null)}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer">
        {last?.role === 'prof' && !!last.suggestions?.length && !busy && (
          <div className="suggestions">
            <span className="tiny muted">Você pode responder:</span>
            {last.suggestions.map((s, i) => (
              <button key={i} type="button" className="suggestion" onClick={() => pickSuggestion(s)}>
                <span className="hz">{s.hanzi}</span>
                <Pinyin text={s.pinyin} size={12} />
                <span className="tiny muted">{s.pt}</span>
              </button>
            ))}
          </div>
        )}
        <div className="quick">
          {QUICK.map((q) => (
            <button key={q} type="button" className="chip" disabled={busy} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="row"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) void send(input.trim())
          }}
        >
          {canMic && (
            <>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setMicLang(micLang === 'zh-CN' ? 'pt-BR' : 'zh-CN')}
                aria-label={`Idioma do microfone: ${micLang === 'zh-CN' ? 'chinês' : 'português'}`}
                style={{ fontWeight: 900, color: 'var(--yellow)', width: 36 }}
              >
                {micLang === 'zh-CN' ? '中' : 'PT'}
              </button>
              <button type="button" className={`icon-btn${listening ? ' listening-btn' : ''}`} aria-label="Falar" onClick={mic}>
                <Icon name="mic" />
              </button>
            </>
          )}
          <input
            className="input grow"
            style={{ minWidth: 0 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva em chinês, pinyin ou português…"
            maxLength={300}
            aria-label="Mensagem para o Prof"
          />
          <button type="submit" className="btn" style={{ minHeight: 52, padding: '0 16px' }} disabled={!input.trim() || busy} aria-label="Enviar">
            <Icon name="arrow" />
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  )
}
