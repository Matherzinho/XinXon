import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Jiaozi } from '../components/Icon'
import { BottomNav, Overlay } from '../components/ui'
import { cloudEnabled, renameCloud, signOut } from '../lib/cloud'
import { hasChineseVoice, recognitionSupported, ttsSupported } from '../lib/speech'
import { useCloud } from '../lib/useCloudSync'
import { useApp, useProfile } from '../store/useApp'
import { AuthForm } from './Welcome'

function Switch({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = `sw-${label}`
  return (
    <div className="switch-row">
      <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        <strong>{label}</strong>
        {desc && <span className="small muted">{desc}</span>}
      </label>
      <input id={id} type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  )
}

export function Profile() {
  const profile = useProfile()!
  const { profiles, updateSettings, renameProfile, switchProfile, resetProgress } = useApp()
  const cloud = useCloud()
  const navigate = useNavigate()
  const [name, setName] = useState(profile.name)
  const [confirmReset, setConfirmReset] = useState(false)
  const s = profile.settings
  const others = Object.values(profiles).filter((p) => p.id !== profile.id && !p.cloud)

  const saveName = () => {
    const n = name.trim()
    if (!n || n === profile.name) return
    renameProfile(n)
    if (cloud.userId) void renameCloud(cloud.userId, n)
  }

  return (
    <div className="screen with-nav">
      <div className="row">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}>
          <Icon name="back" />
        </button>
        <h1>Perfil</h1>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="name">Seu nome</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} maxLength={30} />
        </div>
        <div className="spread small">
          <span>
            <strong>{profile.progress.xp}</strong> XP no total
          </span>
          <span>
            Melhor ofensiva: <strong>{profile.progress.streak.best}</strong>
          </span>
          <span className="stat gold">
            <Jiaozi size={16} /> {profile.progress.coins}
          </span>
        </div>
      </div>

      <div className="card">
        <span className="label">Estudo</span>
        <Switch label="Voz mais lenta" desc="O áudio em chinês fala mais devagar" checked={s.slowVoice} onChange={(v) => updateSettings({ slowVoice: v })} />
        <Switch label="Efeitos sonoros" desc="Sons de acerto, erro e recompensa" checked={s.sound} onChange={(v) => updateSettings({ sound: v })} />
        <Switch
          label="Já sei pinyin e os tons"
          desc="Pula a Fundação e começa no HSK 1"
          checked={s.skipFoundation}
          onChange={(v) => updateSettings({ skipFoundation: v })}
        />
      </div>

      <div className="card small">
        <span className="label">Neste aparelho</span>
        <span>
          Voz em chinês: {ttsSupported() && hasChineseVoice() ? <strong style={{ color: 'var(--green)' }}>disponível</strong> : <strong>não encontrada</strong>}
        </span>
        <span>
          Reconhecimento de fala:{' '}
          {recognitionSupported() ? <strong style={{ color: 'var(--green)' }}>disponível</strong> : <strong>indisponível (você se autoavalia)</strong>}
        </span>
      </div>

      {cloudEnabled && (
        <div className="card">
          <span className="label">Conta na nuvem</span>
          {cloud.userId ? (
            <>
              <span className="small">
                Conectado como <strong>{cloud.email}</strong>. Seu progresso fica salvo e sincroniza entre celular e PC.
              </span>
              {cloud.error && <span className="small" style={{ color: 'var(--red-soft)' }}>Erro de sincronização: {cloud.error}</span>}
              <button type="button" className="btn ghost block" onClick={() => signOut()}>
                Sair da conta
              </button>
            </>
          ) : (
            <>
              <span className="small muted">Entre para salvar seu progresso na nuvem e liberar o modo dupla.</span>
              <AuthForm />
            </>
          )}
        </div>
      )}

      {!profile.cloud && (
        <div className="card">
          <span className="label">Perfis neste aparelho</span>
          {others.map((p) => (
            <button key={p.id} type="button" className="btn ghost block" onClick={() => switchProfile(p.id)}>
              <Icon name="user" /> Trocar para {p.name}
            </button>
          ))}
          <button
            type="button"
            className="btn ghost block"
            onClick={() => {
              switchProfile(null)
              navigate('/bem-vindo')
            }}
          >
            Criar outro perfil
          </button>
        </div>
      )}

      <button type="button" className="btn link" style={{ color: 'var(--red-soft)' }} onClick={() => setConfirmReset(true)}>
        Apagar meu progresso
      </button>
      <p className="tiny muted center">
        Dados de traços dos caracteres: Make Me a Hanzi / Hanzi Writer (licença Arphic Public License). XinXon v0.1
      </p>

      {confirmReset && (
        <Overlay onClose={() => setConfirmReset(false)}>
          <h2>Apagar todo o progresso?</h2>
          <p className="muted">Isso zera XP, ofensiva, jiaozinhos e tudo o que você aprendeu. Não dá para desfazer.</p>
          <button
            type="button"
            className="btn block"
            onClick={() => {
              resetProgress()
              setConfirmReset(false)
            }}
          >
            Apagar
          </button>
          <button type="button" className="btn ghost block" onClick={() => setConfirmReset(false)}>
            Cancelar
          </button>
        </Overlay>
      )}
      <BottomNav />
    </div>
  )
}
