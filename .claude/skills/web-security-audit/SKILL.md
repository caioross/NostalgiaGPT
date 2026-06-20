---
name: web-security-audit
description: "Realiza auditoria OWASP-style para a stack Next.js + Supabase + Stripe, produzindo um AUDIT-VERIFIED.md. Use SEMPRE que a tarefa mencionar: XSS, dangerouslySetInnerHTML, SQL injection, CORS, OAuth PKCE, rate limit, RLS, autenticação, autorização, segurança do skilldepot, vulnerabilidades em produção, ou qualquer revisão de segurança de API/middleware/rota Next.js. O skilldepot tem 14 vulnerabilidades críticas documentadas — esta skill trata exatamente esses padrões."
---

# web-security-audit

## Contexto real: o caso skilldepot

O `skilldepot` tem **14 vulnerabilidades críticas** já documentadas em `AUDIT-VERIFIED.md`. As mais graves — e que se repetem como padrão em outros projetos Next.js do portfólio:

| ID | Vulnerabilidade | Localização real | Severidade |
|---|---|---|---|
| CRIT-01 | SQL injection via interpolação de string em filtro PostgREST | `mcp-tools.ts:47` | 🔴 Crítica |
| CRIT-02 | XSS via `dangerouslySetInnerHTML` sem sanitização DOMPurify | skilldepot (múltiplos) | 🔴 Crítica |
| CRIT-03 | CORS wildcard `Access-Control-Allow-Origin: *` no endpoint MCP | API routes | 🔴 Crítica |
| CRIT-04 | OAuth PKCE com `code_challenge_method: 'plain'` em vez de `S256` | auth flow | 🔴 Crítica |
| CRIT-05 | Rate limiting com `Map()` em memória — reiniciado a cada deploy | middleware | 🟠 Alta |
| CRIT-06 | Validação de redirect_uri ausente (open redirect) | OAuth callback | 🔴 Crítica |
| CRIT-07 | `state` CSRF ausente no fluxo OAuth | auth initiation | 🔴 Crítica |
| CRIT-08 | Tokens armazenados em localStorage (sujeito a XSS) | client storage | 🟠 Alta |
| CRIT-09 | RLS ausente ou incompleta em tabelas sensíveis | Supabase schema | 🔴 Crítica |

---

## Workflow de auditoria

### 1. Escanear o código automaticamente

```bash
python3 scripts/audit_web.py <caminho-do-projeto>
```

O scanner detecta os padrões acima via grep e produz saída estruturada por severidade.

### 2. Checklist manual (OWASP Top 10 para esta stack)

Use `references/owasp-web-checklist.md` para os itens que exigem revisão semântica (lógica de autorização, fluxo OAuth completo, RLS coverage).

### 3. Gerar o relatório AUDIT-VERIFIED.md

Copie `assets/AUDIT-VERIFIED.template.md`, preencha cada item com:
- Evidência (arquivo:linha ou request/response)
- Status (ABERTO | CORRIGIDO | ACEITO COM RISCO)
- Fix aplicado (se corrigido)

### 4. Corrigir os itens críticos

Ver `references/nextjs-supabase-stripe-patterns.md` para os padrões de correção concretos (código, não teoria).

---

## Correções rápidas para os padrões mais comuns

### CRIT-01 — SQL injection / PostgREST

```typescript
// ERRADO (mcp-tools.ts:47 e padrão em todo o portfólio):
const { data } = await supabase
  .from('skills')
  .select('*')
  .filter('name', 'eq', userInput)  // se userInput vier de req.query, ok
// MAS:
.rpc('search_skills', { query: `%${userInput}%` })  // ERRADO: interpolação

// CORRETO — usar parâmetros posicionais via RPC com SQL seguro:
const { data } = await supabase
  .rpc('search_skills', { search_query: userInput })  // Supabase escapa o parâmetro
// No Supabase (SQL function):
// CREATE FUNCTION search_skills(search_query text) RETURNS ... AS $$
//   SELECT * FROM skills WHERE name ILIKE '%' || search_query || '%';
// $$ LANGUAGE sql SECURITY DEFINER;
```

### CRIT-02 — XSS / dangerouslySetInnerHTML

```typescript
// ERRADO:
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// CORRETO — instalar DOMPurify:
// npm install dompurify @types/dompurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// No servidor (sem DOM), usar isomorphic-dompurify:
// npm install isomorphic-dompurify
```

### CRIT-03 — CORS wildcard

```typescript
// ERRADO (em API route Next.js):
res.setHeader('Access-Control-Allow-Origin', '*');

// CORRETO — lista de origens permitidas:
const ALLOWED_ORIGINS = [
  'https://skilldepot.com',
  'https://www.skilldepot.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
].filter(Boolean);

const origin = req.headers.origin ?? '';
if (ALLOWED_ORIGINS.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
}
```

### CRIT-04 — OAuth PKCE S256

```typescript
// ERRADO:
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { pkceMethod: 'plain' }  // ou ausente em versões antigas
});

// CORRETO — S256 é o padrão seguro e obrigatório desde OAuth 2.1:
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    // Supabase @supabase/ssr usa S256 por padrão — confirmar versão >= 0.5
  }
});
```

### CRIT-05 — Rate limiting serverless-safe

```typescript
// ERRADO — Map() em memória é zerado a cada deploy/cold start:
const rateLimitMap = new Map<string, number>();

// CORRETO — usar Redis (Upstash funciona com Vercel Edge):
// npm install @upstash/ratelimit @upstash/redis
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Em middleware.ts:
const { success } = await ratelimit.limit(ip);
if (!success) return new Response('Too Many Requests', { status: 429 });
```

---

## Critério de aceite

- `scripts/audit_web.py` roda sem erro e reporta os padrões CRIT-01 a CRIT-09.
- `AUDIT-VERIFIED.md` gerado tem status de cada item (ABERTO / CORRIGIDO / ACEITO).
- Nenhum `dangerouslySetInnerHTML` sem `DOMPurify.sanitize()` no codebase auditado.
- Nenhum `Access-Control-Allow-Origin: *` em endpoints que recebem dados autenticados.
- PKCE usa `S256`, não `plain`.
- Rate limiting usa storage persistente (Redis), não `Map()` em memória.

---

## Referências e assets

- `scripts/audit_web.py` — scanner automático de padrões vulneráveis
- `references/owasp-web-checklist.md` — checklist manual OWASP para Next.js + Supabase + Stripe
- `references/nextjs-supabase-stripe-patterns.md` — padrões de correção com código
- `assets/AUDIT-VERIFIED.template.md` — template do relatório de auditoria
