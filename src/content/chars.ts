import type { CharInfo } from './types'

// Macetes (em português) para cada caractere do treino de escrita.
// A ideia: entender as peças em vez de decorar um desenho.

export const CHARS: Record<string, CharInfo> = {
  一: { meaning: 'um', mnemonic: 'Um traço = um.' },
  二: { meaning: 'dois', mnemonic: 'Dois traços = dois. O de baixo é mais comprido, como um chão.' },
  三: { meaning: 'três', mnemonic: 'Três traços = três.' },
  人: { meaning: 'pessoa', mnemonic: 'Uma pessoa caminhando: duas pernas abertas.' },
  口: { meaning: 'boca', mnemonic: 'Uma boca aberta, quadradinha.' },
  大: { meaning: 'grande', mnemonic: 'Uma pessoa (人) abrindo bem os braços (一): "deste tamanho!" = grande.' },
  你: { meaning: 'você', mnemonic: '亻 (pessoa) + 尔: aquela pessoa ali, na sua frente = você.' },
  好: { meaning: 'bom', mnemonic: '女 (mulher) + 子 (criança): mãe com filho = algo bom.' },
  我: { meaning: 'eu', mnemonic: 'Uma mão (手) segurando uma lança (戈): eu me defendo = eu.' },
  四: { meaning: 'quatro', mnemonic: 'Uma caixa de quatro cantos com duas perninhas dentro.' },
  五: { meaning: 'cinco', mnemonic: 'Céu em cima, chão embaixo e um zigue-zague no meio: os cinco elementos.' },
  六: { meaning: 'seis', mnemonic: 'Uma pessoa de chapéu (亠) dançando com as duas pernas abertas.' },
  七: { meaning: 'sete', mnemonic: 'Parece um 7 de cabeça para baixo cortado por um traço.' },
  八: { meaning: 'oito', mnemonic: 'Dois traços se abrindo, como um bigode.' },
  九: { meaning: 'nove', mnemonic: 'Lembra um "n" com um gancho no fim: "n" de nove.' },
  十: { meaning: 'dez', mnemonic: 'Uma cruz, como o X romano de dez, girado.' },
  他: { meaning: 'ele', mnemonic: '亻 (pessoa) + 也: ele.' },
  她: { meaning: 'ela', mnemonic: '女 (mulher) + 也: ela. Mesmo som de 他, mas com a peça de mulher!' },
  是: { meaning: 'ser, é', mnemonic: '日 (sol) em cima de algo certinho: debaixo do sol, é verdade = ser.' },
  妈: { meaning: 'mãe', mnemonic: '女 (mulher) + 马 (cavalo, som "mǎ"): a mulher do som "ma" = mãe.' },
  中: { meaning: 'meio', mnemonic: 'Uma caixa (口) atravessada bem no meio por uma linha = centro. A China é o "país do meio".' },
  国: { meaning: 'país', mnemonic: 'Um muro (囗) protegendo um jade (玉) = país.' },
  不: { meaning: 'não', mnemonic: 'Um traço no alto (一) barrando algo que tenta crescer: não!' },
  叫: { meaning: 'chamar', mnemonic: '口 (boca) do lado: a boca chamando alguém = chamar(-se).' },
  吃: { meaning: 'comer', mnemonic: '口 (boca) + 乞 (pedir): a boca pedindo comida = comer.' },
  喝: { meaning: 'beber', mnemonic: '口 (boca) + 曷 (som "hé"): a boca bebendo = beber.' },
  水: { meaning: 'água', mnemonic: 'Um rio no meio com gotas respingando dos lados = água.' },
  茶: { meaning: 'chá', mnemonic: '艹 (erva) em cima, 人 (pessoa) no meio, 木 (árvore) embaixo: alguém colhendo folhas = chá.' },
  今: { meaning: 'agora, hoje', mnemonic: 'Um telhado (人) cobrindo o momento presente = agora, hoje.' },
  天: { meaning: 'céu, dia', mnemonic: '一 (o céu) em cima de 大 (pessoa grande): o céu acima de todos = céu, dia.' },
  明: { meaning: 'claro', mnemonic: '日 (sol) + 月 (lua): os dois juntos = claro, brilhante. 明天 = o próximo dia claro = amanhã.' },
  月: { meaning: 'lua, mês', mnemonic: 'Uma lua crescente com duas marquinhas = lua, mês.' },
}
