---
name: nostalgia-content
description: Geração e validação de conteúdo das personalidades históricas do NostalgiaGPT (repo caioross/NostalgiaGPT). Cobre: adicionar personalidade ao array PEOPLE de js/personalities.js, escrever tagline e conversation starters coerentes com a época, curar referências culturais e datas, corrigir anacronia, validar metadados (categoria, years, foto/monograma, starters). Use SEMPRE que a tarefa tocar: nova personalidade, novo personagem, nova categoria, personalities.js, starters, tagline, system prompt do chat, período histórico, curadoria de fontes, anacronia, coerência cultural, galeria/gôndola, ou escalar além das 47 personalidades atuais.
---

# nostalgia-content — Conteúdo das Personalidades

A lei do repositório é `docs/fleet/HANDBOOK.md`; esta skill trata só do **conteúdo**
(quem são as personalidades e como elas falam). Em conflito, o HANDBOOK vence.

## Contexto rápido

O NostalgiaGPT é uma SPA zero-build que permite conversar com **47 personalidades
históricas** via OpenAI `gpt-4o-mini`. O valor do produto está na **imersão**: a
personalidade deve falar e referenciar o mundo como a pessoa real faria no período em
que viveu — sem anacronia, sem atribuição incorreta, sem categoria trocada.

Arquivos que importam para conteúdo:

- `js/personalities.js` — **fonte única de verdade**: `CATEGORIES` + array `PEOPLE` + helpers. Expõe `window.NostalgiaData`.
- `js/mainJs.js` — monta o system prompt em runtime (`buildSystemPrompt()`, ~linha 145) e renderiza os starters (`showWelcome()`, ~linha 80).
- `persons/` — 8 fotos reais (`.jpg`, nomes com espaço e acento); as outras 39 usam monograma gerado.
- `index.html` / `css/styles.css` — galeria, modal "Gôndola" (coverflow 3D), filtros e cores por categoria.

## O modelo de dados real (leia antes de escrever qualquer linha)

Cada personalidade é **uma linha** do array `PEOPLE`, com exatamente estes campos:

```js
{ name: 'Albert Einstein', cat: 'ciencia', years: '1879–1955', tagline: 'Pai da Relatividade', img: 'persons/Albert Einstein.jpg', starters: ['...', '...', '...'] }
```

| Campo | Obrigatório | Formato |
|---|---|---|
| `name` | sim | nome conforme convenção histórica em PT-BR; **único** no array |
| `cat` | sim | uma das 6 chaves de `CATEGORIES` (em português — ver abaixo) |
| `years` | sim | `'1879–1955'` com **en-dash** (`–`, não hífen); aceita `'470–399 a.C.'`, `'4 a.C.–65 d.C.'` ou o rótulo `'Lenda'` |
| `tagline` | sim | epíteto curto; acima de 40 chars o validador **avisa** (não reprova). Mire ~27: o card trunca bem antes — issue #41 aberta |
| `img` | sim | `null` → monograma gerado; ou `'persons/Nome Completo.jpg'` de arquivo existente |
| `starters` | não | 3 a 5 perguntas de abertura; ausente → fallback genérico de `mainJs.js` |

**Não existem** os campos `id`, `category`, `era`, `nationality`, `description`, `photo`
nem `systemPrompt`. Quem tentar escrevê-los produz dados inertes.

**`slug` e `initials` são DERIVADOS em runtime** — `personalities.js` injeta ambos em
cada objeto ao carregar (`slugify(name)` e `initials(name)`). Nunca escreva-os à mão:

- `slug` — usado em `data-attrs` e localStorage; `'Leonardo da Vinci'` → `leonardo-da-vinci`
- `initials` — monograma; ignora conectores (`de`, `da`, `van`, `von`…): `'Leonardo da Vinci'` → `LV`

### As 6 categorias (chaves reais de `CATEGORIES`, na ordem de exibição)

| Chave | Label | Personalidades |
|---|---|---|
| `ciencia` | Ciência & Tecnologia | 7 |
| `arte` | Arte & Literatura | 10 |
| `filosofia` | Filosofia & Fé | 7 |
| `lideres` | Líderes & Política | 14 |
| `musica` | Música | 5 |
| `lendas` | Esporte & Lendas | 4 |

Total: **47** (8 com foto real, 39 com monograma; 7 já têm `starters` próprios).
Cada categoria também define `short`, `icon` e o par de cores `c1`/`c2` do monograma.
Categoria nova é só uma chave a mais em `CATEGORIES` (`label`, `short`, `icon`, `c1`,
`c2`): os filtros (`js/mainJs.js:336`) e os grupos da galeria (`js/mainJs.js:290`) são
gerados por `Object.keys(D.categories)`, e as cores entram por custom property
(`--p-c1`/`--g-c1`) — o `index.html` traz só o contêiner vazio `#picker-cats` (`:259`)
e o CSS não tem nenhuma regra por categoria. Ainda assim, criar categoria muda a
taxonomia do produto: proponha na issue antes de escrever a linha.

### O system prompt não é por personagem

`buildSystemPrompt(p)` em `js/mainJs.js` monta o prompt de sistema **em runtime** a
partir de `name`, `years` e `tagline`, mais instruções fixas (primeira pessoa, nunca
quebrar o personagem, PT-BR, 2–4 parágrafos). Consequências práticas:

- A curadoria de conteúdo age em `tagline` e `starters` — são eles que carregam a época e o caráter da pessoa.
- Alterar o texto fixo do prompt é mudança no fluxo do chat em `mainJs.js` → **quórum** (HANDBOOK §7.2), não trabalho rotineiro de conteúdo.

