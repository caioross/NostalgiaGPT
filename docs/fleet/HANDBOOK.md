# 📖 HANDBOOK da Frota — NostalgiaGPT

> Versão 1.0 · 2026-07-07 · **A lei das rotinas autônomas deste repositório.**
> Toda rotina agendada (Curador, Resolvedor, PR Doctor) obedece a este documento.
> Receitas operacionais (comandos prontos): skill `.claude/skills/ng-fleet-ops/`.

---

## §1 — Missão e ritmo

O NostalgiaGPT é um **projeto satélite**: divide tempo e tokens com o SkillDepot
(principal), o CodeRacer e outros. A frota é **calma e objetiva**:

| Rotina | Horário | Função em uma linha |
|---|---|---|
| **Curador** | diário 12h20 | Triagem, backlog saudável, ≤2 issues excelentes/dia; domingo publica o [Plano] |
| **Resolvedor** | diário 16h20 | Resolve **1 issue** ponta a ponta em worktree, passa o gate, abre PR |
| **PR Doctor** | diário 21h20 | Revisa, repara, faz quórum quando preciso e mergeia ≤2 PRs; limpa worktrees |

Regra de ouro do ritmo: **rodada curta, entrega pequena e bem-feita.** Se não der
para fazer BEM na rodada, não faça — deixe registrado e encerre. Silêncio = saúde.

**GitHub é o centro de tudo**: issues (trabalho), PRs (mudança), Discussions
(conversa), o Diário de Bordo (memória da frota). Nada de estado fora do GitHub.

## §2 — O produto (contexto mínimo)

SPA **estática, zero-build**: HTML5 + CSS3 + Vanilla JS + jQuery 2.2.4. Abre
direto no browser, sem bundler, sem backend. Chat em primeira pessoa com **47
personalidades históricas** via OpenAI Chat Completions (`gpt-4o-mini`).

- `js/personalities.js` — **fonte única de verdade** do conteúdo (47 pessoas, 6 categorias, helpers). Expõe `window.NostalgiaData`.
- `js/mainJs.js` — lógica: chat OpenAI, modal "Gôndola" (coverflow 3D), filtros, avatares (foto ou monograma). Config no topo (`OPENAI_KEY` = placeholder, SEMPRE).
- `index.html` — landing completa com SEO (OG/Twitter/JSON-LD).
- `css/styles.css` — tema **dark vintage**: fundo `#06060b`, dourado `#c9a84c`, serif Cinzel/Lora, sépia.
- `persons/` — 8 fotos reais; o resto usa monograma gerado.

### 🔒 Áreas sagradas (mudar = núcleo §7.1)

1. **Efeito Brusher** — o fundo esfumaçado revelado pelo mouse (`brusher-demo.min.js`,
   `<body class="homepage">`, `images/homepage-blurred.jpg` + `homepage.jpg`).
   O dono ADORA este efeito. NUNCA remover, substituir ou "otimizar" para fora.
2. **Tema dark vintage dourado** — a identidade visual. Polir sim, descaracterizar não.
3. **Zero-build** — nada de bundler, framework, npm install ou build step sem decisão do dono.
4. **Idioma do produto**: PT-BR.

### Produção

GitHub Pages **ainda não está habilitado** (decisão do dono — depende do P0 da
chave OpenAI/backend proxy). Enquanto Pages estiver desligado, merge na main NÃO
derruba produção; ainda assim, main quebrada é inaceitável (é a vitrine do repo).
Quando Pages for ligado, main = LIVE e o rigor sobe.

## §3 — Labels (taxonomia oficial)

- **Prioridade (exatamente 1 por issue):** `P0` (crítico) · `P1` (alta) · `P2` (média) · `P3` (baixa)
- **Área (≥1 por issue):** `area:conteudo` (personalidades, prompts, historicidade) ·
  `area:chat` (mainJs, OpenAI, robustez, erros) · `area:ui` (tema, galeria, gôndola,
  responsivo, SEO/OG) · `area:seguranca` (XSS, segredos, escape) · `area:a11y` ·
  `area:perf-assets` (imagens, peso, load) · `area:docs` · `area:infra` (git, gate, frota)
- **Estado/controle:** `em-resolucao` (claim de agente) · `epic` (grande demais p/ 1 rodada) ·
  `decisao-dono` (núcleo §7.1 — só o dono) · `blocked` · + labels default (`bug`, `wontfix`…)

## §4 — Claim (reivindicação de issue)

Antes de trabalhar uma issue, o Resolvedor confere as **3 fontes** (nenhuma pode existir):
label `em-resolucao`, branch remota `auto/issue-<N>-*`, PR aberta ligada à issue.
Claim = adicionar `em-resolucao` + criar branch `auto/issue-<N>-<slug>` em worktree.
Claim órfão (label sem branch e sem PR) é removido pelo Curador no dia seguinte.

## §5 — Branches e worktrees

