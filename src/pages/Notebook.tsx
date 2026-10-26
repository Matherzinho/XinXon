import HanziWriter from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'
import { loadChar, writerColors } from '../components/exercises/WriteExercise'
import { Icon } from '../components/Icon'
import { BottomNav, Dots, Mascot, Overlay } from '../components/ui'
import { CHARS, LESSONS, WISDOM, coreItems } from '../content'
import { speak } from '../lib/speech'
import { useProfile } from '../store/useApp'

type Tab = 'palavras' | 'hanzi' | 'sabedorias'

function CharModal({ char, onClose }: { char: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const w = HanziWriter.create(ref.current, char, {
      width: 220,
      height: 220,
      padding: 14,
      showOutline: true,
      charDataLoader: loadChar,
      delayBetweenLoops: 1200,
      ...writerColors,
    })
    void w.loopCharacterAnimation()
    void speak(char)
  }, [char])
  const info = CHARS[char]
  return (
    <Overlay onClose={onClose}>
      <div ref={ref} className="tracer" style={{ width: 226, height: 226 }} />
      <h2>
        <span className="hz">{char}</span> · {info?.meaning}
      </h2>
      {info && <p className="small">{info.mnemonic}</p>}
      <button type="button" className="btn block" onClick={onClose}>
        Fechar
      </button>
    </Overlay>
  )
}

export function Notebook() {
  const profile = useProfile()!
  const { progress, settings } = profile
  const [tab, setTab] = useState<Tab>('palavras')
  const [char, setChar] = useState<string | null>(null)
  const known = (id: string) => !!progress.items[id]

  const lessonsWithWords = LESSONS.map((l) => ({ lesson: l, items: coreItems(l.id).filter((i) => (i.kind === 'word' || i.kind === 'tone') && known(i.id)) })).filter(
    (g) => g.items.length,
  )
  const chars = LESSONS.flatMap((l) => l.trace).filter((c) => known(`h:${c}`))
  const totalWords = lessonsWithWords.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="screen with-nav">
      <div className="spread">
        <h1>Caderno</h1>
        <span className="chip yellow">{totalWords} palavras</span>
      </div>
      <div className="tabs" role="tablist">
        {(['palavras', 'hanzi', 'sabedorias'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'palavras' ? 'Palavras' : t === 'hanzi' ? 'Hanzi' : 'Sabedorias'}
          </button>
        ))}
      </div>

      {tab === 'palavras' &&
        (lessonsWithWords.length ? (
          lessonsWithWords.map(({ lesson, items }) => (
            <section key={lesson.id} className="card">
              <span className="label">{lesson.title}</span>
              {items.map((i) => {
                const hz = i.kind === 'word' ? i.word.hanzi : i.kind === 'tone' ? i.tone.hanzi : ''
                const py = i.kind === 'word' ? i.word.pinyin : i.kind === 'tone' ? i.tone.pinyin : ''
                const pt = i.kind === 'word' ? i.word.pt : i.kind === 'tone' ? i.tone.pt : ''
                return (
                  <div key={i.id} className="word-row">
                    <span className="hz">{hz}</span>
                    <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{py}</strong>
                      <span className="small muted">{pt}</span>
                    </div>
                    <Dots value={Math.min(5, progress.items[i.id]?.box ?? 0)} />
                    {settings.canListen && (
                      <button type="button" className="icon-btn" aria-label={`Ouvir ${hz}`} onClick={() => speak(hz)}>
                        <Icon name="speaker" />
                      </button>
                    )}
                  </div>
                )
              })}
            </section>
          ))
        ) : (
          <Empty text="Seu caderno ainda está vazio. Cada palavra que você aprender aparece aqui!" />
        ))}

      {tab === 'hanzi' &&
        (chars.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {chars.map((c) => (
              <button key={c} type="button" className="choice" onClick={() => setChar(c)}>
                <span className="hz">{c}</span>
                <span className="py">{CHARS[c]?.meaning}</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty text="Os caracteres que você traçar ficam guardados aqui, com a animação dos traços." />
        ))}

      {tab === 'sabedorias' &&
        (progress.wisdom.collected.length ? (
          progress.wisdom.collected.map((i) => {
            const w = WISDOM[i]
            return (
              <div key={i} className="card paper">
                <span className="hz" style={{ fontSize: 19, fontWeight: 700 }}>
                  {w.hanzi}
                </span>
                <span className="small" style={{ color: '#6B4A36' }}>
                  {w.pinyin}
                </span>
                <span>
                  “{w.pt}”{w.author ? ` · ${w.author}` : ''}
                </span>
              </div>
            )
          })
        ) : (
          <Empty text="Abra a sabedoria do dia na tela inicial para começar sua coleção." />
        ))}

      {char && <CharModal char={char} onClose={() => setChar(null)} />}
      <BottomNav />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="center" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '20px 0' }}>
      <Mascot pose="caderno" size={170} />
      <p className="muted">{text}</p>
    </div>
  )
}
