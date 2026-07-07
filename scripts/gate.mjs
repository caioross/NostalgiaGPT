#!/usr/bin/env node
/**
 * Gate da frota NostalgiaGPT — validação obrigatória antes de PR e de merge.
 * Zero dependências. Uso: node scripts/gate.mjs
 * Sai com código 0 (verde) ou 1 (vermelho). Ver docs/fleet/HANDBOOK.md §6.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const ok = (msg) => results.push({ pass: true, msg });
const fail = (msg) => results.push({ pass: false, msg });

/* ── 1. Arquivos obrigatórios ── */
const REQUIRED = [
  'index.html', 'css/styles.css', 'js/mainJs.js', 'js/personalities.js',
  'brusher-demo.min.js', 'brusher-demo.min.css',
  'images/homepage-blurred.jpg', 'images/homepage.jpg',
];
for (const f of REQUIRED) {
  existsSync(path.join(ROOT, f)) ? ok(`arquivo presente: ${f}`) : fail(`arquivo OBRIGATORIO ausente: ${f}`);
}

/* ── 2. Sintaxe de todos os js/*.js ── */
for (const f of readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js'))) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, 'js', f)], { stdio: 'pipe' });
    ok(`sintaxe valida: js/${f}`);
  } catch (e) {
    fail(`ERRO DE SINTAXE em js/${f}:\n${String(e.stderr).slice(0, 500)}`);
  }
}

/* ── 3. Modelo de dados (NostalgiaData) ── */
try {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(path.join(ROOT, 'js', 'personalities.js'), 'utf8'), sandbox, { filename: 'personalities.js' });
  const D = sandbox.window.NostalgiaData;
  if (!D || !Array.isArray(D.people) || !D.categories) throw new Error('window.NostalgiaData nao exposto corretamente');

  const cats = Object.keys(D.categories);
  cats.length >= 6 ? ok(`categorias: ${cats.length}`) : fail(`esperado >=6 categorias, achei ${cats.length}`);
  for (const c of cats) {
    const cat = D.categories[c];
    if (!cat.label || !cat.c1 || !cat.c2) fail(`categoria '${c}' sem label/c1/c2`);
  }

  D.people.length >= 40
    ? ok(`personalidades: ${D.people.length}`)
    : fail(`esperado >=40 personalidades, achei ${D.people.length} — remocao em massa e nucleo/quorum (HANDBOOK par.7)`);

  const names = new Set(), slugs = new Set();
  for (const p of D.people) {
    const id = p.name || '(sem nome)';
    for (const field of ['name', 'cat', 'years', 'tagline']) {
      if (!p[field] || typeof p[field] !== 'string') fail(`'${id}': campo '${field}' ausente/invalido`);
    }
    if (p.cat && !cats.includes(p.cat)) fail(`'${id}': categoria desconhecida '${p.cat}'`);
    if (names.has(p.name)) fail(`nome duplicado: '${p.name}'`);
    names.add(p.name);
    if (slugs.has(p.slug)) fail(`slug duplicado: '${p.slug}' (colisao de nomes?)`);
    slugs.add(p.slug);
    if (p.img && !existsSync(path.join(ROOT, p.img))) fail(`'${id}': imagem nao existe: ${p.img}`);
  }
  if (D.people.every((p) => p.slug && p.initials)) ok('slugs e monogramas gerados para todos');
} catch (e) {
  fail(`falha ao carregar/validar personalities.js: ${e.message}`);
}

/* ── 4. Invariantes do Brusher (area sagrada — HANDBOOK par.2) ── */
try {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = readFileSync(path.join(ROOT, 'css', 'styles.css'), 'utf8');
  /<body[^>]*class="[^"]*homepage/.test(html) ? ok('brusher: <body class="homepage"> presente') : fail('brusher QUEBRADO: body sem class "homepage"');
  html.includes('brusher-demo.min.js') ? ok('brusher: plugin incluido no HTML') : fail('brusher QUEBRADO: script brusher-demo.min.js nao incluido');
  css.includes('homepage-blurred.jpg') ? ok('brusher: fundo blurred referenciado no CSS') : fail('brusher QUEBRADO: css nao referencia homepage-blurred.jpg');
} catch (e) {
  fail(`falha ao checar invariantes do brusher: ${e.message}`);
}

