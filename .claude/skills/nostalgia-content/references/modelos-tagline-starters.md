# Tagline e Starters por Categoria — NostalgiaGPT

O system prompt **não** é escrito por personagem: `buildSystemPrompt()` em
`js/mainJs.js` (~linha 145) o monta em runtime a partir de `name`, `years` e `tagline`,
somados a instruções fixas (primeira pessoa, nunca quebrar o personagem, PT-BR,
2–4 parágrafos, emojis com moderação).

Ou seja: **a `tagline` é a única parte da persona que o conteúdo controla**, e os
`starters` são o que orienta a primeira pergunta do usuário. É neles que a curadoria
histórica acontece. Os modelos abaixo são pontos de partida — sempre adapte à pessoa.

---

## Regras da `tagline`

- Epíteto pelo qual a pessoa é reconhecida, não descrição de currículo
- Acima de 40 caracteres o validador emite **aviso**, não erro — e 40 não é garantia de exibição: enquanto a issue #41 (aberta) não corrigir o CSS, o card da galeria trunca a tagline em pouquíssimos caracteres. Mire perto dos 27 do maior atual; sem ponto final
- Em PT-BR, com maiúsculas de título: `Pai da Relatividade`, `O Rei do Rock`
- Entra literalmente no prompt (`'Você é ' + name + ' (' + years + '), ' + tagline`) e na saudação do chat — evite adjetivo vago ("Grande gênio") e qualquer anacronia

## Regras dos `starters`

- 3 a 5 perguntas (o validador reprova fora desse intervalo); as 7 personalidades que já têm usam 3
- ~40–72 caracteres, para caber no chip sem quebrar o layout
- Dirigidas à pessoa: `Como o senhor…`, `O que te levou a…`, `É verdade que…`
- Ancoradas em episódio documentado: lugar, obra, ano, adversário, decisão
- Nada posterior à morte da pessoa; nada de meta-pergunta sobre IA ou sobre "hoje"
- Misture os registros: uma sobre a obra, uma sobre um episódio concreto, uma sobre a visão de mundo

---

## ciencia — Ciência & Tecnologia

Tagline: a descoberta ou o papel público. Reais: `Pai da Relatividade`,
`As Leis do Movimento`, `O Gênio da Eletricidade`, `O Mago de Menlo Park`.

Starters (modelo + exemplo real, Galileu Galilei):

```
1. <experimento/observação decisiva>   → "O que o senhor viu ao apontar sua luneta para Júpiter?"
2. <resistência que enfrentou>         → "Como foi enfrentar a Inquisição por defender Copérnico?"
3. <frase ou crença atribuída>         → "É verdade que sussurrou Eppur si muove depois do julgamento?"
```

Anacronia a evitar: teoria posterior à morte (Newton não comenta relatividade), instrumento que não existia, prêmio recebido postumamente.

## arte — Arte & Literatura

Tagline: obra-prima ou movimento. Reais: `O Gênio Renascentista`,
`Mestre da Capela Sistina`, `Pioneiro do Cubismo`.

Starters (modelo + exemplo real, Michelangelo):

```
1. <processo de uma obra específica>   → "Como o senhor concebeu a abóbada da Capela Sistina?"
2. <patrono, rival ou encomenda>       → "O que era trabalhar sob a exigência do papa Júlio II?"
3. <técnica ou material de ofício>     → "Por que preferia o mármore de Carrara?"
```

Anacronia a evitar: movimento artístico posterior, obra que a pessoa não chegou a criar, museu/exposição moderna.

## filosofia — Filosofia & Fé

Tagline: escola, papel ou epíteto histórico. Reais: `Fundador da Academia`,
`O Filósofo`, `O Sábio do Oriente`.

Starters (modelo + exemplo real, Platão):

```
1. <método próprio>                    → "Por que o senhor escreveu em diálogos, e não em tratados?"
2. <obra ou diálogo central>           → "O que quis dizer com a alegoria da caverna?"
3. <posição diante do poder da época>  → "Como era filosofar sob o julgamento da cidade?"
```

Anacronia a evitar: filosofia posterior (Platão não cita Descartes), religião ou conceito que ainda não existia, vocabulário técnico moderno.

## lideres — Líderes & Política

Tagline: papel no poder. Reais: `Apóstolo da Não-Violência`,
`O Imperador dos Franceses`, `Pai da Nação Americana`.

Starters (modelo + exemplo real, Mahatma Gandhi):

```
1. <decisão irreversível que tomou>    → "O que pesou na decisão de marchar até o mar por sal?"
2. <adversário ou aliança real>        → "Como o senhor lidava com a oposição dentro do Congresso?"
3. <custo humano/pessoal do cargo>     → "O que a prisão lhe ensinou sobre a resistência?"
```

Anacronia a evitar: fronteiras e países posteriores, guerras após a morte, julgamento da posteridade como se fosse fato conhecido.

## musica — Música

Tagline: título consagrado. Reais: `O Titã da Música`, `Mestre do Barroco`,
`O Rei do Rock`, `A Pimentinha`.

Starters (modelo + exemplo real, Ludwig van Beethoven):

```
1. <obra/apresentação marcante>        → "Como foi estar no palco da estreia da Nona sem poder ouvi-la?"
2. <condição de trabalho da época>     → "Como era viver de mecenato, sem um posto fixo na corte?"
3. <ruptura ou gesto simbólico>        → "É verdade que rasgou a dedicatória da Eroica a Bonaparte?"
```

Anacronia a evitar: gênero musical posterior, tecnologia de gravação que não existia, referência a artistas nascidos depois.

## lendas — Esporte & Lendas

Categoria mista: figuras esportivas, ícones populares e personagens lendários
(`years: 'Lenda'`). Reais: `Eterno Tricampeão`, `A Princesa do Povo`,
`O Herói de Sherwood`.

Starters (modelo + exemplo real, Ayrton Senna):

```
1. <feito que definiu a imagem>        → "O que passou pela sua cabeça na vitória em Interlagos, em 1991?"
2. <valor que a pessoa defendia>       → "É verdade que dizia que o dinheiro sozinho não bastava ao país?"
3. <lado humano fora do palco>         → "Como era a pressão de carregar a esperança de um povo?"
```

Para personagens lendários, escreva starters sobre a **lenda** (o cânone das histórias),
sem afirmar historicidade que não existe.

---

## Checklist antes de commitar starters

- [ ] 3 a 5 itens, cada um ≤ ~72 caracteres
- [ ] cada pergunta cita algo verificável (lugar, obra, ano, pessoa, episódio)
- [ ] nada posterior à morte da personalidade
- [ ] tratamento coerente com a época e o registro do personagem
- [ ] `validar_personalidade.py --name "<Nome>"` sem erros e `node scripts/gate.mjs` verde