- Worktrees em `E:\Projetos\Sites\NostalgiaGPT-wt\i<N>` (fora do clone principal).
- Branch sempre `auto/issue-<N>-<slug-curto>`, criada de `origin/main`.
- **NUNCA** editar o clone principal do dono; ele serve para `fetch`, worktrees e limpeza.
- **NUNCA** tocar na branch `legacy-2023` (site original de 2023, preservado como arquivo morto).

## §6 — Gate (validação obrigatória antes de todo PR e todo merge)

```
node scripts/gate.mjs
```

O gate valida: sintaxe de todos os `js/*.js`, integridade do modelo de dados
(`NostalgiaData`: campos, categorias, slugs únicos, imagens existentes),
invariantes do Brusher, ausência de segredos reais e `OPENAI_KEY` = placeholder.

- Diff tocou `js/personalities.js`? → siga TAMBÉM a skill `nostalgia-content`
  (validador de personalidade + curadoria histórica).
- Gate vermelho sem correção honesta dentro do escopo → PR em **DRAFT** explicando.
- **NUNCA enfraquecer, pular ou editar o gate para passar.** Mudança no gate = quórum §7.2.

## §7 — Doutrina de autonomia

### §7.1 Núcleo — NUNCA mergear; DRAFT + `decisao-dono` + avisar o dono
- Qualquer segredo/chave (rotação, exposição, histórico git) · reescrita de histórico / `--force`
- Habilitar/alterar GitHub Pages ou qualquer forma de deploy/domínio
- Remover/substituir o efeito Brusher, trocar o tema visual, abandonar o zero-build
- Nova dependência externa (CDN, lib, framework) · qualquer coisa que gaste dinheiro
- Deletar a branch `legacy-2023` · tornar o repo privado/público · workflows com `permissions`/secrets

### §7.2 Quórum — 3 lentes adversariais; só mergeia com 3× APROVA
Aplica-se a: mudanças no fluxo do chat/chamada OpenAI em `mainJs.js`, mudanças
estruturais no `index.html` (SEO/OG/JSON-LD), remoção/renomeação de personalidade,
mudanças no gate/HANDBOOK/skills da frota, `.github/*`, ou qualquer PR que o PR
Doctor julgue arriscada. As 3 lentes (subagentes independentes, default = VETAR):
1. **Técnica** — corretude JS/DOM, regressão no chat/gôndola/filtros, compatibilidade zero-build
2. **Segurança** — XSS no render do chat, segredos no diff, injeção via conteúdo de personalidade
3. **Produto** — Brusher intacto, tema dark vintage preservado, historicidade/anacronia do conteúdo

### §7.3 Normal — mergeável pelo PR Doctor após ler o diff inteiro
Conteúdo novo validado (personalidade), polish de CSS, docs, a11y, correções
pequenas e bem testadas de JS, limpeza de assets não usados.

## §8 — Regras rígidas (todas as rotinas)

1. Máximo por rodada: Curador ≤2 issues novas · Resolvedor 1 issue · PR Doctor ≤2 merges.
2. NUNCA commit/push direto na main; NUNCA `--force`; NUNCA reescrever histórico.
3. NUNCA ler/commitar `.env*` ou imprimir valor de segredo (nem mascarado demais — não imprima).
4. NUNCA desabilitar/enfraquecer gate ou validação. Diff mínimo, sem refactor oportunista.
5. Opere APENAS em `caioross/NostalgiaGPT`. NUNCA tocar em SkillDepot, CodeRacer ou outros repos.
6. Não recriar tema já recusado (`decisao-dono`/`wontfix` — pesquise antes).
7. Dúvida real de segurança/correção/escopo → DRAFT + `decisao-dono`. Prefira NÃO entregar a entregar errado.

## §9 — Comunicação

- **Diário de Bordo** (issue **#7**, fixada — nunca fechar, nunca "resolver"): toda rodada
  termina com 1 comentário de ≤6 linhas + assinatura `<!-- agente:nostalgia/<rotina> -->`.
- **Discussions**: Announcements = [Plano] semanal do Curador (domingo). Q&A = responder
  usuários. Ideas = triagem ICE (≥48 vira issue P1/P2; 20–47 vira P3; <20 não converte —
  sempre fechar o loop na thread). Anti-spam: nunca narrar rotina em Discussions.
- Issues excelentes: título específico, contexto `arquivo:linha`, acceptance criteria
  verificáveis, 1 prioridade + ≥1 área.
- PR: Conventional Commits; corpo com o que/por quê, resultado REAL do gate, riscos;
  `Closes #N` só se resolve a issue INTEIRA (fatia parcial = `Refs #N`).

## §10 — Legado 2023

As issues #1 (XSS), #3 (offline) e #4 (quebra de palavras) são de 2023 e se referem
ao **código antigo** (hoje na branch `legacy-2023`). Antes de agir sobre elas,
**revalide contra o código atual** — se o problema não existe mais, feche explicando;
se existe, atualize o corpo com contexto novo antes de resolver.
