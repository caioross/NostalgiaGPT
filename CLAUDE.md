# CLAUDE.md — NostalgiaGPT

Chat imersivo com 47 personalidades históricas. SPA **zero-build**: HTML5 + CSS3 + vanilla JS (+ jQuery 2.2.4 legado), OpenAI gpt-4o-mini chamada direto do frontend (uso local/pessoal). Repo **PÚBLICO** com comunidade real.

## Mapa do código

- `index.html` — o app inteiro (hero, carrossel coverflow, chat, modal gôndola, galeria)
- `js/personalities.js` — fonte da verdade: `CATEGORIES` (`ciencia`, `arte`, `filosofia`, `lideres`, `musica`, `lendas`) + `PEOPLE` com `{ name, cat, years, tagline, img }`; `slug` e `initials` são **derivados em runtime** (`slugify`/`initials`) — nunca os escreva à mão
- `js/mainJs.js` — chat (OpenAI), starters, modal, avatares; `esc()` obrigatório em todo conteúdo dinâmico
- `css/styles.css` — tema vintage (Cinzel + Lora, dourado sobre escuro), monogramas por categoria
- `persons/` — fotos reais (nomes de arquivo com espaços/acentos); sem foto → monograma automático
- `brusher-demo.min.js/.css` — efeito de pincel do hero (**em uso** via `index.html`; procedência em investigação na issue #9)

## Regras sagradas

1. **Zero-build é identidade**: nada de bundler, framework, npm ou dependência nova sem `decisao-dono`.
2. **Visual vintage é identidade**: não trocar paleta/tipografia sem `decisao-dono`.
3. **Repo público + segredos**: NUNCA commitar/imprimir chaves. `.env.local` existe localmente e é **intocável** (não ler, não mover, não commitar). `OPENAI_KEY` em `mainJs.js` fica sempre com o placeholder.
4. **XSS**: todo dado que vira HTML passa por `esc()`; atenção redobrada a `innerHTML` e jQuery `.html()`.
5. **jQuery está em extinção**: código novo em vanilla JS; migração gradual é bem-vinda.
6. Código, comentários, issues e PRs em **português do Brasil**.

## Gate (obrigatório verde antes de qualquer PR)

```bash
node scripts/gate.mjs
```

## Frota autônoma

3 rodadas por dia: **Curador** 12h20 · **Resolvedor** 16h20 · **PR Doctor** 21h20.
Lei da frota: `docs/fleet/HANDBOOK.md` · Receitas: `.claude/skills/ngpt-fleet-ops/` · Diário: issue #7.
