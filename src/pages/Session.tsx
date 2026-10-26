import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuildExercise } from '../components/exercises/BuildExercise'
import { ChoiceExercise } from '../components/exercises/ChoiceExercise'
import { IntroCard, TipCard } from '../components/exercises/Intro'
import { QuizExercise } from '../components/exercises/QuizExercise'
import { SpeakExercise } from '../components/exercises/SpeakExercise'
import { ToneExercise } from '../components/exercises/ToneExercise'
import type { Reveal } from '../components/exercises/types'
import { WriteExercise } from '../components/exercises/WriteExercise'
import { Icon } from '../components/Icon'
import { ModeToggles } from '../components/ModeToggles'
import { Bar, Overlay, Pinyin, SpeakerButton } from '../components/ui'
import { buildSession, chooseKind, retryStep, type ExerciseKind, type Mode, type Step } from '../lib/session'
import { sfx } from '../lib/sounds'
import { stopSpeaking } from '../lib/speech'
import { useApp, useProfile } from '../store/useApp'

const NEEDS_AUDIO: ExerciseKind[] = ['listen', 'dictation', 'pimsleur']
const NEEDS_VOICE: ExerciseKind[] = ['speak', 'pimsleur']

/** Se o modo mudou no meio da sessão, troca exercícios que precisam de áudio/fala. */
function adapt(step: Step, mode: Mode, box: number): Step {
  if (step.type !== 'exercise') return step
  const blocked = (!mode.canListen && NEEDS_AUDIO.includes(step.kind)) || (!mode.canSpeak && NEEDS_VOICE.includes(step.kind))
  if (!blocked) return step
  let kind = chooseKind(step.item, box, mode, 'review')
  for (let i = 0; i < 6 && ((!mode.canListen && NEEDS_AUDIO.includes(kind)) || (!mode.canSpeak && NEEDS_VOICE.includes(kind))); i++)
    kind = chooseKind(step.item, box, mode, 'review')
  return { ...step, kind, key: `${step.key}a` }
}

const PRAISE = ['Isso aí!', 'Mandou bem!', '太好了！Perfeito!', 'Arrasou!', 'Muito bom!', 'Certinho!']
const ENCOURAGE = ['Quase!', 'Tudo bem, faz parte!', 'Vamos ver de novo daqui a pouco.']

