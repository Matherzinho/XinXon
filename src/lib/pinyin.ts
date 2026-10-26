// Utilidades de pinyin: descobrir o tom e tirar as marcas.

const MARKS: Record<string, [string, 1 | 2 | 3 | 4]> = {
  ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4],
  ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4],
  ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4],
  ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4],
  ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4],
  ǖ: ['ü', 1], ǘ: ['ü', 2], ǚ: ['ü', 3], ǜ: ['ü', 4],
}

export function stripTones(pinyin: string): string {
  return [...pinyin].map((c) => MARKS[c]?.[0] ?? c).join('')
}

export function toneOf(syllable: string): 0 | 1 | 2 | 3 | 4 {
  for (const c of syllable) if (MARKS[c]) return MARKS[c][1]
  return 0
}

export const TONE_NAMES: Record<number, string> = {
  1: '1º tom · alto e reto',
  2: '2º tom · sobe',
  3: '3º tom · desce e sobe',
  4: '4º tom · desce',
  0: 'Tom neutro · leve',
}

/** Desenho do contorno de cada tom (SVG path num quadro 40×40, de 5 a 35). */
export const TONE_PATHS: Record<number, string> = {
  1: 'M6 10 H34',
  2: 'M6 30 L34 8',
  3: 'M6 16 Q16 38 26 30 L34 14',
  4: 'M6 8 L34 32',
  0: 'M17 22 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0',
}

// ---------- Sílabas, cores dos tons e dicas de pronúncia ----------

const VOWELS = 'aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'
const SYL = new RegExp(`(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[${VOWELS}]+(?:ng|n(?![${VOWELS}])|r(?![${VOWELS}]))?`, 'gi')

/** "Zhōngguó rén" → ["Zhōng", "guó", "rén"]. */
export function splitSyllables(pinyin: string): string[] {
  return pinyin.replace(/'/g, ' ').match(SYL) ?? []
}

/** Cores dos tons (com brilho diferente, para não depender só da cor). */
export const TONE_COLORS: Record<number, string> = {
  1: '#FF7B7B',
  2: '#FFC93C',
  3: '#6FC8FF',
  4: '#D3B2FF',
  0: '#B9AFC8',
}

const INITIAL_TIPS: [RegExp, string][] = [
  [/^zh/, 'zh: um "dj" com a ponta da língua enrolada para trás'],
  [/^ch/, 'ch: um "tch" com a língua enrolada e um sopro de ar'],
  [/^sh/, 'sh: o "ch" de "chá", com a língua enrolada'],
  [/^r/, 'r: parecido com o "j" de "já", língua enrolada (não é o r do português)'],
  [/^x/, 'x: um "ch" bem leve, sorrindo, língua atrás dos dentes de baixo'],
  [/^q/, 'q: um "tchi" com sopro, sorrindo'],
  [/^j/, 'j: um "dji" sem sopro, sorrindo'],
  [/^z(?!h)/, 'z: como "dz", sem sopro'],
  [/^c(?!h)/, 'c: como "ts" com sopro (tipo "tsé")'],
  [/^h/, 'h: sai da garganta, como o "rr" de "carro" no sotaque carioca'],
  [/^[ptk]/, 'p, t, k: com um sopro forte, como se fosse apagar uma vela'],
  [/^[bdg]/, 'b, d, g: soam quase como p, t, k do português, sem sopro'],
]

const FINAL_TIPS: [RegExp, string][] = [
  [/^(zh|ch|sh|r|z|c|s)i$/, 'i depois de zh/ch/sh/r/z/c/s quase não soa: é um zumbido do som anterior'],
  [/^[jqxy]u/, 'u depois de j, q, x, y é um ü: fale "i" fazendo biquinho'],
  [/ü/, 'ü: fale "i" fazendo biquinho de "u"'],
  [/ui$/, '-ui soa "uei" (como em "guei")'],
  [/iu$/, '-iu soa "iou"'],
  [/[^y]un$/, '-un soa "uen"'],
  [/ian$/, '-ian soa "iên"'],
  [/^[^aeiouy]*e(n|ng)?$/, 'e sozinho: um "â" do fundo da garganta'],
  [/ong$/, '-ong: um "ung" nasal, no fundo da boca'],
  [/ao$/, 'ao: como "au"'],
  [/ou$/, 'ou: como "ôu"'],
  [/ei$/, 'ei: como "êi"'],
]

/** Dicas curtas (máx. 3) para os sons difíceis de uma palavra, em português. */
export function soundTips(pinyin: string, max = 3): string[] {
  const out: string[] = []
  for (const syl of splitSyllables(pinyin)) {
    const s = stripTones(syl).toLowerCase()
    // Uma dica para o começo (consoante) e uma para o fim (vogais) de cada sílaba.
    for (const list of [INITIAL_TIPS, FINAL_TIPS]) {
      const hit = list.find(([re]) => re.test(s))
      if (hit && !out.includes(hit[1])) out.push(hit[1])
    }
    if (out.length >= max) break
  }
  return out.slice(0, max)
}
