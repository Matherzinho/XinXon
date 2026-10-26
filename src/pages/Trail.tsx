import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Bar, BottomNav } from '../components/ui'
import { coreItems, extraItems } from '../content'
import { currentLesson, lessonStatus, unitProgress, visibleLessons } from '../lib/progress'
import { useProfile } from '../store/useApp'

export function Trail() {
  const profile = useProfile()!
  const { progress, settings } = profile
  const lessons = visibleLessons(settings)
  const current = currentLesson(progress, settings)
  const currentIndex = lessons.indexOf(current)
  const units = [...new Set(lessons.map((l) => l.unit))]

  return (
    <div className="screen with-nav">
      <h1>Trilha</h1>
      {units.map((unit) => (
        <section key={unit} className="path">
          <div className="spread">
            <h2>{unit}</h2>
            <span className="small muted">{Math.round(unitProgress(progress, settings, unit) * 100)}%</span>
          </div>
          {lessons
            .filter((l) => l.unit === unit)
            .map((lesson) => {
              const i = lessons.indexOf(lesson)
              const st = lessonStatus(lesson, progress)
              const locked = i > currentIndex
              const isCurrent = lesson === current
              const sample = coreItems(lesson.id).find((it) => it.kind === 'word')
              const badge = st.done ? '✓' : locked ? '' : sample?.kind === 'word' ? sample.word.hanzi[0] : lesson.unit === 'Fundação' ? (lesson.id === 'f1' ? 'ā' : 'b') : '字'
              const count = coreItems(lesson.id).length + extraItems(lesson.id).length
              return (
                <div key={lesson.id} className={`lesson-node${st.done ? ' done' : ''}${isCurrent ? ' current' : ''}${locked ? ' locked' : ''}`}>
                  <div className="lesson-badge" aria-hidden="true">
                    {locked ? <Icon name="lock" /> : badge}
                  </div>
                  <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <strong>{lesson.title}</strong>
                    <span className="small muted">
                      {lesson.subtitle} · {count} itens
                    </span>
                    {!locked && <Bar value={st.percent} thin color={st.done ? undefined : 'purple'} />}
                  </div>
                  {isCurrent && (
                    <Link to="/sessao" className="btn" style={{ minHeight: 44, padding: '0 14px', fontSize: 15 }}>
                      Estudar
                    </Link>
                  )}
                </div>
              )
            })}
        </section>
      ))}
      <p className="small muted center">Mais lições do HSK 1 e 2 chegam nas próximas versões.</p>
      <BottomNav />
    </div>
  )
}