export function Session() {
  const profile = useProfile()!
  const navigate = useNavigate()
  const { recordAnswer, markTipsSeen, finishSession, updateSettings } = useApp()
  const mode: Mode = { canListen: profile.settings.canListen, canSpeak: profile.settings.canSpeak }
  const items = profile.progress.items

  // A fila é montada uma vez por sessão.
  const initial = useMemo(() => buildSession(profile.progress, profile.settings, mode), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [queue, setQueue] = useState<Step[]>(initial)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<{ correct: boolean; reveal: Reveal; text: string } | null>(null)
  const [combo, setCombo] = useState(0)
  const [exiting, setExiting] = useState(false)
  const stats = useRef({ xp: 0, coins: 0, correct: 0, total: 0, bestCombo: 0, newItems: 0, start: Date.now() })
  const tipLesson = initial.find((s) => s.type === 'tip')?.lesson.id

  const step = queue[index]
  const tips = queue.filter((s) => s.type === 'tip')

  useEffect(() => () => stopSpeaking(), [])

  // Mudou o modo (ligou/desligou áudio ou fala)? Ajusta os exercícios que ainda vão aparecer.
  useEffect(() => {
    setQueue((q) =>
      q.map((s, i) => {
        if (i < index || (i === index && answer)) return s
        return adapt(s, mode, s.type === 'exercise' ? items[s.item.id]?.box ?? 0 : 0)
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.canListen, mode.canSpeak])

  const finish = () => {
    stopSpeaking()
    if (tipLesson) markTipsSeen(tipLesson)
    const s = stats.current
    const perfect = s.total > 0 && s.correct === s.total
    finishSession({
      xp: s.xp + 10 + (perfect ? 20 : 0),
      coins: s.coins + 5,
      correct: s.correct,
      total: s.total,
      bestCombo: s.bestCombo,
      newItems: s.newItems,
      minutes: Math.max(1, Math.round((Date.now() - s.start) / 60000)),
    })
    navigate('/recompensa', { replace: true })
  }

  const next = () => {
    stopSpeaking()
    setAnswer(null)
    if (index + 1 >= queue.length) finish()
    else setIndex(index + 1)
  }

  const onAnswer = (correct: boolean, reveal: Reveal) => {
    if (!step || step.type !== 'exercise' || answer) return
    const s = stats.current
    const isNew = !items[step.item.id]
    recordAnswer(step.item.id, correct)
    s.total++
    if (isNew) s.newItems++
    if (correct) {
      const c = combo + 1
      setCombo(c)
      s.correct++
      s.xp += 10 + (c >= 3 ? 5 : 0)
      s.coins += 1
      s.bestCombo = Math.max(s.bestCombo, c)
      sfx.correct(c)
      setAnswer({ correct, reveal, text: c >= 3 ? `${c} seguidas!` : PRAISE[Math.floor(Math.random() * PRAISE.length)] })
    } else {
      setCombo(0)
      sfx.wrong()
      setAnswer({ correct, reveal, text: ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)] })
      // Errou: o item volta um pouco mais para frente (uma vez só).
      if (!step.retry) {
        const q = [...queue]
        q.splice(Math.min(index + 3, q.length), 0, retryStep(step, mode))
        setQueue(q)
      }
    }
  }

  const onSkip = () => {
    if (!step || step.type !== 'exercise') return
    // Desliga a fala; o efeito acima troca este exercício por outro equivalente.
    updateSettings({ canSpeak: false })
  }

  if (!step) {
    return (
      <div className="screen center">
        <h2>Nada para estudar agora!</h2>
        <button type="button" className="btn" onClick={() => navigate('/')}>
          Voltar
        </button>
      </div>
    )
  }

  const box = step.type === 'exercise' ? items[step.item.id]?.box ?? 0 : 0
  const progress = index / queue.length

  return (
    <div className="screen" style={{ gap: 18 }}>
      <div className="session-top">
        <button type="button" className="icon-btn" aria-label="Sair da sessão" onClick={() => setExiting(true)}>
          <Icon name="close" />
        </button>
        <div className="grow">
          <Bar value={progress} />
        </div>
        <ModeToggles compact canListen={mode.canListen} canSpeak={mode.canSpeak} onChange={updateSettings} />
        <span className={`combo${combo >= 3 ? ' hot' : ''}`} key={combo}>
          {combo >= 2 ? `x${combo}` : ''}
        </span>
      </div>

      <div key={step.key} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {step.type === 'tip' && (
          <TipCard tip={step.tip} canListen={mode.canListen} onNext={next} index={tips.indexOf(step)} total={tips.length} />
        )}
        {step.type === 'intro' && <IntroCard item={step.item} canListen={mode.canListen} onNext={next} />}
        {step.type === 'exercise' && renderExercise(step, { mode, box, locked: !!answer, onAnswer, onSkip })}
      </div>

      {answer && (
        <div className={`feedback ${answer.correct ? 'ok' : 'bad'}`} role="status">
          <div className="spread">
            <span className="title">{answer.text}</span>
            {answer.correct && <span className="chip yellow">+{combo >= 3 ? 15 : 10} XP</span>}
          </div>
          {(answer.reveal.hanzi || answer.reveal.pt) && (
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
              {!answer.correct && <div className="small muted">Resposta certa:</div>}
              {answer.reveal.hanzi && (
                <span className="hz" style={{ fontSize: 22, fontWeight: 700, marginRight: 8 }}>
                  {answer.reveal.hanzi}
                </span>
              )}
              {answer.reveal.pinyin && (
                <span style={{ marginRight: 8 }}>
                  <Pinyin text={answer.reveal.pinyin} />
                </span>
              )}
              {answer.reveal.pt && <span className="muted">· {answer.reveal.pt}</span>}
              {answer.reveal.note && <div className="small" style={{ marginTop: 4 }}>{answer.reveal.note}</div>}
              </div>
              {mode.canListen && answer.reveal.hanzi && <SpeakerButton text={answer.reveal.hanzi} small label="Ouvir a resposta" />}
            </div>
          )}
          <button type="button" className={`btn block ${answer.correct ? 'green' : ''}`} onClick={next} autoFocus>
            Continuar
          </button>
        </div>
      )}

      {exiting && (
        <Overlay onClose={() => setExiting(false)}>
          <h2>Sair da sessão?</h2>
          <p className="muted">O que você já respondeu fica salvo na revisão, mas a sessão não conta para a ofensiva.</p>
          <button type="button" className="btn block" onClick={() => setExiting(false)}>
            Continuar estudando
          </button>
          <button type="button" className="btn ghost block" onClick={() => navigate('/')}>
            Sair
          </button>
        </Overlay>
      )}
    </div>
  )
}

function renderExercise(
  step: Step & { type: 'exercise' },
  props: { mode: Mode; box: number; locked: boolean; onAnswer: (c: boolean, r: Reveal) => void; onSkip: () => void },
) {
  const common = { step, ...props }
  switch (step.kind) {
    case 'meaning':
    case 'hanzi':
    case 'listen':
      return <ChoiceExercise {...common} />
    case 'tone':
      return <ToneExercise {...common} />
    case 'quiz':
      return <QuizExercise {...common} />
    case 'build':
    case 'dictation':
      return <BuildExercise {...common} />
    case 'speak':
    case 'pimsleur':
      return <SpeakExercise {...common} />
    case 'write':
      return <WriteExercise {...common} />
  }
}
