import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/ui'
import { cloudEnabled, signIn, signUp } from '../lib/cloud'
import { useApp } from '../store/useApp'

/** Entrar / criar conta na nuvem. */
export function AuthForm({ onLocal }: { onLocal?: () => void }) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('criar')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'criar') {
        const { needsConfirmation } = await signUp(email.trim(), password, name.trim())
        if (needsConfirmation) setMsg('Conta criada! Abra o e-mail de confirmação que enviamos e depois entre aqui.')
      } else await signIn(email.trim(), password)
    } catch (err) {
      const m = (err as Error).message
      setMsg(
        /invalid login/i.test(m)
          ? 'E-mail ou senha incorretos.'
          : /already registered/i.test(m)
            ? 'Esse e-mail já tem conta. Toque em "Já tenho conta".'
            : /password/i.test(m)
              ? 'A senha precisa ter pelo menos 6 caracteres.'
              : `Não deu certo: ${m}`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="tabs">
        <button type="button" className={mode === 'criar' ? 'on' : ''} onClick={() => setMode('criar')}>
          Criar conta
        </button>
        <button type="button" className={mode === 'entrar' ? 'on' : ''} onClick={() => setMode('entrar')}>
          Já tenho conta
        </button>
      </div>
      {mode === 'criar' && (
        <div className="field">
          <label htmlFor="auth-name">Seu nome</label>
          <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} autoComplete="given-name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="auth-email">E-mail</label>
        <input id="auth-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Senha</label>
        <input
          id="auth-pass"
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
        />
      </div>
      {msg && <p className="small" style={{ color: 'var(--yellow)' }}>{msg}</p>}
      <button type="submit" className="btn block" disabled={busy}>
        {mode === 'criar' ? 'Criar conta' : 'Entrar'}
      </button>
      {onLocal && (
        <button type="button" className="btn link" onClick={onLocal}>
          Usar sem conta (só neste aparelho)
        </button>
      )}
    </form>
  )
}

/** Primeiro acesso: escolher perfil, entrar na nuvem ou criar um perfil local. */
export function Welcome() {
  const { profiles, createProfile, switchProfile } = useApp()
  const navigate = useNavigate()
  const locals = Object.values(profiles).filter((p) => !p.cloud)
  const [step, setStep] = useState<'start' | 'name' | 'level'>(cloudEnabled ? 'start' : locals.length ? 'start' : 'name')
  const [name, setName] = useState('')

  const finish = (skip: boolean) => {
    createProfile(name, skip)
    navigate('/', { replace: true })
  }

  return (
    <div className="screen" style={{ gap: 18, justifyContent: 'center' }}>
      <Mascot pose="pensando" size={200} bounce alt="Panda XinXon dizendo olá" />
      <div className="center" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1>Bem-vindo ao XinXon!</h1>
        <p className="muted">Chinês em português, em sessões de 5 minutos.</p>
      </div>

      {step === 'start' && (
        <div className="card">
          {locals.length > 0 && (
            <>
              <span className="label">Continuar como</span>
              {locals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn ghost block"
                  onClick={() => {
                    switchProfile(p.id)
                    navigate('/', { replace: true })
                  }}
                >
                  <Icon name="user" /> {p.name}
                </button>
              ))}
            </>
          )}
          {cloudEnabled ? (
            <AuthForm onLocal={() => setStep('name')} />
          ) : (
            <button type="button" className="btn block" onClick={() => setStep('name')}>
              Criar novo perfil
            </button>
          )}
        </div>
      )}

      {step === 'name' && (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault()
            setStep('level')
          }}
        >
          <div className="field">
            <label htmlFor="name">Como você quer ser chamado(a)?</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus required />
          </div>
          <button type="submit" className="btn block" disabled={!name.trim()}>
            Continuar
          </button>
        </form>
      )}

      {step === 'level' && (
        <div className="card">
          <h3>Você já sabe pinyin e os 4 tons?</h3>
          <button type="button" className="btn block" onClick={() => finish(false)}>
            Não, quero começar do zero
          </button>
          <button type="button" className="btn ghost block" onClick={() => finish(true)}>
            Sim, pular para o HSK 1
          </button>
          <p className="tiny muted center">Dá para mudar isso depois no seu perfil.</p>
        </div>
      )}
    </div>
  )
}
