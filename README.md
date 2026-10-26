# XinXon · Chinês em português

App web (instalável no celular) para aprender chinês em português, com sessões rápidas de 5 minutos, gamificação pensada para TDAH e modo dupla.

## O que já tem (v0.1)

- **Trilha**: Fundação (os 4 tons, sons do pinyin, primeiros traços) + 6 lições do HSK 1 (cumprimentos, números, família, apresentações, comida, tempo).
- **Modos ouvir/falar** na tela inicial: Silencioso, Escuta, Fala e Turbo (estilo Pimsleur). Dá para trocar no meio da sessão.
- **Exercícios**: significado, escrever em hanzi, ouvir e escolher, identificar o tom, sons do pinyin, montar frase, ditado, falar em voz alta (com reconhecimento de voz quando o navegador permite) e traçar caracteres com macetes em português.
- **Pronúncia**: áudio gravado (normal e bem devagar, botão da tartaruga), sílaba por sílaba, pinyin colorido por tom e dicas "Como falar" comparando com sons do português.
- **Revisão espaçada** (caixas de Leitner): o que você erra volta logo; o que acerta demora mais para voltar.
- **Gamificação**: XP, combo, ofensiva com congelamento, jiaozinhos (moeda), baú surpresa e sabedoria do dia.
- **Caderno**: palavras aprendidas, caracteres com animação dos traços e coleção de sabedorias.
- **Dupla**: placar da semana, ofensiva do casal, cutucadas, presentes e bilhetes (precisa da nuvem).
- **PWA**: instala na tela inicial e funciona offline depois de aberto uma vez.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem configurar nada, o app funciona só no aparelho (progresso salvo no navegador).

## Ligar a nuvem (progresso entre aparelhos + modo dupla)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel do projeto, abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** (assim ninguém precisa confirmar e-mail para entrar). Opcional, mas deixa mais fácil.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
5. Coloque essas duas informações como variáveis de ambiente (no `.env.local` para rodar no computador, ou na Vercel):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Publicar na Vercel

1. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e importe este repositório do GitHub.
2. Em **Environment Variables**, adicione as duas variáveis acima.
3. Clique em **Deploy**. Cada novo commit no GitHub atualiza o site sozinho.

## Estrutura

- `src/content/`: lições, macetes dos caracteres e sabedorias (é aqui que se adiciona conteúdo novo).
- `src/lib/session.ts`: monta cada sessão de 5 minutos.
- `src/lib/srs.ts`: revisão espaçada.
- `src/components/exercises/`: cada tipo de exercício.
- `src/pages/`: telas do app.
- `supabase/schema.sql`: banco de dados e regras de acesso.

## Créditos

- Dados de traços dos caracteres: [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) via [Hanzi Writer](https://hanziwriter.org) (Arphic Public License).
- Áudio em chinês: voz gerada com [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (modelo Matcha treinado no dataset Baker, uso não comercial).
- Áudio em português: voz Piper pt_BR "faber" (dataset CC0).
- Mascote: arte do panda-vermelho criada pelo autor do projeto.

## Adicionar conteúdo com áudio

Depois de editar `src/content/`, gere os áudios novos com `scripts/gerar-audios.py` (instruções no topo do arquivo). Textos sem áudio gravado usam a voz do navegador.
