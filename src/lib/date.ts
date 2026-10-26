// Datas no fuso do aparelho, no formato AAAA-MM-DD.

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Diferença em dias inteiros entre duas datas AAAA-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Os 7 dias da semana atual (segunda a domingo). */
export function currentWeek(today: string = dayKey()): string[] {
  const d = parseDay(today)
  const offset = (d.getDay() + 6) % 7 // segunda = 0
  const monday = addDays(today, -offset)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Número do dia desde uma data fixa (para escolher a sabedoria do dia). */
export function dayNumber(key: string = dayKey()): number {
  return Math.floor(parseDay(key).getTime() / 86_400_000)
}
