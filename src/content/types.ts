// Tipos do conteúdo de estudo do XinXon.

/** Uma palavra ou expressão do vocabulário. O `id` é o próprio hanzi. */
export interface Word {
  hanzi: string
  pinyin: string
  pt: string
  /** Observação curta (gramática, uso, mudança de tom). */
  note?: string
}

/** Sílaba usada no treino de tons (Módulo 0). */
export interface ToneSyllable {
  hanzi: string
  pinyin: string
  /** 1 a 4, ou 0 para o tom neutro. */
  tone: 0 | 1 | 2 | 3 | 4
  pt: string
}

/** Frase para montar, ouvir e falar. */
export interface Sentence {
  id: string
  hanzi: string
  pinyin: string
  pt: string
  /** Pedaços (em hanzi) usados no exercício de montar a frase, na ordem certa. */
  tokens: string[]
}

/** Pergunta de múltipla escolha livre (usada para os sons do pinyin). */
export interface QuizItem {
  id: string
  prompt: string
  options: string[]
  answer: string
  /** Hanzi de exemplo para tocar o som. */
  audio?: string
  explain: string
}

/** Dica mostrada antes da primeira sessão de uma lição. */
export interface Tip {
  title: string
  body: string
  /** Hanzi opcional para tocar como exemplo. */
  audio?: string
  example?: string
}

export interface Lesson {
  id: string
  unit: 'Fundação' | 'HSK 1'
  title: string
  subtitle: string
  tips: Tip[]
  words: Word[]
  tones?: ToneSyllable[]
  quiz?: QuizItem[]
  sentences: Sentence[]
  /** Caracteres que entram no treino de escrita. */
  trace: string[]
}

/** Informação de um caractere para o treino de escrita. */
export interface CharInfo {
  meaning: string
  mnemonic: string
}

export interface Wisdom {
  hanzi: string
  pinyin: string
  pt: string
  author?: string
}
