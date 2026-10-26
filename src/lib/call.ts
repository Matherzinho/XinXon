// Ligação de voz com o Prof. Zhonghua (Gemini Live, áudio em tempo real).
// Microfone → PCM 16 kHz → WebSocket; resposta do Prof → PCM 24 kHz → alto-falante.

export type CallState = 'conectando' | 'ouvindo' | 'falando' | 'encerrada' | 'erro'

export interface CallEvents {
  onState: (s: CallState) => void
  onTranscript: (role: 'user' | 'prof', text: string, final: boolean) => void
  onError: (msg: string) => void
}

const WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

// Captura o microfone, reduz para 16 kHz e manda blocos de ~100 ms.
const WORKLET = `
class Mic extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.ratio = sampleRate / 16000; this.pos = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      this.pos += 1
      if (this.pos >= this.ratio) { this.pos -= this.ratio; this.buf.push(ch[i]) }
    }
    if (this.buf.length >= 1600) {
      const out = new Int16Array(this.buf.length)
      for (let i = 0; i < this.buf.length; i++) out[i] = Math.max(-1, Math.min(1, this.buf[i])) * 0x7fff
      this.port.postMessage(out.buffer, [out.buffer])
      this.buf = []
    }
    return true
  }
}
registerProcessor('mic', Mic)
`

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function fromBase64(b64: string): Int16Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

export class LiveCall {
  private ws: WebSocket | null = null
  private stream: MediaStream | null = null
  private micCtx: AudioContext | null = null
  private outCtx: AudioContext | null = null
  private nextTime = 0
  private sources: AudioBufferSourceNode[] = []
  private muted = false
  private ended = false
  private ev: CallEvents
  private system: string

  constructor(system: string, ev: CallEvents) {
    this.system = system
    this.ev = ev
  }

