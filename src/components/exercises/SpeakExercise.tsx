import { useEffect, useRef, useState } from 'react'
import type { Sentence, Word } from '../../content'
import { bestMatch, listen, recognitionSupported, speak, type ListenHandle } from '../../lib/speech'
import { Icon } from '../Icon'
import { SpeakerButton } from '../ui'
import type { ExerciseProps } from './types'

type Phase = 'ask' | 'answer' | 'reveal' | 'judge'

function target(step: ExerciseProps['step']): { hanzi: string; pinyin: string; pt: string } {
  const item = step.item
  if (item.kind === 'sentence') {
    const s: Sentence = item.sentence
    return { hanzi: s.hanzi, pinyin: s.pinyin, pt: s.pt }
  }
  const w = (item as { word: Word }).word
  return { hanzi: w.hanzi, pinyin: w.pinyin, pt: w.pt }
}

/**
 * Falar em voz alta.
 * - speak: lê a frase e fala (reconhecimento de voz ou autoavaliação).
 * - pimsleur: ouve "como se diz X?", tem uns segundos para responder falando, depois ouve a resposta certa.
 */
export function SpeakExercise({ step, mode, locked, onAnswer, onSkip }: ExerciseProps) {
  const t = target(step)
  const pimsleur = step.kind === 'pimsleur'
  const canRecognize = recognitionSupported()
  const [phase, setPhase] = useState<Phase>(pimsleur ? 'ask' : 'answer')
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const handle = useRef<ListenHandle | null>(null)
  const reveal = { hanzi: t.hanzi, pinyin: t.pinyin, pt: t.pt }

  // Pimsleur: pergunta em português, depois espera a resposta.
  useEffect(() => {
    if (!pimsleur) return
    let cancelled = false
    ;(async () => {
      await speak(`Como se diz: ${t.pt}?`, 'pt-BR')
      if (cancelled) return
      setPhase('answer')
      if (canRecognize) startListening()
      else {
        setCountdown(4)
      }
    })()
    return () => {
      cancelled = true
      handle.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.key])

  // Contagem regressiva para responder (quando não há reconhecimento de voz).
  useEffect(() => {
    if (countdown <= 0) return
    const id = window.setTimeout(() => {
      if (countdown === 1) void showAnswer()
      setCountdown(countdown - 1)
    }, 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  async function showAnswer(score?: number) {
    setPhase('reveal')
    if (mode.canListen) await speak(t.hanzi)
    if (score !== undefined) {
      onAnswer(score >= 0.5, reveal)
      setPhase('judge')
    } else setPhase('judge')
  }

  function startListening() {
    if (listening) return
    setHeard(null)
    setListening(true)
    const h = listen('zh-CN', Math.max(4500, t.hanzi.length * 900))
    handle.current = h
    h.result
      .then((alts) => {
        setListening(false)
        if (!alts.length) return void showAnswer() // não ouviu nada: autoavaliação
        setHeard(alts[0])
        void showAnswer(bestMatch(alts, t.hanzi))
      })
      .catch(() => {
        setListening(false)
        // Sem permissão de microfone ou erro: cai na autoavaliação.
        void showAnswer()
      })
  }

  const autoGraded = heard !== null
  const showText = !pimsleur || phase === 'reveal' || phase === 'judge'

  return (
    <div className="screen" style={{ padding: 0, gap: 18 }}>
      <h2>{pimsleur ? 'Como se diz em chinês?' : 'Fale em voz alta'}</h2>

      {pimsleur && (
        <div className="card purple center" style={{ fontSize: 22, fontWeight: 900 }}>
          “{t.pt}”
        </div>
      )}

      {showText && (
        <div className="pop-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div className={`prompt-hz${t.hanzi.length > 4 ? ' sm' : ''}`}>{t.hanzi}</div>
          <div className="prompt-py">{t.pinyin}</div>
          {!pimsleur && <div className="muted">{t.pt}</div>}
          {mode.canListen && <SpeakerButton text={t.hanzi} small label="Ouvir o modelo" />}
        </div>
      )}

      {phase === 'ask' && <p className="center muted">Escute a pergunta…</p>}

      {phase === 'answer' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {canRecognize ? (
            <>
              <button type="button" className={`mic${listening ? ' listening' : ''}`} onClick={startListening} aria-label="Falar agora" disabled={locked}>
                <Icon name="mic" size={44} />
              </button>
              <p className="muted center">{listening ? 'Estou ouvindo… fale agora!' : 'Toque no microfone e fale'}</p>
            </>
          ) : (
            <>
              <p className="center" style={{ fontWeight: 800 }}>
                {pimsleur ? `Responda em voz alta! ${countdown > 0 ? countdown : ''}` : 'Leia em voz alta e depois confira.'}
              </p>
              <button type="button" className="btn yellow" onClick={() => showAnswer()}>
                {pimsleur ? 'Ver resposta' : 'Já falei!'}
              </button>
            </>
          )}
        </div>
      )}

      {phase === 'judge' && !autoGraded && !locked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="center" style={{ fontWeight: 800 }}>
            {mode.canListen ? 'Ficou parecido com o modelo?' : 'Você conseguiu falar?'}
          </p>
          <div className="choices two">
            <button type="button" className="btn green" onClick={() => onAnswer(true, reveal)}>
              Acertei
            </button>
            <button type="button" className="btn ghost" onClick={() => onAnswer(false, reveal)}>
              Errei
            </button>
          </div>
        </div>
      )}

      {autoGraded && heard !== null && (
        <p className="center muted small">
          Ouvi: <span className="hz">{heard || '(nada)'}</span>
        </p>
      )}

      {!locked && phase !== 'judge' && (
        <button type="button" className="btn link" onClick={onSkip}>
          Não posso falar agora
        </button>
      )}
    </div>
  )
}
