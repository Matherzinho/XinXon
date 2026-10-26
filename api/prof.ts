import { allowed, generate, GeminiError, json, TEXT_MODELS } from './_gemini'

interface Msg {
  role: 'user' | 'prof'
  text: string
}

const SYSTEM = `Você é o Prof. Zhonghua (中华老师), um professor chinês nativo de Pequim que mora no Brasil há anos e fala português brasileiro fluente. Você conversa com um aluno brasileiro iniciante (nível HSK 1) num app de estudo.

Como conversar:
- Puxe uma conversa simples EM CHINÊS, com frases bem curtas (até ~10 caracteres cada), usando de preferência as palavras que o aluno já conhece (lista abaixo). No máximo 1 palavra nova por resposta.
- Termine cada resposta em chinês com uma pergunta simples para a conversa continuar.
- O aluno pode escrever em pinyin sem tons, com erros (ex.: "ni hao wa shi baxi ren" = 你好，我是巴西人). Entenda a intenção. Se houver erro, corrija com carinho numa parte em português curta (ex.: "Quase! É wǒ, não wa.").
- Se o aluno escrever EM PORTUGUÊS perguntando o que você disse, explique em português, palavra por palavra quando ajudar.
- Se ele perguntar como responder ou como dizer algo, ensine a frase em chinês (com pinyin e tradução) e incentive ele a mandar a frase para você.
- Se ele pedir mais devagar/mais simples, simplifique.
- Seja animado e encorajador, como um amigo. Nada de textos longos: no máximo 3 partes por resposta.
- Toda parte "zh" precisa ter hanzi simplificado, pinyin com marcas de tom (ex.: nǐ hǎo) e tradução em português.
- Em "sugestoes", dê 1 ou 2 respostas curtas em chinês que o aluno poderia usar agora.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    partes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tipo: { type: 'STRING', enum: ['zh', 'pt'] },
          texto: { type: 'STRING', description: 'texto em português (para tipo pt)' },
          hanzi: { type: 'STRING' },
          pinyin: { type: 'STRING' },
          pt: { type: 'STRING', description: 'tradução em português (para tipo zh)' },
        },
        required: ['tipo'],
      },
    },
    sugestoes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { hanzi: { type: 'STRING' }, pinyin: { type: 'STRING' }, pt: { type: 'STRING' } },
        required: ['hanzi', 'pinyin', 'pt'],
      },
    },
  },
  required: ['partes'],
}

export async function POST(req: Request): Promise<Response> {
  if (!allowed(req)) return json({ error: 'origem não permitida' }, 403)
  let body: { history?: Msg[]; known?: string[]; name?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }
  const history = (body.history ?? []).slice(-16).map((m) => ({ role: m.role, text: String(m.text).slice(0, 600) }))
  if (!history.length) history.push({ role: 'user', text: '(O aluno acabou de abrir a conversa. Cumprimente e comece.)' })
  const known = (body.known ?? []).slice(0, 120).join('、') || '(ainda nenhuma)'
  const name = String(body.name ?? 'aluno').slice(0, 30)

  try {
    const data = await generate(TEXT_MODELS, {
      systemInstruction: { parts: [{ text: `${SYSTEM}\n\nNome do aluno: ${name}\nPalavras que o aluno já estudou: ${known}` }] },
      contents: history.map((m) => ({ role: m.role === 'prof' ? 'model' : 'user', parts: [{ text: m.text }] })),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        temperature: 0.8,
        maxOutputTokens: 1200,
        // Conversa rápida: pouco "pensamento" antes de responder.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    })
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    const parsed = JSON.parse(text)
    return json(parsed)
  } catch (e) {
    const status = e instanceof GeminiError ? e.status : 500
    const msg = (e as Error).message
    return json({ error: msg }, msg.includes('GEMINI_API_KEY') ? 503 : status === 429 || status === 503 ? 429 : 502)
  }
}
