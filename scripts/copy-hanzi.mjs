// Copia os dados de traços (Hanzi Writer / Make Me a Hanzi) de cada caractere
// usado no conteúdo para public/hanzi/, para o treino de escrita funcionar offline.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'node_modules', 'hanzi-writer-data')
const outDir = join(root, 'public', 'hanzi')
mkdirSync(outDir, { recursive: true })

const sources = ['src/content/lessons.ts', 'src/content/chars.ts']
const chars = new Set()
for (const file of sources) {
  for (const ch of readFileSync(join(root, file), 'utf8').match(/[一-鿿]/g) ?? []) chars.add(ch)
}

let copied = 0
const missing = []
for (const ch of chars) {
  const src = join(dataDir, `${ch}.json`)
  if (existsSync(src)) {
    copyFileSync(src, join(outDir, `${ch}.json`))
    copied++
  } else missing.push(ch)
}
console.log(`hanzi: ${copied} caracteres copiados${missing.length ? `, sem dados: ${missing.join('')}` : ''}`)
