---
name: ngpt-fleet-ops
description: Operações da frota autônoma do NostalgiaGPT — worktree, claim, gate, PR, quórum adversarial, merge, limpeza e receitas gh/GraphQL do repo caioross/NostalgiaGPT. Use SEMPRE que uma rotina da frota (Curador, Resolvedor, PR Doctor) precisar de comandos concretos para reivindicar issue, criar worktree, rodar o gate, abrir/mergear PR, convocar quórum, limpar branches ou triagem de Discussions.
---

# ngpt-fleet-ops — Operações da Frota NostalgiaGPT

## §1 IDs e caminhos (não redescubra)

- Repo: `caioross/NostalgiaGPT` (**PÚBLICO**) · branch principal: `main` · toda operação remota: `gh -R caioross/NostalgiaGPT`
- Clone do dono (read-only para a frota): `E:\Projetos\Sites\NostalgiaGPT` (Git Bash: `/e/Projetos/Sites/NostalgiaGPT`)
- Worktrees: `/e/Projetos/Sites/NostalgiaGPT-wt/i<N>`
- Diário de Bordo: issue **#7** (pinada; nunca elegível para resolução)
- Lei: `docs/fleet/HANDBOOK.md` · CI: workflow `gate` (roda `node scripts/gate.mjs`)
- Skills irmãs: `nostalgia-content` (personalidades — em atualização, ver issue #10), `web-security-audit`, `secrets-guardian`

## §2 Claim — 3 checagens antes de pegar a issue <N>

```bash
gh issue view <N> -R caioross/NostalgiaGPT --json labels -q '.labels[].name' | grep -q em-resolucao && echo "OCUPADA (label)"
git -C /e/Projetos/Sites/NostalgiaGPT ls-remote --heads origin "auto/issue-<N>-*" | grep -q . && echo "OCUPADA (branch)"
gh pr list -R caioross/NostalgiaGPT --state open --json number,title,body -q '.[] | select(.body | test("#<N>\\b")) | .number' | grep -q . && echo "OCUPADA (PR)"
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
node scripts/gate.mjs   # dentro do worktree; sem package manager — projeto zero-build
```

Cobre: sintaxe de todo `.js` versionado (exceto `*.min.js`), padrões de segredo, referências locais do `index.html`, sanidade do `personalities.js` (≥40 nomes, slugs sem colisão, categorias válidas, fotos existentes). O gate NÃO abre navegador — mudança visual relevante merece descrição do teste manual no corpo da PR.

## §5 PR

```bash
git push -u origin "auto/issue-<N>-<slug>"
gh pr create -R caioross/NostalgiaGPT --base main --title "<tipo>: <o quê>" --body "<corpo>"
```

Corpo mínimo: contexto, o que mudou e por quê, **resultado real do gate**, riscos. `Closes #N` SÓ se resolve a issue inteira; fatia parcial usa `Refs #N`. Depois do PR: remover `em-resolucao` da issue e comentar nela com o link.

## §6 Quórum adversarial (HANDBOOK §7.2)

3 subagentes em paralelo, cada um instruído a tentar VETAR com vetor concreto `arquivo:linha` (default = vetar na dúvida):

1. **AppSec** — XSS/escape (`esc()`, `innerHTML`, `.html()`), injeção via conteúdo de personalidade, segredos no diff, CSP
2. **Experiência** — regressão do visual vintage, carrossel/modal quebrados, a11y (ARIA/teclado/foco), mobile
3. **Domínio** — historicidade/anacronia, categorias válidas, derivação de slug intacta, coerência do modelo `{name, cat, years, tagline, img}`

3× APROVA → merge registrando o veredito das 3 lentes no parecer da PR. Veto real → reparar e re-convocar UMA vez; persistiu → DRAFT + `decisao-dono`.

## §7 Merge e limpeza

```bash
gh pr merge <PR> -R caioross/NostalgiaGPT --squash --delete-branch   # exit 1 ao apagar branch local é esperado — confirme estado MERGED
cd /e/Projetos/Sites/NostalgiaGPT && git worktree list
git worktree remove "../NostalgiaGPT-wt/i<N>" && git worktree prune   # SÓ de branch mergeada
git branch -D "auto/issue-<N>-<slug>" 2>/dev/null || true             # local, já mergeada
```

NUNCA remova worktree de branch não mergeada com commits não enviados.

## §8 Discussions (triagem leve)

```bash
gh api graphql -f query='{ repository(owner:"caioross", name:"NostalgiaGPT") { discussions(first:10, orderBy:{field:UPDATED_AT, direction:DESC}) { nodes { number title url category{name} isAnswered comments(first:1){totalCount} } } } }'
```

Responder (pegue o `id` do node da discussion antes, com `... on Discussion { id }`):

```bash
gh api graphql -f query='mutation { addDiscussionComment(input:{discussionId:"<ID>", body:"<resposta>"}) { comment { url } } }'
```

Sem atividade nova → siga em frente. Não crie posts de rotina em Discussions.

## §9 Gotchas

- Windows: caminhos com espaço → sempre entre aspas; Git Bash usa `/e/...`.
- `persons/` tem nomes de arquivo com espaço e acento (ex.: `Cleópatra.jpg`) — no shell, aspas sempre.
- **NUNCA tocar em `.env.local`** (existe só no clone do dono e contém segredo real; worktrees novos não o contêm — e deve continuar assim).
- `*.min.js` / `*.min.css` são vendored: não formatar, não editar, não "melhorar".
- Issues #1, #3 e #4 são de humanos da comunidade (2023): responder com respeito, fechar só com evidência (commit/PR/teste que comprove).
- `slug` e `initials` NÃO existem no fonte — são derivados em runtime. Validação de dados: siga o formato de uma linha por personagem em `PEOPLE`.
