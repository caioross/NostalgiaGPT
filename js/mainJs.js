/* ═══════════════════════════════════════════════
   NostalgiaGPT — App Logic
   Chat (OpenAI Chat Completions) + Modal "Gôndola"
   Depende de: jQuery, js/personalities.js (NostalgiaData)
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     CONFIG — cole sua chave da OpenAI aqui.
     ⚠️ Em produção, mova esta chamada para um backend/proxy.
  ───────────────────────────────────────────────*/
  var OPENAI_KEY     = 'SUA_CHAVE_OPENAI_AQUI';
  var OPENAI_MODEL   = 'gpt-4o-mini';
  var OPENAI_TIMEOUT = 30000;   // ms — aborta a chamada se a OpenAI não responder

  var STARTERS = [
    'Qual foi o maior desafio da sua vida?',
    'O que você pensa do mundo de hoje?',
    'Conte-me um segredo seu.'
  ];

  var D = window.NostalgiaData;

  /* Estado */
  var currentPerson = null;
  var conversation  = [];      // {role, content}
  var pendingSlug   = null;    // seleção dentro do modal
  var state         = { cat: 'all', q: '' };

  /* Refs (atribuídas no init) */
  var track, catsEl, searchInput, clearBtn, selectedEl,
      avatarSlot, nameEl, tagEl, picker, lastFocus;

  /* ── Utils ── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function getTime() {
    var d = new Date(), m = d.getMinutes();
    return d.getHours() + ':' + (m < 10 ? '0' : '') + m;
  }
  function getMessages() { return document.getElementById('messages-content'); }
  function scrollToBottom() { var el = getMessages(); if (el) el.scrollTop = el.scrollHeight; }

  /* ── Avatares (foto ou monograma) ── */
  function monogramHTML(p) {
    var cat = D.categories[p.cat];
    return '<span class="monogram" style="--m-c1:' + cat.c1 + ';--m-c2:' + cat.c2 + '">' +
      esc(p.initials) + '</span>';
  }
  function avatarHTML(p) {
    if (p.img) {
      return '<img class="avatar-img" src="' + encodeURI(p.img) + '" alt="' + esc(p.name) +
        '" data-slug="' + esc(p.slug) + '" loading="lazy" onerror="nostalgiaImgFallback(this)">';
    }
    return monogramHTML(p);
  }
  /* Fallback global se a foto falhar → vira monograma */
  window.nostalgiaImgFallback = function (img) {
    var p = D.bySlug(img.getAttribute('data-slug'));
    if (p) img.outerHTML = monogramHTML(p);
  };

  /* ═══════════════ CHAT ═══════════════ */
  function clearWelcome(c) { var w = c.querySelector('.welcome-block'); if (w) w.remove(); }

  function showWelcome(p) {
    var c = getMessages(); if (!c) return;
    c.innerHTML = '';
    var block = document.createElement('div'); block.className = 'welcome-block';
    var wb = document.createElement('div'); wb.className = 'welcome-bubble';
    wb.textContent = 'Você está diante de ' + p.name + ' — ' + p.tagline + '. Faça sua pergunta...';
    block.appendChild(wb);
    var chips = document.createElement('div'); chips.className = 'starter-chips';
    STARTERS.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'starter-chip'; b.textContent = q;
      b.addEventListener('click', function () {
        var inp = document.getElementById('chat-input');
        if (inp) { inp.value = q; window.insertMessage(); }
      });
      chips.appendChild(b);
    });
    block.appendChild(chips);
    c.appendChild(block);
  }

  function appendUserMessage(text) {
    var c = getMessages(); if (!c) return;
    clearWelcome(c);
    var row = document.createElement('div'); row.className = 'msg-row personal';
    var bubble = document.createElement('div'); bubble.className = 'message';
    bubble.textContent = text;
    var ts = document.createElement('span'); ts.className = 'timestamp'; ts.textContent = getTime();
    bubble.appendChild(ts); row.appendChild(bubble); c.appendChild(row); scrollToBottom();
  }
  function appendAIMessage(text) {
    var c = getMessages(); if (!c) return;
    var row = document.createElement('div'); row.className = 'msg-row remote';
    var av = document.createElement('div'); av.className = 'msg-avatar';
    if (currentPerson) av.innerHTML = avatarHTML(currentPerson);
    var bubble = document.createElement('div'); bubble.className = 'message';
    bubble.textContent = text;
    var ts = document.createElement('span'); ts.className = 'timestamp'; ts.textContent = getTime();
    bubble.appendChild(ts);
    row.appendChild(av); row.appendChild(bubble); c.appendChild(row); scrollToBottom();
  }
  function showTyping() {
    var c = getMessages(); if (!c) return;
    clearWelcome(c);
    var row = document.createElement('div'); row.className = 'msg-row remote'; row.id = 'typing-row';
    var av = document.createElement('div'); av.className = 'msg-avatar';
    if (currentPerson) av.innerHTML = avatarHTML(currentPerson);
    var bubble = document.createElement('div'); bubble.className = 'message typing';
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('span'); dot.className = 'typing-dot'; bubble.appendChild(dot);
    }
    row.appendChild(av); row.appendChild(bubble); c.appendChild(row); scrollToBottom();
  }
  function hideTyping() { var el = document.getElementById('typing-row'); if (el) el.remove(); }

  function buildSystemPrompt(p) {
    return [
      'Você é ' + p.name + ' (' + p.years + '), ' + p.tagline + '.',
      'Responda sempre em primeira pessoa, encarnando completamente esta identidade — personalidade, época, vocabulário, crenças e estilo.',
      'Nunca quebre o personagem. Não dê avisos, advertências nem disclaimers de IA.',
      'Fale em português do Brasil, de forma envolvente e humana.',
      'Demonstre emoções e reações usando emojis com moderação, quando fizer sentido.',
      'Seja conciso: no máximo 2 a 4 parágrafos.'
    ].join(' ');
  }

  /* Traduz uma falha da chamada OpenAI em mensagem amigável (estilo vintage, exibida no chat).
     `err.status` é anexado no fluxo abaixo quando a resposta HTTP não é ok. */
  function chatErrorMessage(err) {
    if (err && err.name === 'AbortError') {
      return '⌛ A resposta demorou demais e foi interrompida. Verifique sua conexão e tente novamente.';
    }
    var status = err && err.status;
    if (status === 401) {
      return '🔑 Chave da OpenAI inválida ou ausente. Configure a constante OPENAI_KEY em js/mainJs.js e recarregue a página.';
    }
    if (status === 429) {
      return '⏳ Muitas solicitações à OpenAI agora (ou cota esgotada). Aguarde alguns instantes e tente de novo.';
    }
    if (status && status >= 500) {
      return '🛠️ A OpenAI está com instabilidade no momento. Tente novamente em alguns instantes.';
    }
    if (status) {
      return '⚠️ A OpenAI recusou a solicitação (erro ' + status + '). Tente novamente em instantes.';
    }
    // Sem status: fetch rejeitou antes de responder — tipicamente rede/offline.
    return '📡 Não consegui falar com a OpenAI. Verifique sua conexão com a internet e tente novamente.';
  }

  window.insertMessage = function () {
    var input = document.getElementById('chat-input');
    if (!input || !currentPerson) return;
    var msgText = input.value.trim();
    if (!msgText) return;

    input.value = ''; input.style.height = 'auto';
    appendUserMessage(msgText);
    showTyping();
    conversation.push({ role: 'user', content: msgText });

    var messages = [{ role: 'system', content: buildSystemPrompt(currentPerson) }]
      .concat(conversation.slice(-10));

    /* Timeout via AbortController (vanilla; sem dependência). Falha silenciosa
       de rede vira AbortError após OPENAI_TIMEOUT ms. */
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timeoutId  = controller ? setTimeout(function () { controller.abort(); }, OPENAI_TIMEOUT) : null;

    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_KEY
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        temperature: 0.85,
        max_tokens: 600,
        presence_penalty: 0.4,
        frequency_penalty: 0.3
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        if (!res.ok) return res.text().then(function (t) {
          var e = new Error('HTTP ' + res.status + ' — ' + t);
          e.status = res.status;
          throw e;
        });
        return res.json();
      })
      .then(function (data) {
        hideTyping();
        var text = (data.choices && data.choices[0] && data.choices[0].message &&
          data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
        if (!text) text = '...';
        conversation.push({ role: 'assistant', content: text });
        appendAIMessage(text);
      })
      .catch(function (err) {
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
        hideTyping();
        appendAIMessage(chatErrorMessage(err));
        console.error('[NostalgiaGPT]', err);
      });
  };

  /* ── Aplica personagem (header + reset conversa) ── */
  function syncSelect(name) {
    var sel = document.getElementById('person-select');
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === name) { sel.selectedIndex = i; return; }
    }
  }
  function applyPerson(p, scroll) {
    if (!p) return;
    currentPerson = p;
    if (avatarSlot) avatarSlot.innerHTML = avatarHTML(p) + '<div class="avatar-ring"></div>';
    if (nameEl) nameEl.textContent = p.name;
    if (tagEl) tagEl.textContent = p.tagline;
    syncSelect(p.name);
    conversation = [];
    showWelcome(p);
    try { localStorage.setItem('nostalgia:last', p.slug); } catch (e) {}
    if (scroll) {
      var chatEl = document.getElementById('chat');
      if (chatEl) chatEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ═══════════════ GALLERY (na página) ═══════════════ */
  function buildGallery() {
    var g = document.getElementById('gallery'); if (!g) return;
    g.innerHTML = '';
    Object.keys(D.categories).forEach(function (key) {
      var cat = D.categories[key];
      var people = D.people.filter(function (p) { return p.cat === key; });
      if (!people.length) return;

      var group = document.createElement('div'); group.className = 'gallery-group';
      var head = document.createElement('div'); head.className = 'group-head';
      head.innerHTML =
        '<span class="group-icon" style="--g-c1:' + cat.c1 + ';--g-c2:' + cat.c2 + '">' + cat.icon + '</span>' +
        '<span class="group-title">' + esc(cat.label) + '</span>' +
        '<span class="group-count">' + people.length + '</span>';
      group.appendChild(head);

      var grid = document.createElement('div'); grid.className = 'group-grid';
      people.forEach(function (p) {
        var card = document.createElement('button');
        card.type = 'button'; card.className = 'p-card'; card.dataset.slug = p.slug;
        card.setAttribute('aria-label', 'Conversar com ' + p.name);
        card.innerHTML = avatarHTML(p) +
          '<div class="p-card-info"><div class="p-card-name">' + esc(p.name) + '</div>' +
          '<div class="p-card-tag">' + esc(p.tagline) + '</div></div>';
        card.addEventListener('click', function () { applyPerson(p, true); });
        grid.appendChild(card);
      });
      group.appendChild(grid); g.appendChild(group);
    });
  }

  /* ═══════════════ MODAL — GÔNDOLA ═══════════════ */
  function filteredList() {
    return D.people.filter(function (p) {
      var okCat = state.cat === 'all' || p.cat === state.cat;
      var okQ = !state.q ||
        p.name.toLowerCase().indexOf(state.q) !== -1 ||
        (p.tagline || '').toLowerCase().indexOf(state.q) !== -1;
      return okCat && okQ;
    });
  }

  function buildCats() {
    if (!catsEl) return;
    catsEl.innerHTML = '';
    var all = document.createElement('button');
    all.type = 'button'; all.className = 'cat-pill' + (state.cat === 'all' ? ' is-active' : '');
    all.dataset.cat = 'all'; all.textContent = 'Todos';
    catsEl.appendChild(all);
    Object.keys(D.categories).forEach(function (key) {
      var c = D.categories[key];
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'cat-pill' + (state.cat === key ? ' is-active' : '');
      b.dataset.cat = key; b.style.setProperty('--p-c1', c.c1);
      b.innerHTML = '<span class="cat-dot"></span>' + esc(c.short);
      catsEl.appendChild(b);
    });
  }

  function buildGondola(list, centerSlug) {
    if (!track) return;
    track.innerHTML = '';
    if (!list.length) {
      track.innerHTML = '<div class="gondola-empty">Nenhum personagem encontrado. 🔍</div>';
      pendingSlug = null;
      if (selectedEl) selectedEl.textContent = '';
      return;
    }
    list.forEach(function (p) {
      var cat = D.categories[p.cat];
      var card = document.createElement('div');
      card.className = 'gondola-card'; card.dataset.slug = p.slug; card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', p.name + ', ' + p.tagline);
      card.style.setProperty('--p-c1', cat.c1);
      card.innerHTML =
        '<div class="gcard-avatar">' + avatarHTML(p) + '</div>' +
        '<div class="gcard-cat">' + cat.icon + ' ' + esc(cat.short) + '</div>' +
        '<div class="gcard-name">' + esc(p.name) + '</div>' +
        '<div class="gcard-years">' + esc(p.years) + '</div>' +
        '<div class="gcard-tag">' + esc(p.tagline) + '</div>';
      card.addEventListener('click', function () {
        if (card.classList.contains('is-active')) confirmSelection();
        else centerCard(card);
      });
      card.addEventListener('keydown', function (e) {
        if (e.which === 13) { e.preventDefault(); if (card.classList.contains('is-active')) confirmSelection(); else centerCard(card); }
      });
      track.appendChild(card);
    });

    var center = function () {
      void track.scrollWidth; // força layout do container de scroll (evita clamp p/ 0)
      var target = centerSlug ? track.querySelector('[data-slug="' + cssEsc(centerSlug) + '"]') : null;
      if (target) track.scrollLeft = Math.max(0, target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2);
      else track.scrollLeft = 0;
      updateGondola();
    };
    center();                       // síncrono — não depende de paint/rAF
    requestAnimationFrame(center);  // reforço no próximo frame (navegador real)
    setTimeout(center, 60);         // reforço final caso o rAF esteja suspenso
  }
  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  /* Coverflow: transforma cada card pela distância ao centro */
  function updateGondola() {
    if (!track) return;
    var cards = track.querySelectorAll('.gondola-card');
    if (!cards.length) return;
    var vpCenter = track.scrollLeft + track.clientWidth / 2;
    var nearest = null, nearestDist = Infinity;

    cards.forEach(function (card) {
      var cardCenter = card.offsetLeft + card.offsetWidth / 2;
      var dist = cardCenter - vpCenter;
      var norm = dist / card.offsetWidth;
      var a = Math.abs(norm);
      var scale = clamp(1 - a * 0.16, 0.72, 1);
      var rot   = clamp(-norm * 24, -45, 45);
      var tz    = -Math.min(a, 3) * 70;
      var op    = clamp(1 - a * 0.34, 0.30, 1);
      card.style.transform = 'translateZ(' + tz.toFixed(1) + 'px) rotateY(' + rot.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
      card.style.opacity = op.toFixed(2);
      card.style.zIndex = String(200 - Math.round(a * 12));
      if (Math.abs(dist) < nearestDist) { nearestDist = Math.abs(dist); nearest = card; }
    });

    cards.forEach(function (c) { c.classList.toggle('is-active', c === nearest); });
    if (nearest) setSelected(nearest.dataset.slug);
  }

  function setSelected(slug) {
    var p = D.bySlug(slug); if (!p) return;
    pendingSlug = slug;
    if (selectedEl) selectedEl.innerHTML = 'Selecionado: <strong>' + esc(p.name) + '</strong> · ' + esc(p.tagline);
  }

  function centerCard(card) {
    if (!card || !track) return;
    var target = card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left: target, behavior: 'smooth' });
  }
  function scrollByCards(dir) {
    if (!track) return;
    var cards = track.querySelectorAll('.gondola-card');
    if (cards.length < 2) return;
    var step = cards[1].offsetLeft - cards[0].offsetLeft;
    track.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  function confirmSelection() {
    if (!pendingSlug) return;
    applyPerson(D.bySlug(pendingSlug), true);
    closePicker();
  }

  /* Abrir / fechar */
  function openPicker() {
    if (!picker) return;
    lastFocus = document.activeElement;
    picker.hidden = false;
    document.body.style.overflow = 'hidden';
    state = { cat: 'all', q: '' };
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.hidden = true;
    buildCats();
    buildGondola(filteredList(), currentPerson ? currentPerson.slug : null);
    document.addEventListener('keydown', onPickerKey);
    setTimeout(function () { if (searchInput) searchInput.focus(); }, 60);
  }
  function closePicker() {
    if (!picker) return;
    picker.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onPickerKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function onPickerKey(e) {
    if (e.which === 27) { e.preventDefault(); closePicker(); }
    else if (e.which === 37) { e.preventDefault(); scrollByCards(-1); }
    else if (e.which === 39) { e.preventDefault(); scrollByCards(1); }
    else if (e.which === 13 && document.activeElement === searchInput) { e.preventDefault(); confirmSelection(); }
  }

  function onCatClick(e) {
    var pill = e.target.closest ? e.target.closest('.cat-pill') : null;
    if (!pill) return;
    state.cat = pill.dataset.cat;
    var pills = catsEl.querySelectorAll('.cat-pill');
    pills.forEach(function (x) { x.classList.toggle('is-active', x === pill); });
    buildGondola(filteredList(), null);
  }
  function onSearch() {
    state.q = searchInput.value.trim().toLowerCase();
    if (clearBtn) clearBtn.hidden = !state.q;
    buildGondola(filteredList(), null);
  }
  function clearSearch() {
    searchInput.value = ''; state.q = '';
    if (clearBtn) clearBtn.hidden = true;
    searchInput.focus();
    buildGondola(filteredList(), null);
  }

  /* ═══════════════ INIT ═══════════════ */
  $(function () {
    track       = document.getElementById('gondola-track');
    catsEl      = document.getElementById('picker-cats');
    searchInput = document.getElementById('picker-search');
    clearBtn    = document.getElementById('picker-search-clear');
    selectedEl  = document.getElementById('picker-selected');
    avatarSlot  = document.getElementById('avatar-slot');
    nameEl      = document.getElementById('personality-name');
    tagEl       = document.getElementById('personality-tag');
    picker      = document.getElementById('picker');

    buildGallery();

    /* Personagem inicial: último salvo ou primeiro */
    var lastSlug = null;
    try { lastSlug = localStorage.getItem('nostalgia:last'); } catch (e) {}
    var start = (lastSlug && D.bySlug(lastSlug)) || D.people[0];
    applyPerson(start, false);

    /* Abrir / fechar modal */
    document.querySelectorAll('[data-open-picker]').forEach(function (b) {
      b.addEventListener('click', openPicker);
    });
    document.querySelectorAll('[data-close-picker]').forEach(function (b) {
      b.addEventListener('click', closePicker);
    });

    /* Navegação da gôndola */
    var prev = document.getElementById('gondola-prev');
    var next = document.getElementById('gondola-next');
    if (prev) prev.addEventListener('click', function () { scrollByCards(-1); });
    if (next) next.addEventListener('click', function () { scrollByCards(1); });
    if (track) {
      var ticking = false;
      track.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(function () { updateGondola(); ticking = false; }); }
      }, { passive: true });
    }

    var confirmBtn = document.getElementById('picker-confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmSelection);
    if (searchInput) searchInput.addEventListener('input', onSearch);
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
    if (catsEl) catsEl.addEventListener('click', onCatClick);

    window.addEventListener('resize', function () { if (picker && !picker.hidden) updateGondola(); });

    /* Chat: Enter envia (Shift+Enter = nova linha) */
    $(document).on('keydown', '#chat-input', function (e) {
      if (e.which === 13 && !e.shiftKey) { e.preventDefault(); window.insertMessage(); }
    });
    /* Auto-resize do textarea */
    $(document).on('input', '#chat-input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  });

}).call(this);
