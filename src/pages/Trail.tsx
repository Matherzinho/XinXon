import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { BottomNav } from '../components/ui'
import { coreItems } from '../content'
import { currentLesson, lessonStatus, unitProgress, visibleLessons } from '../lib/progress'
import { useProfile } from '../store/useApp'

// Mapa da trilha: estradinha em zigue-zague, cenário chinês e o pandinha andando até a lição atual.

const W = 390
const GAP = 140
const UNIT_GAP = 130
const XS = [250, 110, 250, 130, 260, 110, 250, 120]

function rand(seed: number) {
  let s = seed
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280)
}

export function Trail() {
  const profile = useProfile()!
  const navigate = useNavigate()
  const { progress, settings } = profile
  const lessons = visibleLessons(settings)
  const current = currentLesson(progress, settings)
  const ci = lessons.indexOf(current)

  // Posições de cada lição e das faixas de unidade.
  const layout = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const banners: { unit: string; y: number }[] = [{ unit: lessons[0]?.unit, y: 80 }]
    let y = 200
    lessons.forEach((l, i) => {
      if (i > 0 && l.unit !== lessons[i - 1].unit) {
        banners.push({ unit: l.unit, y: y - GAP + 72 })
        y += UNIT_GAP
      }
      pts.push({ x: XS[i % XS.length], y })
      y += GAP
    })
    return { pts, banners, height: y + 60 }
  }, [lessons])
  const { pts, banners, height } = layout

  const path = (upto = pts.length - 1) =>
    pts.slice(0, upto + 1).reduce((d, p, i) => {
      if (!i) return `M${p.x} ${p.y}`
      const a = pts[i - 1]
      const my = (a.y + p.y) / 2
      return `${d} C${a.x} ${my} ${p.x} ${my} ${p.x} ${p.y}`
    }, '')

  // Panda anda da última lição vista até a atual.
  const key = `xinxon-trail-${profile.id}`
  const [pandaAt, setPandaAt] = useState(() => {
    const prev = Number(localStorage.getItem(key) ?? ci)
    return Math.min(isNaN(prev) ? ci : prev, ci)
  })
  const walking = pandaAt !== ci
  useEffect(() => {
    if (pandaAt >= ci) {
      localStorage.setItem(key, String(ci))
      return
    }
    const t = window.setTimeout(() => setPandaAt((p) => p + 1), 700)
    return () => window.clearTimeout(t)
  }, [pandaAt, ci, key])

  useEffect(() => {
    // Rola até a lição atual.
    window.setTimeout(() => window.scrollTo({ top: Math.max(0, (pts[ci]?.y ?? 0) - 260), behavior: 'smooth' }), 200)
  }, [ci, pts])

  // Cenário (fixo para cada tamanho de mapa).
  const deco = useMemo(() => {
    const r = rand(height)
    const tufts: { x: number; y: number }[] = []
    const flowers: { x: number; y: number; c: string }[] = []
    const far = (x: number, y: number, d: number) => pts.every((p) => Math.abs(p.x - x) > d || Math.abs(p.y - y) > d)
    for (let i = 0; i < height / 28; i++) {
      const x = 10 + r() * 370
      const y = 180 + r() * (height - 220)
      if (far(x, y, 55)) tufts.push({ x, y })
    }
    for (let i = 0; i < height / 80; i++) {
      const x = 15 + r() * 360
      const y = 200 + r() * (height - 240)
      if (far(x, y, 60)) flowers.push({ x, y, c: ['#FF7B7B', '#FFC93C', '#D3B2FF'][i % 3] })
    }
    const props: { kind: string; x: number; y: number }[] = []
    for (let y = 250, i = 0; y < height - 120; y += 240, i++) {
      props.push({ kind: ['pagoda', 'tree', 'bamboo', 'lantern'][i % 4], x: i % 2 ? 14 : 310, y })
    }
    return { tufts, flowers, props }
  }, [height, pts])

  const pp = pts[pandaAt] ?? pts[0]

  return (
    <div className="screen with-nav trail-map" style={{ padding: 0, height: height + 90 }}>
      <div className="trail-bg" style={{ height }}>
        <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} aria-hidden="true" className="trail-svg">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ellipse key={i} cx={i % 2 ? 340 : 50} cy={300 + i * 170} rx={175} ry={130} fill={i % 2 ? '#21402D' : '#1F3A2A'} />
          ))}
          {deco.tufts.map((t, i) => (
            <path key={i} d={`M${t.x} ${t.y}l-4-10M${t.x} ${t.y}l0-13M${t.x} ${t.y}l4-10`} stroke="#4FA36A" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          {deco.flowers.map((f, i) => (
            <g key={i}>
              <circle cx={f.x} cy={f.y} r="4" fill={f.c} />
              <circle cx={f.x} cy={f.y} r="1.6" fill="#FFF4E6" />
            </g>
          ))}
          <path d={path()} fill="none" stroke="#C9A97A" strokeWidth="30" strokeLinecap="round" />
          <path d={path()} fill="none" stroke="#E2C795" strokeWidth="22" strokeLinecap="round" />
          <path d={path()} fill="none" stroke="#B89466" strokeWidth="3" strokeDasharray="3 16" strokeLinecap="round" className="trail-dash" />
          {ci > 0 && <path d={path(ci)} fill="none" stroke="#FFC93C" strokeWidth="22" strokeLinecap="round" opacity=".9" />}
          {pts.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y + 30} rx="38" ry="9" fill="rgba(0,0,0,.35)" />
          ))}
        </svg>

        {deco.props.map((p, i) => (
          <div key={i} className={`trail-prop ${p.kind}`} style={{ left: p.x, top: p.y }} aria-hidden="true">
            <Prop kind={p.kind} />
          </div>
        ))}

        <div className="trail-head">
          <h1>Trilha</h1>
          <span className="small muted" style={{ fontWeight: 800 }}>
            {Math.round(unitProgress(progress, settings, current.unit) * 100)}% de {current.unit}
          </span>
        </div>

        {banners.map((b, i) => (
          <div key={b.unit} className={`trail-banner u${i % 2}`} style={{ top: b.y }}>
            <span className="label">Unidade {i + 1}</span>
            <strong>{b.unit === 'Fundação' ? 'Fundação · tons, pinyin e traços' : 'HSK 1 · primeiras conversas'}</strong>
          </div>
        ))}

        {lessons.map((l, i) => {
          const p = pts[i]
          const st = lessonStatus(l, progress)
          const state = i < ci || st.done ? 'done' : i === ci ? 'current' : 'locked'
          const sample = coreItems(l.id).find((it) => it.kind === 'word')
          const glyph = sample?.kind === 'word' ? sample.word.hanzi[0] : l.id === 'f1' ? 'ā' : 'b'
          const left = p.x < W / 2
          return (
            <div key={l.id}>
              <button
                type="button"
                className={`trail-node ${state}`}
                style={{ left: p.x, top: p.y }}
                disabled={state === 'locked'}
                onClick={() => state === 'current' && navigate('/sessao')}
                aria-label={`${l.title}${state === 'locked' ? ' (bloqueada)' : state === 'done' ? ' (concluída)' : ''}`}
              >
                {state === 'done' ? <Icon name="check" size={30} stroke={3.4} /> : <span className="hz">{glyph}</span>}
                {state === 'current' && (
                  <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#FFC93C" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${st.percent * 289} 289`} transform="rotate(-90 50 50)" />
                  </svg>
                )}
              </button>
              <div className="trail-label" style={left ? { left: p.x + 50, top: p.y } : { right: W - p.x + 50, top: p.y }}>
                <span className={state === 'locked' ? 'locked' : ''}>{l.title}</span>
              </div>
              {state === 'current' && !walking && (
                <button type="button" className="btn trail-go" style={{ left: p.x - 60, top: p.y + 50 }} onClick={() => navigate('/sessao')}>
                  Estudar
                </button>
              )}
            </div>
          )
        })}

        <div className={`trail-panda${walking ? ' walking' : ''}`} style={{ left: pp.x < W / 2 ? pp.x - 104 : pp.x + 30, top: pp.y - 78 }}>
          <img src={walking ? '/mascote/panda-torcendo.png' : '/mascote/panda-pensando.png'} alt="Pandinha na lição atual" />
        </div>

        <div className="trail-chest" style={{ left: (pts[pts.length - 1]?.x ?? 200) - 60, top: (pts[pts.length - 1]?.y ?? 0) + 62 }}>
          <svg width="76" height="64" viewBox="0 0 70 60" aria-hidden="true">
            <rect x="8" y="22" width="54" height="34" rx="6" fill="#9B5DE5" />
            <rect x="4" y="14" width="62" height="12" rx="5" fill="#C9A6FF" />
            <path d="M35 14v42" stroke="#FFC93C" strokeWidth="6" />
          </svg>
          <div className="tiny" style={{ fontWeight: 800 }}>Mais lições em breve</div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

