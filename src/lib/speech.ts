// Áudio do navegador: voz sintetizada (ouvir) e reconhecimento de fala (falar).
// Tudo gratuito, usando as vozes do próprio celular/computador.

import manifest from '../content/audio.json'

type Lang = 'zh-CN' | 'pt-BR'

let voices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (!('speechSynthesis' in window)) return
  voices = window.speechSynthesis.getVoices()
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  if (lang === 'zh-CN') {
    const mandarin = voices.filter((v) => ['zh-cn', 'cmn-cn', 'zh-hans-cn', 'cmn-hans-cn'].includes(norm(v.lang)))
    const nice = mandarin.find((v) => /google|xiaoxiao|tingting|yaoyao|huihui|natural/i.test(v.name))
    return nice ?? mandarin[0] ?? voices.find((v) => norm(v.lang) === 'zh-tw')
  }
  const br = voices.filter((v) => norm(v.lang) === 'pt-br')
  return br.find((v) => /google|luciana|francisca|natural/i.test(v.name)) ?? br[0] ?? voices.find((v) => norm(v.lang).startsWith('pt'))
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function hasChineseVoice(): boolean {
  return !!pickVoice('zh-CN')
}

// ---------- Áudios gravados (vêm junto com o app, funcionam em qualquer navegador) ----------

const RECORDED = manifest as { zh: Record<string, string>; zhSlow?: Record<string, string>; pt: Record<string, string> }

/** Texto da pergunta do modo Pimsleur ("Como se diz: obrigado?"). */
export function promptText(pt: string): string {
  const clean = pt.replace(/\((a|s|as|os)\)/g, '').replace(/[.!?]+$/, '').trim()
  return `Como se diz: ${clean}?`
}

export function hasRecording(text: string, lang: Lang = 'zh-CN'): boolean {
  return !!(lang === 'zh-CN' ? RECORDED.zh[text] : RECORDED.pt[text])
}

let player: HTMLAudioElement | null = null
const getPlayer = () => (player ??= new Audio())

let slow = false
export function setSpeechRate(r: number) {
  rate = r
  slow = r < 0.8
}
let rate = 0.85

function playFile(url: string, playbackRate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const a = getPlayer()
    a.pause()
    a.src = url
    a.playbackRate = playbackRate
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      a.onended = a.onerror = null
      resolve(ok)
    }
    a.onended = () => finish(true)
    a.onerror = () => finish(false)
    a.play().catch(() => finish(false))
    setTimeout(() => finish(true), 9000)
  })
}

function speakSynth(text: string, lang: Lang, customRate?: number): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve()
    const synth = window.speechSynthesis
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    const v = pickVoice(lang)
    if (v) u.voice = v
    u.rate = customRate ?? (lang === 'zh-CN' ? rate : 1)
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
    }
    u.onend = finish
    u.onerror = finish
    setTimeout(finish, 1500 + text.length * 450)
    synth.speak(u)
  })
}

/**
 * Fala o texto: usa o áudio gravado quando existe; se não, a voz do navegador.
 * `veryslow` toca a versão gravada bem devagar (botão da tartaruga).
 */
export async function speak(text: string, lang: Lang = 'zh-CN', opts: { veryslow?: boolean } = {}): Promise<void> {
  if (!text) return
  if (lang === 'zh-CN' && opts.veryslow) {
    const sid = RECORDED.zhSlow?.[text]
    if (sid && (await playFile(`/audio/zh-lento/${sid}.mp3`, 1))) return
    if (RECORDED.zh[text] && (await playFile(`/audio/zh/${RECORDED.zh[text]}.mp3`, 0.65))) return
    return speakSynth(text, lang, 0.5)
  }
  const id = lang === 'zh-CN' ? RECORDED.zh[text] : RECORDED.pt[text]
  if (id) {
    const folder = lang === 'zh-CN' ? 'zh' : 'pt'
    const ok = await playFile(`/audio/${folder}/${id}.mp3`, lang === 'zh-CN' && slow ? 0.8 : 1)
    if (ok) return
  }
  await speakSynth(text, lang)
}

export function stopSpeaking() {
  player?.pause()
  if (ttsSupported()) window.speechSynthesis.cancel()
}

/** Chamado num toque do usuário para liberar o áudio no iPhone. */
export function unlockAudio() {
  const a = getPlayer()
  a.src = '/audio/silent.mp3'
  a.play().catch(() => {})
  if (ttsSupported()) {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

// ---------- Reconhecimento de fala ----------

interface RecognitionLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function recognitionCtor(): (new () => RecognitionLike) | undefined {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => RecognitionLike) | undefined
}

/** Fica true quando o reconhecimento falha por falta de serviço/permissão (ex.: navegador do app do Claude). */
let recognitionBroken = false
export const recognitionSupported = () => typeof window !== 'undefined' && !!recognitionCtor() && !recognitionBroken

export interface ListenHandle {
  result: Promise<string[]>
  stop: () => void
}

/** Escuta a fala em chinês e devolve as transcrições possíveis. */
export function listen(lang = 'zh-CN', timeoutMs = 7000): ListenHandle {
  const Ctor = recognitionCtor()
  if (!Ctor) return { result: Promise.reject(new Error('unsupported')), stop: () => {} }
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 5
  rec.continuous = false
  let timer = 0
  const result = new Promise<string[]>((resolve, reject) => {
    let got: string[] = []
    rec.onresult = (e) => {
      got = []
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        for (let j = 0; j < r.length; j++) got.push(r[j].transcript)
      }
    }
    rec.onerror = (e) => {
      window.clearTimeout(timer)
      if (e.error === 'no-speech' || e.error === 'aborted') resolve([])
      else {
        if (['network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(e.error)) recognitionBroken = true
        reject(new Error(e.error))
      }
    }
    rec.onend = () => {
      window.clearTimeout(timer)
      resolve(got)
    }
    try {
      rec.start()
    } catch (err) {
      reject(err as Error)
    }
    timer = window.setTimeout(() => rec.stop(), timeoutMs)
  })
  return { result, stop: () => rec.stop() }
}

const clean = (s: string) => s.replace(/[\s，。！？、,.!?;；：:"'“”‘’（）()]/g, '')

function levenshtein(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/** Semelhança de 0 a 1 entre o que foi dito e o esperado (por caractere). */
export function similarity(said: string, expected: string): number {
  const a = [...clean(said)]
  const b = [...clean(expected)]
  if (!b.length) return 0
  if (a.join('').includes(b.join(''))) return 1
  return Math.max(0, 1 - levenshtein(a, b) / Math.max(a.length, b.length))
}

/** Homófonos comuns que o reconhecimento costuma trocar. */
const SAME_SOUND: string[][] = [['他', '她', '它'], ['吗', '嘛', '妈'], ['在', '再'], ['的', '得', '地'], ['是', '事', '市', '十']]

export function bestMatch(alternatives: string[], expected: string): number {
  const norm = (s: string) => {
    let out = s
    for (const group of SAME_SOUND) for (const ch of group.slice(1)) out = out.replaceAll(ch, group[0])
    return out
  }
  return alternatives.reduce((best, alt) => Math.max(best, similarity(norm(alt), norm(expected))), 0)
}
