import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Mascot } from './components/ui'
import { setSoundEnabled } from './lib/sounds'
import { setSpeechRate } from './lib/speech'
import { useCloud, useCloudSync } from './lib/useCloudSync'
import { Duo } from './pages/Duo'
import { Home } from './pages/Home'
import { Notebook } from './pages/Notebook'
import { Prof } from './pages/Prof'
import { Profile } from './pages/Profile'
import { Reward } from './pages/Reward'
import { Session } from './pages/Session'
import { Trail } from './pages/Trail'
import { Welcome } from './pages/Welcome'
import { useProfile } from './store/useApp'

/** Só deixa entrar nas telas do app quando já existe um perfil ativo. */
function NeedsProfile({ children }: { children: ReactNode }) {
  const profile = useProfile()
  return profile ? <>{children}</> : <Navigate to="/bem-vindo" replace />
}

export default function App() {
  useCloudSync()
  const ready = useCloud((s) => s.ready)
  const profile = useProfile()

  useEffect(() => {
    setSpeechRate(profile?.settings.slowVoice ? 0.6 : 0.85)
    setSoundEnabled(profile?.settings.sound ?? true)
  }, [profile?.settings.slowVoice, profile?.settings.sound])

  if (!ready)
    return (
      <div className="app">
        <div className="screen" style={{ justifyContent: 'center' }}>
          <Mascot pose="dormindo" size={180} />
          <p className="center muted">Carregando…</p>
        </div>
      </div>
    )

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/bem-vindo" element={profile ? <Navigate to="/" replace /> : <Welcome />} />
          <Route path="/" element={<NeedsProfile><Home /></NeedsProfile>} />
          <Route path="/sessao" element={<NeedsProfile><Session /></NeedsProfile>} />
          <Route path="/recompensa" element={<NeedsProfile><Reward /></NeedsProfile>} />
          <Route path="/trilha" element={<NeedsProfile><Trail /></NeedsProfile>} />
          <Route path="/prof" element={<NeedsProfile><Prof /></NeedsProfile>} />
          <Route path="/caderno" element={<NeedsProfile><Notebook /></NeedsProfile>} />
          <Route path="/dupla" element={<NeedsProfile><Duo /></NeedsProfile>} />
          <Route path="/perfil" element={<NeedsProfile><Profile /></NeedsProfile>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
