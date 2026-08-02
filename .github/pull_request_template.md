<!--
  Obrigado por contribuir com o NostalgiaGPT.
  Este repositório é PÚBLICO e a branch `main` é produção (GitHub Pages).
  Preencha os campos abaixo — o resultado real do gate é obrigatório.
-->

## O que mudou e por quê

<!-- Uma ou duas frases. Se resolve uma issue, diga qual problema dela some com este diff. -->

## Issue relacionada

<!-- `Closes #N` SÓ se este PR resolve a issue INTEIRA. Fatia parcial usa `Refs #N`. -->

Refs #

## Resultado do gate

O gate é obrigatório e roda sem instalar nada:

```bash
node scripts/gate.mjs
```

<details>
<summary>Saída real do comando (cole abaixo)</summary>

```
(cole aqui a saída, não um resumo)
```

</details>

## Riscos e como testei

<!-- O que pode quebrar, e o que você abriu no navegador para confirmar que não quebrou. -->

## Checklist

- [ ] `node scripts/gate.mjs` está **verde** e a saída real está colada acima.
- [ ] Não toquei no efeito **Brusher** nem no **tema dark vintage dourado** (áreas sagradas — HANDBOOK §2).
- [ ] Não adicionei bundler, framework, `npm install` nem dependência externa (o projeto é **zero-build**).
- [ ] Nenhum segredo no diff: `OPENAI_KEY` continua com o placeholder e nenhum `.env` foi versionado.
- [ ] Conteúdo dinâmico novo passa por `esc()` antes de ir ao DOM.
- [ ] Diff mínimo, sem refactor oportunista.
