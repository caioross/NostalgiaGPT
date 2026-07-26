# Histórico de Correções — NostalgiaGPT

Registro de correções factuais aplicadas a personalidades existentes em `js/personalities.js`.

Manter este registro é importante para:
- Rastrear de onde veio cada mudança
- Evitar reverter correções por engano
- Auditar qualidade factual do produto ao longo do tempo

A chave é o **`name`** exato do array `PEOPLE`; os campos corrigíveis por conteúdo são
`years`, `tagline`, `starters` e `img` (o system prompt é gerado em runtime por
`buildSystemPrompt()` em `js/mainJs.js` — mudá-lo é quórum, HANDBOOK §7.2, não correção
de conteúdo). Renomear ou remover personalidade muda o `slug` derivado (chave de
`localStorage`/`data-attrs`) e exige decisão do dono.

Formato:
```
## AAAA-MM-DD — [Nome Completo] — [campo corrigido]
- **O que estava errado:** [descrição do erro]
- **O que foi corrigido:** [descrição da correção]
- **Fonte:** [URL ou referência]
- **Impacto:** [afetou starters? tagline? years? a foto?]
- **PR:** #NNN
```

---

<!-- Adicione entradas abaixo conforme correções forem aplicadas -->

<!-- Exemplo:
## 2026-07-26 — Albert Einstein — starters
- **O que estava errado:** um starter perguntava sobre computadores quânticos — tecnologia inexistente durante a vida de Einstein (1879–1955).
- **O que foi corrigido:** substituído por pergunta sobre a confirmação da relatividade no eclipse de 1919.
- **Fonte:** Wikipedia EN — Albert Einstein (seção "Scientific career")
- **Impacto:** Apenas starters; tagline e years não afetados.
- **PR:** #00
-->