function Prop({ kind }: { kind: string }) {
  if (kind === 'pagoda')
    return (
      <svg width="70" height="80" viewBox="0 0 70 80">
        <rect x="22" y="44" width="26" height="30" fill="#A31F22" />
        <rect x="31" y="56" width="8" height="18" fill="#2A1418" />
        <path d="M8 46h54l-8-10H16zM14 30h42l-7-9H21zM24 15h22l-11-12z" fill="#E5383B" />
        <path d="M8 46h54M14 30h42" stroke="#FFC93C" strokeWidth="2" />
        <ellipse cx="35" cy="76" rx="30" ry="5" fill="rgba(0,0,0,.35)" />
      </svg>
    )
  if (kind === 'tree')
    return (
      <svg width="56" height="70" viewBox="0 0 56 70">
        <rect x="25" y="40" width="6" height="24" fill="#5A3A22" />
        <circle cx="28" cy="30" r="20" fill="#2F7D4A" />
        <circle cx="18" cy="36" r="12" fill="#3B9A5B" />
        <circle cx="38" cy="34" r="12" fill="#3B9A5B" />
        <circle cx="22" cy="24" r="4" fill="#FFB3C1" />
        <circle cx="36" cy="22" r="4" fill="#FFB3C1" />
        <circle cx="30" cy="38" r="4" fill="#FFB3C1" />
      </svg>
    )
  if (kind === 'bamboo')
    return (
      <svg width="30" height="90" viewBox="0 0 30 90">
        <path d="M10 88V6M20 88V20" stroke="#5FB36F" strokeWidth="5" strokeLinecap="round" />
        <path d="M7 30h6M7 55h6M17 45h6M17 68h6" stroke="#2F7D4A" strokeWidth="3" />
        <path d="M12 20l12-8M22 38l8-8" stroke="#5FB36F" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  return (
    <svg width="32" height="44" viewBox="0 0 40 54">
      <path d="M20 2v6M20 46v6" stroke="#FFC93C" strokeWidth="3" />
      <ellipse cx="20" cy="27" rx="15" ry="16" fill="#E5383B" />
      <path d="M12 13h16M12 41h16" stroke="#FFC93C" strokeWidth="4" />
    </svg>
  )
}
