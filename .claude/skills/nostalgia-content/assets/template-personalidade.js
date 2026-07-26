/* Template de personalidade — NostalgiaGPT
   Cada personalidade é UMA LINHA do array PEOPLE em js/personalities.js,
   inserida no bloco da categoria correspondente e alinhada com as vizinhas.

   Campos: name, cat, years, tagline, img (+ starters opcional).
   NÃO escreva `slug` nem `initials`: são derivados em runtime por
   slugify(name)/initials(name) dentro do próprio personalities.js.
   Copie a linha abaixo, preencha e apague este cabeçalho. */

/* Com starters próprios (preferido — 3 a 5 perguntas) e foto real em persons/: */
{ name: 'Nome Completo', cat: 'ciencia', years: '1879–1955', tagline: 'Epíteto curto', img: 'persons/Nome Completo.jpg', starters: ['Pergunta ancorada em fato documentado da vida dele(a)?', 'Como foi <episódio marcante>?', 'O que o senhor pensava sobre <tema que a pessoa abordou de verdade>?'] },

/* Sem foto (monograma gerado) e sem starters (cai no fallback genérico de mainJs.js): */
{ name: 'Nome Completo', cat: 'lendas', years: 'Lenda', tagline: 'Epíteto curto', img: null },

/* Referência de valores:
   cat     → 'ciencia' | 'arte' | 'filosofia' | 'lideres' | 'musica' | 'lendas'
   years   → en-dash '–', nunca hífen: '1879–1955', '470–399 a.C.', '4 a.C.–65 d.C.'
             sem datas conhecidas → 'Lenda'
   tagline → até 40 caracteres (o maior do arquivo hoje tem 27), sem ponto final
   img     → null, ou caminho de arquivo que EXISTE em persons/ (nomes com acento e
             espaço são a convenção do diretório)
   starters→ 3 a 5 perguntas em PT-BR, tratando a pessoa diretamente, ~40–72 chars,
             nada posterior à morte dela

   Valide antes de abrir PR:
     python .claude/skills/nostalgia-content/scripts/validar_personalidade.py --name "Nome Completo"
     node scripts/gate.mjs
*/
