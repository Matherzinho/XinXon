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