/* ── 4b. Referencias locais do index.html devem existir ── */
try {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  let broken = 0;
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:)?\/\/|^#|^mailto:|^tel:|^data:/.test(ref)) continue;
    const local = decodeURIComponent(ref.split(/[?#]/)[0]);
    if (!local) continue;
    if (!existsSync(path.join(ROOT, local))) { fail(`index.html referencia arquivo inexistente: ${ref}`); broken++; }
  }
  if (broken === 0) ok('todas as referencias locais do index.html existem');
} catch (e) {
  fail(`falha ao checar referencias do index.html: ${e.message}`);
}

/* ── 5. Segredos: nenhum arquivo rastreado pode conter chave real ── */
const SECRET_PATTERNS = [
  [/\bsk-proj-[A-Za-z0-9_-]{30,}\b/, 'chave OpenAI (sk-proj-...)'],
  [/\bsk-ant-[A-Za-z0-9_-]{30,}\b/, 'chave Anthropic (sk-ant-...)'],
  [/\bsk-[A-Za-z0-9]{40,}\b/, 'chave OpenAI legada (sk-...)'],
  [/\bsk_live_[A-Za-z0-9]{20,}\b/, 'chave Stripe live'],
  [/\bGOCSPX-[A-Za-z0-9_-]{10,}\b/, 'Google OAuth client secret'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
];
const BINARY_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.pyc', '.zip', '.7z', '.bin', '.woff', '.woff2']);
try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  let leaks = 0;
  for (const f of tracked) {
    if (BINARY_EXT.has(path.extname(f).toLowerCase())) continue;
    let text;
    try { text = readFileSync(path.join(ROOT, f), 'utf8'); } catch { continue; }
    for (const [re, label] of SECRET_PATTERNS) {
      if (re.test(text)) { fail(`SEGREDO no arquivo rastreado '${f}': ${label} — NUNCA commitar; ver skill secrets-guardian`); leaks++; }
    }
  }
  if (leaks === 0) ok('nenhum segredo real em arquivos rastreados');
} catch (e) {
  fail(`falha no scan de segredos: ${e.message}`);
}

/* ── 6. OPENAI_KEY deve ser o placeholder ── */
try {
  const main = readFileSync(path.join(ROOT, 'js', 'mainJs.js'), 'utf8');
  const m = main.match(/OPENAI_KEY\s*=\s*'([^']*)'/);
  if (!m) fail('nao achei a atribuicao OPENAI_KEY em js/mainJs.js');
  else m[1] === 'SUA_CHAVE_OPENAI_AQUI'
    ? ok('OPENAI_KEY = placeholder (correto para versionar)')
    : fail(`OPENAI_KEY nao e o placeholder — chave real NUNCA pode ser commitada`);
} catch (e) {
  fail(`falha ao checar OPENAI_KEY: ${e.message}`);
}

/* ── Relatorio ── */
const failed = results.filter((r) => !r.pass);
console.log('\n=== GATE NostalgiaGPT ===');
for (const r of results) console.log(`  [${r.pass ? 'OK' : 'FALHOU'}] ${r.msg}`);
console.log(`\n${failed.length === 0 ? 'GATE VERDE' : 'GATE VERMELHO'} — ${results.length - failed.length}/${results.length} checagens passaram.`);
if (failed.length > 0) {
  console.log('Corrija as falhas acima DENTRO do escopo da issue, ou abra a PR como DRAFT explicando (HANDBOOK par.6).');
  process.exit(1);
}
