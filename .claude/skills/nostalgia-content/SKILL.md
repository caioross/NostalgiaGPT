---
name: nostalgia-content
description: Geração e validação de conteúdo nostálgico temático para o NostalgiaGPT (E:\Projetos\Sites\NostalgiaGPT). Cobre: criar nova personalidade histórica em personalities.js, escrever system prompt em primeira pessoa coerente com a época, curar referências culturais corretas por período, validar metadados (época, categoria, foto/monograma, starters). Use SEMPRE que a tarefa tocar: nova personalidade, novo personagem, nova categoria, personalities.js, mainJs.js, starters, prompt de sistema, período histórico, curadoria de referências, anacronia, coerência cultural, adicionar ao carrossel, ou escalar além das 47 personalidades atuais.
---

# nostalgia-content — Conteúdo Nostálgico Temático

## Contexto rápido

O NostalgiaGPT é uma SPA zero-build (`E:\Projetos\Sites\NostalgiaGPT`) que permite conversar com **47 personalidades históricas** via OpenAI gpt-4o-mini. O valor do produto está na **qualidade da imersão**: a personalidade deve falar, raciocinar e referenciar o mundo como a pessoa real faria no período em que viveu — sem anacronia, sem atribuições incorretas, sem confundir categorias.

Estrutura de conteúdo relevante:
- `js/personalities.js` — array de 47 objetos de personalidade (fonte da verdade para dados e system prompts)
- `js/mainJs.js` — lógica de chat: lê `OPENAI_KEY`, monta `messages[]` com o system prompt, gerencia starters
- `persons/` — 8 fotos reais (.jpg); demais personalidades usam monograma SVG gerado dinamicamente
- `css/styles.css` — tema vintage escuro, tipografia Cinzel + Lora, monogramas por categoria
- `index.html` — carrossel 3D (coverflow), modal gôndola, filtros por categoria

**6 categorias atuais** (conforme `js/personalities.js`):
- `scientists` (cientistas)
- `philosophers` (filósofos)
- `artists` (artistas)
- `leaders` (líderes / governantes)
- `writers` (escritores)
- `explorers` (exploradores / aventureiros)

**Estado atual (Jun-2026):** 47 personalidades, 8 com foto real, restantes com monograma. Produto funcional em beta. Ver seção de riscos em `Relatorio_NostalgiaGPT.md §9` para o contexto completo.

---

## O que torna uma personalidade válida

Uma personalidade do NostalgiaGPT tem três camadas que precisam ser internamente consistentes:

### Camada 1 — Dados da personalidade (objeto em personalities.js)

```js
{
  id: "nome-em-kebab-case",        // único, sem acentos
  name: "Nome Completo",
  category: "scientists",          // uma das 6 categorias
  era: "século XIX",               // período em PT-BR, ex: "século XVI", "Antiguidade", "1800s"
  years: "1564–1642",              // anos de vida (birth–death)
  nationality: "Italiano",
  description: "Frase curta de apresentação no carrossel (≤ 20 palavras)",
  photo: null,                     // null = monograma; "persons/nome.jpg" = foto real
  starters: [                      // 3–5 perguntas de abertura que quebram o blank-slate
    "Como você descobriu...?",
    "O que você diria sobre...?",
    "Qual foi seu maior...?"
  ],
  systemPrompt: `Você é [Nome], [breve contextualização de quem é e época]...`
}
```

### Camada 2 — System Prompt em primeira pessoa

O system prompt é o coração da personalidade. Regras:
- **Primeira pessoa obrigatória**: "Eu sou Galileu Galilei. Nasci em Pisa..."
- **Contexto temporal explícito**: deixe claro em que ponto da história a personalidade existe (ex.: durante a vida, ou após a morte com perspectiva histórica?)
- **Vocabulário condizente com a época**: sem jargões modernos, sem tecnologia pós-morte da pessoa
- **Paixões, crenças e limitações reais**: a personalidade deve refletir a visão de mundo do período, incluindo crenças equivocadas que a pessoa real tinha
- **Tom consistente com o personagem**: um filósofo estoico é diferente de um artista romântico
- **Limite claro de conhecimento**: se o usuário perguntar sobre algo posterior à morte da pessoa, a personalidade deve reconhecer que não tem esse conhecimento

### Camada 3 — Coerência cultural e factual

Toda referência cultural, científica ou histórica dentro do system prompt deve ser verificável:
- Eventos, obras, descobertas: somente o que ocorreu **antes ou durante** a vida da personalidade
- Pessoas citadas: somente contemporâneos ou anteriores
- Conceitos científicos ou filosóficos: somente os disponíveis na época

---

## Workflow — Adicionar nova personalidade

### Passo 1: Verificar unicidade e categoria

Consulte `js/personalities.js` para confirmar que o personagem não existe ainda. Confirme a categoria correta entre as 6 existentes. Se nenhuma se encaixar, proponha nova categoria ao Caio antes de criar — adicionar categoria requer mudança em `css/styles.css` (cor do monograma) e nos filtros do carrossel em `index.html`.

### Passo 2: Pesquisar dados biográficos confiáveis

Antes de escrever o system prompt, levante:
- Datas de nascimento e morte (anos precisos)
- Principais obras, descobertas ou realizações
- Contexto histórico (guerras, movimentos, eventos da época)
- Visão de mundo, crenças, posições filosóficas/religiosas/políticas reais
- Frases ou afirmações documentadas atribuídas à pessoa

Anote as fontes em `references/fontes-personalidades.md` (crie ou atualize). Isso evita reescrever pesquisa em sessões futuras.

### Passo 3: Rascunhar o objeto da personalidade

Use `assets/template-personalidade.js` como base. Preencha todos os campos. Nos `starters`, prefira perguntas que convidem a narrativa em primeira pessoa e que toquem em temas que a personalidade real abordou extensamente.

