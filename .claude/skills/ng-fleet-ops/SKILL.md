---
name: ng-fleet-ops
description: Operações da frota autônoma do NostalgiaGPT — claim, worktree, gate, PR, quórum adversarial, merge, limpeza e receitas gh/GraphQL do repo caioross/NostalgiaGPT. Use SEMPRE que uma rotina da frota (Curador, Resolvedor, PR Doctor) precisar de comandos concretos para reivindicar issue, criar worktree, rodar o gate, abrir/mergear PR, convocar quórum, limpar branches ou fazer triagem de Discussions.
---

# ng-fleet-ops — Operações da Frota NostalgiaGPT

A lei é `docs/fleet/HANDBOOK.md`; esta skill traz as receitas prontas. Em conflito, o HANDBOOK vence.

## §1 IDs e caminhos (não redescubra)

- Repo: `caioross/NostalgiaGPT` (**PÚBLICO**) · branch principal: `main` · toda operação remota: `gh -R caioross/NostalgiaGPT`
- Clone do dono (read-only para a frota): `E:\Projetos\Sites\NostalgiaGPT` (Git Bash: `/e/Projetos/Sites/NostalgiaGPT`)
- Worktrees: `/e/Projetos/Sites/NostalgiaGPT-wt/i<N>`
- Diário de Bordo: issue **#7** (a issue FIXADA "📓 Diário de Bordo da Frota"; nunca elegível)
- CI: workflow `gate` (`.github/workflows/gate.yml` → `node scripts/gate.mjs`)
- Rotinas: Curador (diário ~12h) · Resolvedor (diário ~16h) · PR Doctor (diário ~21h30)
- Labels de área (HANDBOOK §3): `area:conteudo` · `area:chat-core` · `area:ui-ux` · `area:seo-a11y` · `area:perf-assets` · `area:docs` · `area:infra`
- Skills irmãs: `nostalgia-content` (personalidades — em atualização, ver issue #10), `web-security-audit`, `secrets-guardian`

## §2 Claim — 3 checagens antes de pegar a issue <N>

```bash
gh issue view <N> -R caioross/NostalgiaGPT --json labels -q '.labels[].name' | grep -q em-resolucao && echo "OCUPADA (label)"
git -C /e/Projetos/Sites/NostalgiaGPT ls-remote --heads origin "auto/issue-<N>-*" | grep -q . && echo "OCUPADA (branch)"
gh pr list -R caioross/NostalgiaGPT --state open --json number,body -q '.[] | select(.body | test("#<N>\\b")) | .number' | grep -q . && echo "OCUPADA (PR)"
```

Livre → `gh issue edit <N> -R caioross/NostalgiaGPT --add-label em-resolucao`.

## §3 Worktree

```bash
cd /e/Projetos/Sites/NostalgiaGPT && git fetch origin
git worktree add "../NostalgiaGPT-wt/i<N>" -b "auto/issue-<N>-<slug-curto>" origin/main
cd "../NostalgiaGPT-wt/i<N>"
git rev-list --left-right --count origin/main...HEAD   # deve imprimir "0	0"
```

## §4 Gate

```bash
node scripts/gate.mjs   # dentro do worktree; zero dependências — NÃO existe npm install aqui
```

O gate valida (19 checagens): arquivos obrigatórios, sintaxe de `js/*.js`, o modelo `NostalgiaData` carregado de verdade (≥6 categorias, ≥40 personalidades, campos, slugs únicos, imagens existentes), invariantes do Brusher (área sagrada), referências locais do `index.html`, ausência de segredos e `OPENAI_KEY` = placeholder. Vermelho sem correção honesta no escopo → PR em DRAFT explicando (HANDBOOK §6). Mudança no gate = quórum §7.2.

## §5 PR

```bash
git push -u origin "auto/issue-<N>-<slug>"
gh pr create -R caioross/NostalgiaGPT --base main --title "<tipo>: <o quê>" --body "<corpo>"
```

Corpo mínimo: contexto, o que mudou e por quê, **resultado real do gate**, riscos. `Closes #N` SÓ se resolve a issue inteira; fatia parcial usa `Refs #N`. Depois do PR: remover `em-resolucao` da issue e comentar nela com o link.

## §6 Quórum adversarial (HANDBOOK §7.2)

3 subagentes em paralelo, cada um instruído a tentar VETAR com vetor concreto `arquivo:linha` (default = vetar na dúvida):

1. **Técnica** — corretude JS/DOM, regressão no chat/gôndola/filtros, compatibilidade zero-build
2. **Segurança** — XSS no render do chat (`esc()`, `innerHTML`, `.html()`), segredos no diff, injeção via conteúdo de personalidade
3. **Produto** — Brusher intacto, tema dark vintage preservado, historicidade/anacronia do conteúdo

3× APROVA → merge registrando o veredito das 3 lentes no parecer da PR. Veto real → reparar e re-convocar UMA vez; persistiu → DRAFT + `decisao-dono`.

## §7 Merge e limpeza

```bash
gh pr merge <PR> -R caioross/NostalgiaGPT --squash --delete-branch   # erro ao apagar branch local é esperado — confirme estado MERGED
cd /e/Projetos/Sites/NostalgiaGPT && git worktree list
git worktree remove "../NostalgiaGPT-wt/i<N>" && git worktree prune   # SÓ de branch mergeada
git branch -D "auto/issue-<N>-<slug>" 2>/dev/null || true             # local, já mergeada
```

NUNCA remova worktree de branch não mergeada com commits não enviados.

## §8 Discussions (triagem leve)

```bash
gh api graphql -f query='{ repository(owner:"caioross", name:"NostalgiaGPT") { discussions(first:10, orderBy:{field:UPDATED_AT, direction:DESC}) { nodes { id number title url category{name} isAnswered comments(first:1){totalCount} } } } }'
```

Responder (use o `id` do node retornado acima):

```bash
gh api graphql -f query='mutation { addDiscussionComment(input:{discussionId:"<ID>", body:"<resposta>"}) { comment { url } } }'
```

ICE das Ideas: HANDBOOK §9 (≥48 → issue P1/P2; 20–47 → P3; <20 não converte; sempre fechar o loop na thread). Sem atividade nova → siga em frente; não crie posts de rotina.

## §9 Gotchas

- Windows: caminhos com espaço → sempre entre aspas; Git Bash usa `/e/...`.
- `persons/` tem nomes de arquivo com espaço e acento (ex.: `Cleópatra.jpg`) — no shell, aspas sempre.
- **NUNCA tocar em `.env*`** (existe só no clone do dono e contém segredo real; worktrees novos não o contêm — e deve continuar assim). Nunca imprimir segredo, nem mascarado.
- `brusher-demo.min.js/.css` e demais `*.min.*` são vendored: não formatar, não editar, não "otimizar". O Brusher é área sagrada (HANDBOOK §2).
- `slug` e `initials` NÃO existem no fonte — são derivados em runtime por `slugify`/`initials` em `js/personalities.js`. Novas personalidades: uma linha no formato do array `PEOPLE`, só `{ name, cat, years, tagline, img }`.
- Issues #1, #3 e #4 são de humanos da comunidade (2023) e podem se referir a código antigo — HANDBOOK §10: revalidar contra o código atual antes de agir; fechar só com evidência.
- A branch `legacy-2023` citada no HANDBOOK §5/§10 pode ainda não existir — se ausente, apenas não a crie nem a procure; siga o §10 revalidando contra o código atual.
- Houve setup da frota em duas sessões paralelas em 2026-07-07; se encontrar artefato duplicado (Diário, skill de ops, labels antigas `area:chat`/`area:ui`/`area:a11y`/`area:seguranca`), consolide no canônico (Diário = #7 fixada; skill = esta; labels = as do HANDBOOK §3) e registre no Diário.
