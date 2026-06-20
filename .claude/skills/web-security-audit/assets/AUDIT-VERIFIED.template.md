# AUDIT-VERIFIED — Relatório de Segurança Web

> Projeto: **{{NOME_PROJETO}}**
> Data: {{DATA}}
> Auditor: {{AUDITOR}}
> Stack: Next.js {{NEXTJS_VERSION}} + Supabase + Stripe
> Gerado com: `../web-security-audit`

---

## Sumário executivo

| Severidade | Total | Abertos | Corrigidos | Aceitos c/ Risco |
|---|---|---|---|---|
| 🔴 CRÍTICA | - | - | - | - |
| 🟠 ALTA | - | - | - | - |
| 🟡 MÉDIA | - | - | - | - |
| **Total** | - | - | - | - |

**Status geral:** 🔴 CRÍTICO / 🟠 ATENÇÃO / 🟢 OK

---

## Vulnerabilidades

### CRIT-01 — SQL Injection / Interpolação PostgREST

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Evidência:**
```typescript
// Código vulnerável encontrado:
// <colar trecho aqui>
```

**Fix aplicado:**
```typescript
// Código corrigido:
// <colar correção aqui>
```

**Verificação:** `<como confirmar que o fix funciona>`

---

### CRIT-02 — XSS (dangerouslySetInnerHTML)

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Evidência:**
```tsx
// <colar trecho vulnerável>
```

**Fix aplicado:**
```tsx
// <colar correção com DOMPurify>
```

---

### CRIT-03 — CORS Wildcard

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Evidência:**
```typescript
// <trecho com Access-Control-Allow-Origin: *>
```

**Fix aplicado:**
```typescript
// <lista branca de origens>
```

---

### CRIT-04 — OAuth PKCE plain

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Evidência:** `pkceMethod: 'plain'` encontrado em `<arquivo>`.

**Fix:** Atualizar para `@supabase/ssr >= 0.5` (S256 por padrão) ou definir explicitamente S256.

---

### CRIT-05 — Rate Limiting em Memória

| Campo | Valor |
|---|---|
| Severidade | 🟠 ALTA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Evidência:** `new Map<string, number>()` para rate limiting em `<arquivo>`.

**Fix:** Substituir por Upstash Ratelimit. Ver `references/nextjs-supabase-stripe-patterns.md §7`.

---

### CRIT-06 — Open Redirect (redirect_uri sem validação)

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

---

### CRIT-07 — CSRF (state ausente em OAuth)

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

---

### CRIT-08 — Tokens em localStorage

| Campo | Valor |
|---|---|
| Severidade | 🟠 ALTA |
| Localização | `<arquivo>:<linha>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

---

### CRIT-09 — RLS ausente/incompleta

| Campo | Valor |
|---|---|
| Severidade | 🔴 CRÍTICA |
| Tabelas afetadas | `<lista de tabelas>` |
| Status | ABERTO / CORRIGIDO / ACEITO |

**Verificação:**
```sql
-- Rodar no SQL Editor do Supabase:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

## Itens adicionais identificados

| ID | Descrição | Severidade | Status |
|---|---|---|---|
| ADD-01 | ... | 🟡 MÉDIA | ABERTO |

---

## Checklist de verificação final

- [ ] `python3 scripts/audit_web.py <projeto>` retorna 0 críticos
- [ ] `npm audit --audit-level=high` sem vulnerabilidades críticas
- [ ] Todos os headers de segurança presentes (`next.config.js`)
- [ ] Webhook Stripe usa `constructEvent()` com assinatura
- [ ] RLS habilitado em todas as tabelas com dados de usuário
- [ ] Nenhum `NEXT_PUBLIC_` em variável que deveria ser server-only
- [ ] Rate limiting usa Redis, não Map() em memória
- [ ] PKCE usa S256

---

## Histórico de revisões

| Data | Auditor | Resumo |
|---|---|---|
| {{DATA}} | {{AUDITOR}} | Auditoria inicial |