### Passo 4: Escrever o system prompt

Siga o modelo em `references/modelos-system-prompt.md`. Estrutura mínima do system prompt:

```
Você é [Nome Completo], [profissão/papel] [nacionalidade/local] que viveu de [anos].

[2–3 frases estabelecendo quem é e o que fez de mais significativo]

Responda sempre em primeira pessoa, como se estivesse conversando com alguém em [período/local característico]. 
Seu conhecimento se limita ao que existia até [ano de morte ou período relevante].
[2–3 traços de personalidade/tom específicos]
[1–2 tópicos que você aborda com particular paixão ou expertise]

Se perguntado sobre eventos ou tecnologias posteriores à sua época, declare que não tem conhecimento desses desenvolvimentos.
Responda em [idioma padrão do projeto — PT-BR].
```

### Passo 5: Validar com o script

```bash
python E:\Projetos\Dashboards\Skills\NostalgiaGPT\nostalgia-content\scripts\validar_personalidade.py \
    E:\Projetos\Sites\NostalgiaGPT\js\personalities.js \
    --id nome-em-kebab-case
```

O script verifica:
- Todos os campos obrigatórios presentes e não-vazios
- `id` único no array
- `category` é uma das 6 categorias válidas
- `years` no formato `AAAA–AAAA` ou `c. AAAA–AAAA`
- `starters` tem entre 3 e 5 itens
- `systemPrompt` tem mais de 200 caracteres e contém "primeira pessoa" ou pronome "eu" (case-insensitive)
- `photo` é `null` ou aponta para arquivo existente em `persons/`

### Passo 6: Inserir em personalities.js

Insira o objeto no array de `js/personalities.js` mantendo a ordenação por categoria (agrupe personalidades da mesma categoria) para facilitar manutenção. Não altere personalidades existentes salvo para corrigir erro factual documentado.

### Passo 7: Testar no browser

Abra `index.html` localmente (ou via servidor local). Confirme:
- [ ] Personagem aparece no carrossel com nome e descrição corretos
- [ ] Filtro por categoria mostra o personagem
- [ ] Busca por nome retorna o personagem
- [ ] Modal abre com dados corretos (nome, época, nacionalidade)
- [ ] Starters aparecem no chat
- [ ] Ao iniciar conversa, a IA responde em primeira pessoa condizente com a época

---

## Workflow — Curar referências culturais em system prompts existentes

Use quando identificar possível anacronia ou erro factual em personalidade já existente:

1. Rode `scripts/validar_personalidade.py --all` para checar estrutura de todos os 47 objetos
2. Para erros factuais, edite o `systemPrompt` em `js/personalities.js` e documente a correção em `references/historico-correcoes.md` com: personagem, campo corrigido, o quê estava errado, fonte da correção
3. Nunca altere `id`, `name` ou `category` de personalidades existentes sem verificar se o id é referenciado em `mainJs.js` (buscar por `personality.id` no código)

---

## Segurança e credenciais

A chave da OpenAI está hardcoded em `mainJs.js` linha ~13 como `OPENAI_KEY = 'SUA_CHAVE_OPENAI_AQUI'`. **Isso é aceitável apenas para uso local/pessoal**, conforme documentado no `README.md` do projeto. Para qualquer deploy público, a task P0 do relatório (`Relatorio_NostalgiaGPT.md §10`) exige criação de backend proxy. Ver `../web-security-audit` para o padrão de auditoria quando essa evolução acontecer.

O arquivo `.env.local` com `GOOGLE_CLIENT_SECRET` e `GOOGLE_CLIENT_ID` está na raiz do projeto. Confirme que `.gitignore` cobre `.env.local` antes de qualquer commit. Para checar histórico:

```bash
git -C "E:\Projetos\Sites\NostalgiaGPT" log --all -- .env.local
```

Se aparecer algum commit, rotacione imediatamente as credenciais Google OAuth no console Google. Ver `../secrets-guardian` para o procedimento completo.

---

## Critério de aceite

- [ ] `scripts/validar_personalidade.py --id <id>` passa sem erros
- [ ] Personagem aparece no carrossel e nos filtros de categoria
- [ ] Starters renderizam no chat
- [ ] IA responde em primeira pessoa coerente com a época (teste manual com 2–3 perguntas)
- [ ] Nenhuma referência anacrônica identificada no system prompt (ex.: Einstein falando sobre internet)
- [ ] `references/fontes-personalidades.md` atualizado com a fonte biográfica usada

---

## Por que assim

A imersão é o diferencial do NostalgiaGPT. Um system prompt com anacronia quebra a experiência inteira: se Aristóteles mencionar "algoritmos" ou Marie Curie "redes sociais", o usuário perde confiança no produto. A validação estrutural automatizada (`scripts/validar_personalidade.py`) pega erros mecânicos (campo faltando, id duplicado) antes de abrir o browser, economizando tempo. A curadoria de fontes em `references/fontes-personalidades.md` evita reescrever pesquisa biográfica a cada sessão.

---

## Referências

- `references/modelos-system-prompt.md` — modelos de system prompt por categoria (cientista, filósofo, artista, líder, escritor, explorador)
- `references/fontes-personalidades.md` — fontes biográficas usadas por personalidade (atualizar ao criar cada uma)
- `references/historico-correcoes.md` — registro de correções factuais aplicadas a personalidades existentes
- `assets/template-personalidade.js` — template de objeto JS pronto para copiar
- `scripts/validar_personalidade.py` — validador estrutural e de metadados
- `../web-security-audit` — auditoria de segurança (usar quando implementar backend proxy para OpenAI)
- `../secrets-guardian` — gestão de credenciais (usar se `.env.local` for comprometido)
