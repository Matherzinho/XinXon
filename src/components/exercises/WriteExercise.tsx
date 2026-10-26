import HanziWriter, { type CharacterJson } from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'
import type { CharInfo } from '../../content'
import { ALL_WORDS } from '../../content'
import { speak } from '../../lib/speech'
import { Pinyin } from '../ui'
import type { ExerciseProps } from './types'

export const loadChar = (char: string, onLoad: (data: CharacterJson) => void, onError: (err?: unknown) => void) => {
  fetch(`/hanzi/${encodeURIComponent(char)}.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(onLoad)
    .catch(onError)
}

export const writerColors = {
  strokeColor: '#FFC93C',
  outlineColor: '#3A3048',
  drawingColor: '#E5383B',
  highlightColor: '#C9A6FF',
  radicalColor: '#C9A6FF',
}

/**
 * Traçar o caractere, em degraus:
 * novo → assiste a animação e traça por cima; médio → traça com contorno; forte → escreve de memória.
 */
export function WriteExercise({ step, mode, box, locked, onAnswer }: ExerciseProps) {
  const { char, info } = step.item as { char: string; info: CharInfo }
  const ref = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const [stage, setStage] = useState<'demo' | 'quiz' | 'done'>(box === 0 && !step.retry ? 'demo' : 'quiz')
  const [strokeInfo, setStrokeInfo] = useState('')
  const [failed, setFailed] = useState(false)
  const memory = box >= 4
  const pinyin = ALL_WORDS.find((w) => w.hanzi === char)?.pinyin
  const size = Math.min(300, window.innerWidth - 64)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const writer = HanziWriter.create(ref.current, char, {
      width: size,
      height: size,
      padding: 18,
      showOutline: !memory,
      showCharacter: false,
      drawingWidth: 26,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 220,
      charDataLoader: loadChar,
      onLoadCharDataError: () => setFailed(true),
      ...writerColors,
    })
    writerRef.current = writer
    if (stage === 'demo') {
      if (mode.canListen) void speak(char)
      writer.animateCharacter({ onComplete: () => window.setTimeout(() => setStage('quiz'), 400) })
    }
    return () => {
      writerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.key])

  useEffect(() => {
    const writer = writerRef.current
    if (stage !== 'quiz' || !writer) return
    writer.hideCharacter()
    let strokes = 0
    void writer.quiz({
      showHintAfterMisses: box === 0 ? 1 : memory ? 3 : 2,
      leniency: 1.25,
      highlightOnComplete: true,
      onCorrectStroke: (d) => {
        strokes = d.strokeNum + 1
        setStrokeInfo(`Traço ${strokes} de ${strokes + d.strokesRemaining}`)
      },
      onComplete: (summary) => {
        setStage('done')
        if (mode.canListen) void speak(char)
        onAnswer(summary.totalMistakes <= 3, { hanzi: char, pinyin, pt: info.meaning, note: info.mnemonic })
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const replay = () => {
    const writer = writerRef.current
    if (!writer || stage !== 'quiz') return
    writer.cancelQuiz()
    setStage('demo')
    if (mode.canListen) void speak(char)
    writer.animateCharacter({ onComplete: () => window.setTimeout(() => setStage('quiz'), 400) })
  }

  return (
    <div className="screen" style={{ padding: 0, gap: 14 }}>
      <h2>
        {stage === 'demo' ? 'Veja como se escreve' : memory ? 'Escreva de memória' : 'Trace o caractere'}: “{info.meaning}”
      </h2>
      <div className="card" style={{ padding: 12 }}>
        <span className="small">
          <strong style={{ color: 'var(--yellow)' }}>Macete:</strong> {info.mnemonic}
        </span>
      </div>
      {failed ? (
        <p className="center muted">Não consegui carregar os traços deste caractere.</p>
      ) : (
        <div ref={ref} className="tracer" style={{ width: size + 6, height: size + 6 }} aria-label={`Área para traçar ${char}`} />
      )}
      <div className="spread small muted">
        <span>{stage === 'demo' ? 'Observe a ordem dos traços…' : strokeInfo || 'Comece pelo primeiro traço'}</span>
        {pinyin && <Pinyin text={pinyin} />}
      </div>
      {stage === 'quiz' && !failed && !locked && (
        <button type="button" className="btn ghost block" onClick={replay}>
          Ver a animação de novo
        </button>
      )}
      {failed && !locked && (
        <button type="button" className="btn block" onClick={() => onAnswer(true, { hanzi: char, pinyin, pt: info.meaning })}>
          Continuar
        </button>
      )}
    </div>
  )
}
