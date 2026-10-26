import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GiftInbox } from '../components/GiftInbox'
import { Icon, Jiaozi } from '../components/Icon'
import { ModeToggles } from '../components/ModeToggles'
import { WisdomCard } from '../components/WisdomCard'
import { Bar, BottomNav, Mascot } from '../components/ui'
import { coreItems } from '../content'
import { currentLesson, dueCount, lessonStatus } from '../lib/progress'
import { sfx } from '../lib/sounds'
import { hasChineseVoice, ttsSupported, unlockAudio } from '../lib/speech'
import { streakToday, useApp, useProfile } from '../store/useApp'

export function Home() {
  const profile = useProfile()!
  const updateSettings = useApp((s) => s.updateSettings)
  const navigate = useNavigate()
  const { progress, settings } = profile
  const lesson = currentLesson(progress, settings)
  const status = lessonStatus(lesson, progress)
  const streak = streakToday(progress)
  const due = dueCount(progress)
  const preview = coreItems(lesson.id)
    .slice(0, 3)
    .map((i) => (i.kind === 'word' ? i.word.hanzi : i.kind === 'tone' ? i.tone.pinyin : ''))
    .filter(Boolean)
  const [noVoice, setNoVoice] = useState(false)

  useEffect(() => {
    // As vozes carregam com atraso em alguns navegadores.
    const t = window.setTimeout(() => setNoVoice(settings.canListen && (!ttsSupported() || !hasChineseVoice())), 1500)
    return () => window.clearTimeout(t)
  }, [settings.canListen])

  const start = () => {
    unlockAudio()
    sfx.unlock()
    navigate('/sessao')
  }

  return (
    <div className="screen with-nav">
      <header className="topbar">
        <Link to="/perfil" className="brand" aria-label="Perfil e configurações">
          <img src="/icons/icon-192.png" alt="" />
          XinXon
        </Link>
        <div className="row" style={{ gap: 14 }}>
          <span className={`stat ${streak.count ? 'fire' : 'muted'}`} title="Ofensiva">
            <Icon name="flame" size={20} /> {streak.count}
          </span>
          {progress.streak.freezes > 0 && (
            <span className="stat cold" title="Congelamentos de ofensiva">
              <Icon name="snow" size={18} /> {progress.streak.freezes}
            </span>
          )}
          <span className="stat gold" title="Jiaozinhos">
            <Jiaozi /> {progress.coins}
          </span>
        </div>
      </header>

      <GiftInbox />

      <p style={{ fontWeight: 800 }}>
        <span className="hz">你好</span>, {profile.name}!{' '}
        <span className="muted">
          {streak.studiedToday
            ? 'Meta de hoje cumprida. Quer mais uma?'
            : streak.atRisk
              ? `Sua ofensiva de ${streak.count} ${streak.count === 1 ? 'dia' : 'dias'} está esperando!`
              : 'Bora começar uma sequência?'}
        </span>
      </p>

      <ModeToggles canListen={settings.canListen} canSpeak={settings.canSpeak} onChange={updateSettings} />
      {noVoice && (
        <p className="small muted">
          Este navegador não tem voz em chinês instalada, então o áudio pode não tocar. No celular, o Chrome (Android) e o Safari (iPhone) costumam
          funcionar melhor.
        </p>
      )}

      <div className="card outline-red">
        <div className="spread">
          <span className="label" style={{ color: 'var(--red-soft)' }}>
            {lesson.unit} · {streak.studiedToday ? 'Continue' : 'Meta de hoje'}
          </span>
          {due > 0 && <span className="chip">{due} para revisar</span>}
        </div>
        <h2>{lesson.title}</h2>
        <p className="muted small">{lesson.subtitle}</p>
        {preview.length > 0 && (
          <div className="hz" style={{ fontSize: 28, fontWeight: 700, color: 'var(--yellow)' }}>
            {preview.join('  ')}
          </div>
        )}
        <Bar value={status.percent} />
        <span className="small muted">{Math.round(status.percent * 100)}% da lição</span>
      </div>

      <WisdomCard progress={progress} canListen={settings.canListen} />

      {!status.started && progress.xp === 0 && (
        <div className="row">
          <Mascot pose="pensando" size={96} />
          <p className="speech grow">Oi! Eu sou o pandinha do XinXon. Cada sessão leva só 5 minutinhos. Vamos?</p>
        </div>
      )}

      <div className="grow" />
      <button type="button" className="btn block big sticky-cta" onClick={start}>
        {streak.studiedToday ? 'Mais uma rapidinha' : 'Começar · 5 min'}
      </button>
      <BottomNav />
    </div>
  )
}
