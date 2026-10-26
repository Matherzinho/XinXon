// Lista todos os textos que o app fala (em chinês e em português) para gerar os áudios.
import { CHARS, LESSONS, WISDOM } from '../src/content/index.ts'

const zh = new Map<string, string>() // texto -> pinyin conhecido (quando houver)
const pt = new Set<string>()
const add = (t?: string, py = '') => {
  if (t && !zh.has(t)) zh.set(t, py)
}

for (const l of LESSONS) {
  for (const w of l.words) {
    add(w.hanzi, w.pinyin)
    pt.add(w.pt)
  }
  for (const t of l.tones ?? []) add(t.hanzi, t.pinyin)
  for (const q of l.quiz ?? []) add(q.audio)
  for (const s of l.sentences) {
    add(s.hanzi, s.pinyin)
    pt.add(s.pt)
    for (const tok of s.tokens) add(tok)
  }
  for (const tip of l.tips) add(tip.audio)
  for (const c of l.trace) add(c)
}
for (const c of Object.keys(CHARS)) add(c)
for (const w of WISDOM) add(w.hanzi, w.pinyin)

console.log(JSON.stringify({ zh: [...zh].map(([text, pinyin]) => ({ text, pinyin })), pt: [...pt] }, null, 1))
