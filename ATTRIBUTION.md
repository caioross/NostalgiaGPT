# 📜 Créditos e licenças de terceiros

Este arquivo registra a origem, a versão e a licença de todo código de terceiros
**redistribuído** neste repositório, além das dependências carregadas por CDN.

---

## Brusher — `brusher-demo.min.js` · `brusher-demo.min.css`

Responsável pelo efeito de fundo esfumaçado revelado pelo movimento do mouse
(o "efeito Brusher" da home — ver `css/styles.css:52` e `index.html:88`).

| Campo | Valor |
|---|---|
| **Projeto** | Brusher — *Create beautiful webpage backgrounds* |
| **Autor** | Kamran Ahmed |
| **Repositório** | <https://github.com/nilbuild/brusher> (antes `kamranahmedse/brusher`) |
| **Pacote npm** | [`brusher`](https://www.npmjs.com/package/brusher) |
| **Versão** | `0.1.4` (versão do `package.json` do upstream no commit do build) |
| **Origem exata dos arquivos** | `dist/demo/` do upstream, commit `931f14e` (2019-06-14, *"Update demo"*) |
| **Licença** | MIT |

### Verificação de integridade

Os dois arquivos são **idênticos** aos do upstream: os hashes de blob Git abaixo
conferem com os retornados pela API do GitHub para `dist/demo/`.

```
891fda41c508c9e18ad22b193ada970b2e4eaf8f  brusher-demo.min.js   (169.408 bytes)
01043a6031ab3369181930fb5bb0c09a79372d0c  brusher-demo.min.css  (  2.956 bytes)
```

Tamanhos são os do blob (fim de linha LF); em checkout no Windows o arquivo em
disco pode ficar maior por causa da conversão para CRLF — o blob, que é o que o
hash cobre, continua idêntico.

Para reconferir localmente:

```bash
git hash-object brusher-demo.min.js brusher-demo.min.css
```

> **Nota técnica:** trata-se do bundle do *demo* do projeto (webpack, `library: Brusher`),
> não do `dist/brusher.min.js` enxuto — daí o nome e o tamanho. O bundle embute
> [core-js](https://github.com/zloirock/core-js) (polyfills, também MIT).

### Texto da licença (obrigatório preservar)

```
The MIT License (MIT)

Copyright (c) 2018 Kamran Ahmed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

MIT permite uso, modificação e redistribuição — inclusive comercial — desde que o
aviso de copyright e o texto acima sejam preservados. Este arquivo cumpre esse dever.

---

## Dependências carregadas por CDN (não redistribuídas)

Não há cópia destes arquivos no repositório; são referenciados em `index.html`.

| Recurso | Versão | Origem | Licença |
|---|---|---|---|
| jQuery | 2.2.4 | cdnjs (`index.html:244`) | MIT |
| Google Fonts — Cinzel, Lora | — | fonts.googleapis.com (`index.html:80`) | SIL Open Font License 1.1 |

---

## Conteúdo próprio

O código do NostalgiaGPT (HTML, `css/styles.css`, `js/*.js`) é distribuído sob a
[licença MIT](LICENSE) do projeto. As fotos em `persons/` retratam figuras
históricas de domínio público.