---

## Workflow — Adicionar nova personalidade

### Passo 1 — Verificar unicidade e categoria

Confirme que o nome ainda não existe e escolha a categoria entre as 6 acima:

```bash
node -e "const vm=require('vm'),fs=require('fs');const s={window:{}};vm.createContext(s);vm.runInContext(fs.readFileSync('js/personalities.js','utf8'),s);const D=s.window.NostalgiaData;console.log(D.people.filter(p=>p.name.includes('Marie')).map(p=>p.name+' ['+p.cat+']'))"
```

### Passo 2 — Pesquisar dados biográficos confiáveis

Levante anos de nascimento/morte, realização mais reconhecível (vira a `tagline`) e
2–3 episódios documentados que rendam boas perguntas (viram os `starters`). Registre a
fonte em `references/fontes-personalidades.md` para não repesquisar depois.

### Passo 3 — Escrever a linha

Use `assets/template-personalidade.js` como base. A linha vai no bloco da categoria
correspondente do array `PEOPLE`, respeitando o alinhamento visual das colunas do
arquivo. Sem foto em `persons/` → `img: null` (o monograma é o padrão, não um erro).

### Passo 4 — Escrever os `starters`

Regras (detalhes e exemplos por categoria em `references/modelos-tagline-starters.md`):

- 3 a 5 perguntas, em PT-BR, dirigidas **à pessoa** ("Como o senhor…", "O que te levou a…")
- ancoradas em fatos verificáveis da vida dela — nada posterior à morte
- convidam narrativa em primeira pessoa, não resposta de enciclopédia
- cabem em um chip da tela: mire 40–72 caracteres

### Passo 5 — Validar

```bash
python .claude/skills/nostalgia-content/scripts/validar_personalidade.py --name "Nome Completo"
node scripts/gate.mjs
```

O validador carrega o `NostalgiaData` de verdade (via `node`, mesma técnica do gate) e
checa: campos obrigatórios, `cat` existente, formato de `years`, tamanho da `tagline`,
`img` existente em disco, `starters` entre 3 e 5, e unicidade de `name`/`slug`.
Avisos (`!`) não reprovam; erros reprovam com código de saída 1. O gate é o que manda
para abrir PR (HANDBOOK §6).

### Passo 6 — Testar no browser

Abra `index.html` e confirme:

- [ ] aparece na galeria com nome, tagline e monograma/foto corretos
- [ ] o filtro da categoria e a busca por nome encontram a pessoa
- [ ] a gôndola abre o card e o chat mostra a saudação com os starters
- [ ] clicar num starter preenche o input e envia

---

## Workflow — Corrigir anacronia ou erro factual

1. `python .claude/skills/nostalgia-content/scripts/validar_personalidade.py --all` para a checagem estrutural das 47.
2. Erro factual vive em `tagline` ou `starters` — corrija a linha em `js/personalities.js` e registre em `references/historico-correcoes.md` (personagem, campo, o que estava errado, fonte).
3. **Nunca** renomeie ou remova personalidade existente por conta própria: `name` gera o `slug`, que é chave de `localStorage` e de `data-attrs`. Remoção/renomeação é **quórum §7.2** (3 lentes adversariais) — não confunda com `decisao-dono`, que é o degrau acima, reservado ao núcleo §7.1.
4. Anacronia típica a caçar nos starters: tecnologia, obra, pessoa ou evento posterior à morte da personalidade.

---

## Segurança

`OPENAI_KEY` em `js/mainJs.js` é **sempre** o placeholder `SUA_CHAVE_OPENAI_AQUI` — o
repo é público e o gate reprova qualquer coisa diferente disso. Nunca escreva chave
real, nem leia/commite `.env*`. Chave exposta ou histórico comprometido é núcleo
(HANDBOOK §7.1): DRAFT + `decisao-dono`, ver `../secrets-guardian`.

Conteúdo de personalidade entra no DOM: texto novo (tagline, starters) tem que passar
pelo caminho de escape existente (`esc()` / `textContent`) — não introduza `innerHTML`
com dado de personalidade. Auditoria: `../web-security-audit`.

## Critério de aceite

- [ ] `validar_personalidade.py --name "<Nome>"` sem erros
- [ ] `node scripts/gate.mjs` verde
- [ ] Personagem aparece na galeria, nos filtros e na gôndola
- [ ] Starters renderizam e preenchem o input ao clicar
- [ ] Nenhuma referência anacrônica em `tagline`/`starters`
- [ ] `references/fontes-personalidades.md` atualizado com a fonte usada

## Por que assim

A imersão é o diferencial do produto: se um starter de Aristóteles citar "algoritmos", o
usuário perde a confiança na experiência inteira. Como o system prompt é gerado a partir
de `name`/`years`/`tagline`, esses três campos e os `starters` são todo o material de
curadoria disponível — precisam ser exatos. A validação estrutural pega erro mecânico
(categoria inexistente, foto ausente, starters demais) antes do browser, e o registro de
fontes evita refazer pesquisa biográfica a cada sessão.

## Referências

- `references/modelos-tagline-starters.md` — como escrever tagline e starters por categoria, com exemplos reais do arquivo
- `references/fontes-personalidades.md` — fontes biográficas por personalidade
- `references/historico-correcoes.md` — correções factuais já aplicadas
- `assets/template-personalidade.js` — a linha pronta para copiar
- `scripts/validar_personalidade.py` — validador estrutural (usa `node`, sem dependências)
- `../ng-fleet-ops` — claim, worktree, gate, PR (operação da frota)
- `../web-security-audit` · `../secrets-guardian`
