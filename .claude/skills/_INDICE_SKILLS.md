# Skills — NostalgiaGPT

> Projeto: SPA zero-build de chat com 47 personalidades históricas via OpenAI gpt-4o-mini.
> Caminho: `E:\Projetos\Sites\NostalgiaGPT`
> Git: `https://github.com/caioross/NostalgiaGPT.git` · branch `main`
> Estado: Beta funcional · Nota de saúde: 6/10 (ver `Relatorio_NostalgiaGPT.md`)
> Última atualização deste índice: 2026-06-20

---

## Skills disponíveis

| Skill | Quando usar |
|---|---|
| `nostalgia-content` | Criar nova personalidade histórica, escrever system prompt em primeira pessoa, curar referências culturais corretas por época, validar metadados (campo faltando, id duplicado, anacronia estrutural), escalar além das 47 personalidades atuais, corrigir erro factual em personalidade existente. |

---

## Skills _Common aplicáveis

| Skill _Common | Quando usar no NostalgiaGPT |
|---|---|
| `../web-security-audit` | Quando implementar backend proxy para OpenAI (P0 do relatório) ou Google OAuth — auditar rotas, CORS, rate limiting, gestão de chave da API. |
| `../secrets-guardian` | Se `.env.local` (com `GOOGLE_CLIENT_SECRET`) correr risco de ser commitado, ou ao rotacionar credenciais Google OAuth comprometidas. |
| `../git-hygiene` | Antes de qualquer commit com alterações em `js/personalities.js` — confirmar que `.env.local` não entrou no stage e que o histórico está limpo. |

---

## Contexto rápido do projeto

**Stack:** HTML5 · CSS3 · Vanilla JS · jQuery 2.2.4 · OpenAI gpt-4o-mini (direto do frontend)

**Arquivos críticos:**
- `js/personalities.js` — array de 47 personalidades (fonte da verdade)
- `js/mainJs.js` — lógica de chat; contém `OPENAI_KEY` hardcoded (uso local apenas)
- `persons/` — 8 fotos reais; demais usam monograma SVG gerado em CSS
- `.env.local` — credenciais Google OAuth (não versionado; confirmar `.gitignore`)

**Riscos P0 (do relatório):**
1. Chave OpenAI hardcoded — sem backend proxy, deploy público é inseguro
2. `.env.local` com `GOOGLE_CLIENT_SECRET` real na raiz — risco de commit acidental

**Próximo passo de produto:** backend mínimo (Supabase Edge Function ou Cloudflare Worker)
para proxear chamadas OpenAI. Quando isso acontecer, acionar `../web-security-audit`.
