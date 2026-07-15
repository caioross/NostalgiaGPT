/* ═══════════════════════════════════════════════
   NostalgiaGPT — Personalities Data Model
   Fonte única de verdade: categorias + personagens.
   Usado pela galeria, pelo modal "Gôndola" e pelo chat.
═══════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── Categorias (ordem = ordem de exibição) ── */
  var CATEGORIES = {
    ciencia: {
      label: 'Ciência & Tecnologia',
      short: 'Ciência',
      icon: '🔬',
      c1: '#26a699', c2: '#0c5a50'
    },
    arte: {
      label: 'Arte & Literatura',
      short: 'Arte',
      icon: '🎨',
      c1: '#c75b86', c2: '#79294a'
    },
    filosofia: {
      label: 'Filosofia & Fé',
      short: 'Filosofia',
      icon: '📜',
      c1: '#cba14f', c2: '#7c5f22'
    },
    lideres: {
      label: 'Líderes & Política',
      short: 'Líderes',
      icon: '⚔️',
      c1: '#c2554f', c2: '#6c2622'
    },
    musica: {
      label: 'Música',
      short: 'Música',
      icon: '🎼',
      c1: '#6f66c4', c2: '#363070'
    },
    lendas: {
      label: 'Esporte & Lendas',
      short: 'Lendas',
      icon: '⭐',
      c1: '#3f9c6a', c2: '#1f5e3c'
    }
  };

  /* ── Personagens (img = null → monograma gerado) ── */
  var PEOPLE = [
    /* Ciência & Tecnologia */
    { name: 'Albert Einstein',        cat: 'ciencia',   years: '1879–1955',     tagline: 'Pai da Relatividade',          img: 'persons/Albert Einstein.jpg', starters: ['Como o senhor imaginou viajar ao lado de um raio de luz?', 'O que sentiu ao saber que o eclipse de 1919 confirmou sua teoria?', 'Por que o senhor dizia que Deus não joga dados?'] },
    { name: 'Isaac Newton',           cat: 'ciencia',   years: '1643–1727',     tagline: 'As Leis do Movimento',         img: 'persons/Isaac Newton.jpg', starters: ['É verdade que uma maçã o inspirou a pensar na gravidade?', 'Como foi decompor a luz branca com um prisma?', 'O que significou para o senhor estar sobre ombros de gigantes?'] },
    { name: 'Nikola Tesla',           cat: 'ciencia',   years: '1856–1943',     tagline: 'O Gênio da Eletricidade',      img: 'persons/Nikola Tesla.jpg', starters: ['Por que o senhor defendia a corrente alternada contra Edison?', 'Como imaginava transmitir energia sem fios em Wardenclyffe?', 'O que via nas suas visões vívidas de máquinas completas?'] },
    { name: 'Thomas Edison',          cat: 'ciencia',   years: '1847–1931',     tagline: 'O Mago de Menlo Park',         img: 'persons/Thomas Edison.jpg', starters: ['Quantas tentativas foram precisas até a lâmpada incandescente funcionar?', 'O que o senhor queria dizer com 1% de inspiração e 99% de transpiração?', 'Como era dirigir o laboratório de Menlo Park?'] },
    { name: 'Charles Darwin',         cat: 'ciencia',   years: '1809–1882',     tagline: 'A Origem das Espécies',        img: null, starters: ['O que o senhor observou nos tentilhões das Galápagos?', 'Por que hesitou tantos anos antes de publicar A Origem das Espécies?', 'Como foi a viagem a bordo do Beagle?'] },
    { name: 'Galileu Galilei',        cat: 'ciencia',   years: '1564–1642',     tagline: 'Pai da Ciência Moderna',       img: null, starters: ['O que o senhor viu ao apontar sua luneta para Júpiter?', 'Como foi enfrentar a Inquisição por defender Copérnico?', 'É verdade que sussurrou Eppur si muove depois do julgamento?'] },
    { name: 'Steve Jobs',             cat: 'ciencia',   years: '1955–2011',     tagline: 'O Visionário da Apple',        img: null, starters: ['O que te levou a voltar à Apple em 1997?', 'Por que a simplicidade era tão importante no seu design?', 'Como foi apresentar o primeiro iPhone em 2007?'] },

    /* Arte & Literatura */
    { name: 'Leonardo da Vinci',      cat: 'arte',      years: '1452–1519',     tagline: 'O Gênio Renascentista',        img: null },
    { name: 'Michelangelo',           cat: 'arte',      years: '1475–1564',     tagline: 'Mestre da Capela Sistina',     img: null },
    { name: 'Pablo Picasso',          cat: 'arte',      years: '1881–1973',     tagline: 'Pioneiro do Cubismo',          img: 'persons/Pablo Picasso.jpg' },
    { name: 'Van Gogh',               cat: 'arte',      years: '1853–1890',     tagline: 'Mestre Pós-Impressionista',    img: null },
    { name: 'Shakespeare',            cat: 'arte',      years: '1564–1616',     tagline: 'O Bardo de Avon',              img: null },
    { name: 'Edgar Allan Poe',        cat: 'arte',      years: '1809–1849',     tagline: 'Mestre do Macabro',            img: null },
    { name: 'Ernest Hemingway',       cat: 'arte',      years: '1899–1961',     tagline: 'Nobel de Literatura',          img: null },
    { name: 'Jane Austen',            cat: 'arte',      years: '1775–1817',     tagline: 'Dama dos Romances',            img: null },
    { name: 'Machado de Assis',       cat: 'arte',      years: '1839–1908',     tagline: 'O Bruxo do Cosme Velho',       img: null },
    { name: 'Salvador Dalí',          cat: 'arte',      years: '1904–1989',     tagline: 'Ícone do Surrealismo',         img: null },

    /* Filosofia & Fé */
    { name: 'Platão',                 cat: 'filosofia', years: '428–348 a.C.',  tagline: 'Fundador da Academia',         img: null },
    { name: 'Aristóteles',            cat: 'filosofia', years: '384–322 a.C.',  tagline: 'O Filósofo',                   img: null },
    { name: 'Confúcio',               cat: 'filosofia', years: '551–479 a.C.',  tagline: 'O Sábio do Oriente',           img: null },
    { name: 'Buda',                   cat: 'filosofia', years: '563–483 a.C.',  tagline: 'O Desperto',                   img: null },
    { name: 'Jesus Cristo',           cat: 'filosofia', years: '4 a.C.–33 d.C.',tagline: 'O Nazareno',                   img: 'persons/Jesus Cristo.jpg' },
    { name: 'Sigmund Freud',          cat: 'filosofia', years: '1856–1939',     tagline: 'Pai da Psicanálise',           img: null },
    { name: 'Vicente de Paulo',       cat: 'filosofia', years: '1581–1660',     tagline: 'O Santo da Caridade',          img: null },

    /* Líderes & Política */
    { name: 'Mahatma Gandhi',         cat: 'lideres',   years: '1869–1948',     tagline: 'Apóstolo da Não-Violência',    img: null },
    { name: 'Napoleão Bonaparte',     cat: 'lideres',   years: '1769–1821',     tagline: 'O Imperador dos Franceses',    img: null },
    { name: 'George Washington',      cat: 'lideres',   years: '1732–1799',     tagline: 'Pai da Nação Americana',       img: null },
    { name: 'John F. Kennedy',        cat: 'lideres',   years: '1917–1963',     tagline: '35º Presidente dos EUA',       img: null },
    { name: 'Nelson Mandela',         cat: 'lideres',   years: '1918–2013',     tagline: 'Símbolo da Liberdade',         img: null },
    { name: 'Winston Churchill',      cat: 'lideres',   years: '1874–1965',     tagline: 'O Leão Britânico',             img: null },
    { name: 'Che Guevara',            cat: 'lideres',   years: '1928–1967',     tagline: 'Ícone Revolucionário',         img: null },
    { name: 'Martin Luther King Jr.', cat: 'lideres',   years: '1929–1968',     tagline: '"Eu Tenho um Sonho"',          img: null },
    { name: 'Eleanor Roosevelt',      cat: 'lideres',   years: '1884–1962',     tagline: 'Primeira-Dama do Mundo',       img: null },
    { name: 'Dom Pedro II',           cat: 'lideres',   years: '1825–1891',     tagline: 'O Magnânimo',                  img: null },
    { name: 'Getúlio Vargas',         cat: 'lideres',   years: '1882–1954',     tagline: 'O Pai dos Pobres',             img: null },
    { name: 'Alexandre, o Grande',    cat: 'lideres',   years: '356–323 a.C.',  tagline: 'Conquistador da Antiguidade',  img: null },
    { name: 'Cleópatra',              cat: 'lideres',   years: '69–30 a.C.',    tagline: 'A Última Rainha do Egito',     img: 'persons/Cleópatra.jpg' },
    { name: 'Cândido Rondon',         cat: 'lideres',   years: '1865–1958',     tagline: 'O Desbravador do Brasil',      img: null },

    /* Música */
    { name: 'Ludwig van Beethoven',   cat: 'musica',    years: '1770–1827',     tagline: 'O Titã da Música',             img: null },
    { name: 'Johann Sebastian Bach',  cat: 'musica',    years: '1685–1750',     tagline: 'Mestre do Barroco',            img: null },
    { name: 'Elvis Presley',          cat: 'musica',    years: '1935–1977',     tagline: 'O Rei do Rock',                img: null },
    { name: 'Elis Regina',            cat: 'musica',    years: '1945–1982',     tagline: 'A Pimentinha',                 img: null },
    { name: 'Heitor Villa-Lobos',     cat: 'musica',    years: '1887–1959',     tagline: 'Gênio da Música Brasileira',   img: null },

    /* Esporte & Lendas */
    { name: 'Ayrton Senna',           cat: 'lendas',    years: '1960–1994',     tagline: 'Eterno Tricampeão',            img: 'persons/Ayrton Senna.jpg' },
    { name: 'Claudio Coutinho',       cat: 'lendas',    years: '1939–1981',     tagline: 'Comandante da Seleção',        img: null },
    { name: 'Princesa Diana',         cat: 'lendas',    years: '1961–1997',     tagline: 'A Princesa do Povo',           img: null },
    { name: 'Robin Hood',             cat: 'lendas',    years: 'Lenda',         tagline: 'O Herói de Sherwood',          img: null }
  ];

  /* ── Conectores ignorados ao gerar iniciais ── */
  var STOPWORDS = { 'o': 1, 'a': 1, 'de': 1, 'da': 1, 'do': 1, 'dos': 1, 'das': 1, 'van': 1, 'von': 1, 'e': 1, 'jr': 1, 'ii': 1, 'iii': 1, 'f': 1, 'the': 1 };

  /* Gera iniciais (ex.: "Leonardo da Vinci" → "LV", "Platão" → "PL") */
  function initials(name) {
    var clean = name.replace(/[.,]/g, ' ');
    var words = clean.split(/\s+/).filter(function (w) {
      return w && !STOPWORDS[w.toLowerCase()];
    });
    if (words.length === 0) return name.slice(0, 2).toUpperCase();
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /* Slug estável (para localStorage e data-attrs) */
  function slugify(name) {
    return name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /* Index por slug + injeta slug/initials em cada pessoa */
  var BY_SLUG = {};
  PEOPLE.forEach(function (p) {
    p.slug = slugify(p.name);
    p.initials = initials(p.name);
    BY_SLUG[p.slug] = p;
  });

  /* ── API pública ── */
  global.NostalgiaData = {
    categories: CATEGORIES,
    people: PEOPLE,
    bySlug: function (slug) { return BY_SLUG[slug] || null; },
    byName: function (name) {
      for (var i = 0; i < PEOPLE.length; i++) {
        if (PEOPLE[i].name === name) return PEOPLE[i];
      }
      return null;
    },
    initials: initials,
    slugify: slugify
  };

})(window);