  async start() {
    this.ev.onState('conectando')
    try {
      // Pede o microfone primeiro (precisa do toque do usuário).
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
    } catch {
      return this.fail('Não consegui usar o microfone. Libere o acesso ao microfone para este site e tente de novo.')
    }
    this.outCtx = new AudioContext({ sampleRate: 24000 })
    void this.outCtx.resume()

    const r = await fetch('/api/ligacao', { method: 'POST' }).catch(() => null)
    const data = r ? await r.json().catch(() => ({})) : {}
    if (!r || !r.ok || !data.token) {
      return this.fail(r?.status === 503 ? 'O Prof ainda não foi ligado (falta a chave do Gemini).' : 'Não consegui ligar para o Prof agora. Tenta de novo daqui a pouco.')
    }

    const ws = new WebSocket(`${WS}?access_token=${encodeURIComponent(data.token)}`)
    this.ws = ws
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${data.model}`,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            },
            systemInstruction: { parts: [{ text: this.system }] },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        }),
      )
    }
    ws.onmessage = async (e) => {
      const raw = typeof e.data === 'string' ? e.data : await (e.data as Blob).text()
      let msg: any
      try {
        msg = JSON.parse(raw)
      } catch {
        return
      }
      if (msg.setupComplete) {
        await this.startMic()
        this.ev.onState('ouvindo')
        // O Prof começa a conversa.
        ws.send(JSON.stringify({ realtimeInput: { text: '(O aluno atendeu a ligação. Cumprimente e comece a conversa.)' } }))
        return
      }
      const sc = msg.serverContent
      if (!sc) return
      if (sc.interrupted) this.stopPlayback()
      if (sc.inputTranscription?.text) this.ev.onTranscript('user', sc.inputTranscription.text, false)
      if (sc.outputTranscription?.text) this.ev.onTranscript('prof', sc.outputTranscription.text, false)
      for (const part of sc.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) this.play(fromBase64(part.inlineData.data), part.inlineData.mimeType)
      }
      if (sc.turnComplete) {
        this.ev.onTranscript('prof', '', true)
      }
    }
    ws.onerror = () => this.fail('A ligação caiu. Tenta de novo.')
    ws.onclose = (e) => {
      if (!this.ended) {
        if (e.code !== 1000) this.fail(e.reason ? `A ligação caiu (${e.reason.slice(0, 120)}).` : 'A ligação caiu. Tenta de novo.')
        else this.stop()
      }
    }
  }

  private async startMic() {
    if (!this.stream) return
    const ctx = new AudioContext()
    this.micCtx = ctx
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    await ctx.audioWorklet.addModule(url)
    const src = ctx.createMediaStreamSource(this.stream)
    const node = new AudioWorkletNode(ctx, 'mic')
    node.port.onmessage = (e) => {
      if (this.muted || this.ws?.readyState !== WebSocket.OPEN) return
      this.ws.send(JSON.stringify({ realtimeInput: { audio: { data: toBase64(e.data), mimeType: 'audio/pcm;rate=16000' } } }))
    }
    src.connect(node)
  }

  private play(pcm: Int16Array, mime?: string) {
    const ctx = this.outCtx
    if (!ctx) return
    const rate = Number(/rate=(\d+)/.exec(mime ?? '')?.[1] ?? 24000)
    const buf = ctx.createBuffer(1, pcm.length, rate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    const at = Math.max(ctx.currentTime + 0.03, this.nextTime)
    src.start(at)
    this.nextTime = at + buf.duration
    this.sources.push(src)
    this.ev.onState('falando')
    src.onended = () => {
      this.sources = this.sources.filter((s) => s !== src)
      if (!this.sources.length && !this.ended) this.ev.onState('ouvindo')
    }
  }

  private stopPlayback() {
    for (const s of this.sources) {
      try {
        s.stop()
      } catch {
        /* já parou */
      }
    }
    this.sources = []
    this.nextTime = 0
  }

  /** Manda texto no meio da ligação (ex.: um atalho). */
  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ realtimeInput: { text } }))
  }

  setMuted(m: boolean) {
    this.muted = m
  }

  private fail(msg: string) {
    if (this.ended) return
    this.ev.onError(msg)
    this.cleanup()
    this.ev.onState('erro')
  }

  stop() {
    if (this.ended) return
    this.cleanup()
    this.ev.onState('encerrada')
  }

  private cleanup() {
    this.ended = true
    this.stopPlayback()
    try {
      this.ws?.close(1000)
    } catch {
      /* ok */
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.micCtx?.close().catch(() => {})
    void this.outCtx?.close().catch(() => {})
  }
}

export function callInstructions(name: string, known: string[]): string {
  return `Você é o Prof. Zhonghua (中华老师), professor de mandarim nativo de Pequim que mora no Brasil há muitos anos e fala português brasileiro perfeitamente, com naturalidade. Você está numa LIGAÇÃO DE VOZ com ${name}, um aluno brasileiro iniciante (nível HSK 1).

Jeito de falar:
- Fale como uma pessoa de verdade numa chamada: caloroso, animado, frases curtas, sem listas nem textos longos. Turnos de no máximo uns 15 segundos.
- Converse principalmente em chinês simples, devagar e bem claro, usando de preferência palavras que o aluno já estudou: ${known.join('、') || 'ainda nenhuma'}.
- Depois de cada frase em chinês que talvez ele não entenda, explique rapidinho em português o que você disse.
- Termine sempre com uma pergunta simples em chinês para ele responder, e diga em português como ele pode responder se ele travar.
- Se ele falar em português, responda em português e ensine como dizer aquilo em chinês, pedindo para ele repetir.
- Corrija a pronúncia e os tons com carinho: repita a forma certa devagar, diga qual tom estava errado (ex.: "hǎo é terceiro tom, desce e sobe"), e peça para ele tentar de novo.
- Comemore os acertos ("太好了！Muito bem!").
- Nunca diga que é uma IA a menos que perguntem diretamente.`
}
