# Checklist OWASP — Next.js + Supabase + Stripe

> Checklist manual para complementar o scanner `audit_web.py`.
> Marque cada item como: ✅ OK | ❌ Vulnerável | ⚠ Verificar | N/A

---

## A1 — Broken Access Control

- [ ] **RLS habilitado** em todas as tabelas Supabase com dados de usuário?
  - Verificar: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
  - RLS desabilitado = todos os usuários autenticados leem/escrevem tudo.

- [ ] **Policies RLS são deny-by-default?**
  - `ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY;` sem nenhuma policy = sem acesso (correto).
  - `USING (true)` sem restrição = acesso total (errado, a menos que intencional e documentado).

- [ ] **Rotas de API verificam autenticação no servidor?**
  - Nunca confiar apenas no cliente. Toda route handler deve chamar `supabase.auth.getUser()`.
  - `getSession()` pode ser adulterado pelo cliente; `getUser()` verifica com o servidor.

- [ ] **Endpoints admin têm verificação de role?**
  - Verificar role via JWT (`session.user.role`) ou tabela de perfis com RLS.

---

## A2 — Cryptographic Failures

- [ ] **Dados sensíveis em trânsito usam HTTPS exclusivamente?**
  - `NEXTAUTH_URL` e `APP_URL` usam `https://` em produção.
  - Stripe webhooks validados via `stripe.webhooks.constructEvent()` com assinatura.

- [ ] **Senhas/tokens nunca em logs?**
  - Não usar `console.log(user)` em produção — pode logar tokens.

- [ ] **Variáveis de ambiente sensíveis não aparecem em bundles do cliente?**
  - Verificar `NEXT_PUBLIC_STRIPE_SECRET` ou `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE` — esses prefixos expõem o valor.

---

## A3 — Injection

- [ ] **Queries Supabase usam parâmetros, não interpolação?**
  - `.eq('col', value)` é seguro (Supabase escapa internamente).
  - `.filter('col', 'eq', `${userInput}`)` pode ser inseguro dependendo do contexto.
  - `.rpc('func', { param: value })` é seguro se a função SQL usa parâmetros posicionais.

- [ ] **Inputs do usuário são validados no servidor?**
  - Usar Zod ou similar para validar `req.body` antes de qualquer operação de banco.

---

## A4 — Insecure Design (OAuth / Auth)

- [ ] **PKCE usa S256?**
  - Supabase `@supabase/ssr >= 0.5` usa S256 por padrão. Confirmar versão.
  - Verificar `pkceMethod: 'S256'` explicitamente se customizando.

- [ ] **state CSRF está presente e verificado?**
  - Supabase SSR gerencia automaticamente. Se implementando OAuth manual, gerar `state` aleatório e verificar na callback.

- [ ] **redirect_uri validado contra lista branca?**
  - Nunca usar `redirectTo = req.query.redirect` diretamente.
  - Lista branca: `['https://skilldepot.com/auth/callback', 'http://localhost:3000/auth/callback']`.

- [ ] **Tokens de refresh armazenados de forma segura?**
  - Supabase `@supabase/ssr` usa cookies httpOnly automaticamente.
  - Não usar `localStorage.setItem('supabase_token', ...)` manualmente.

---

## A5 — Security Misconfiguration

- [ ] **CORS configurado por lista branca, não wildcard?**
  - `Access-Control-Allow-Origin: *` em endpoints autenticados = CRÍTICO.
  - `Access-Control-Allow-Credentials: true` com `*` é inválido e rejeitado pelo browser, mas ainda sinaliza má configuração.

- [ ] **Headers de segurança no `next.config.js`?**
  ```js
  headers: [{ key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Content-Security-Policy', value: "default-src 'self'" }]
  ```

- [ ] **Mensagens de erro não expõem stack trace em produção?**
  - `NODE_ENV=production` deve suprimir detalhes de erro internos.
  - API routes devem retornar mensagens genéricas (`"Internal server error"`) sem detalhes.

---

## A6 — Vulnerable Components

- [ ] **`npm audit` roda sem vulnerabilidades críticas?**
  ```bash
  npm audit --audit-level=high
  ```

- [ ] **Next.js está na versão LTS estável?**
  - Usar Next.js 14.2.x. Versões 15/16 têm breaking changes e menor suporte.

---

## A7 — Authentication Failures

- [ ] **Rate limiting em login/signup?**
  - Supabase tem rate limiting nativo nas auth APIs.
  - Endpoints customizados de auth precisam de rate limiting externo (Redis/Upstash).

- [ ] **Tokens de sessão expiram?**
  - Supabase usa JWT com expiração de 1h por padrão (refresh via refresh_token).
  - Não estender expiração sem necessidade.

---

## A8 — Software and Data Integrity

- [ ] **Webhooks Stripe verificam assinatura?**
  ```typescript
  const event = stripe.webhooks.constructEvent(
    rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET
  );
  ```
  - Sem verificação = qualquer um pode simular um pagamento bem-sucedido.

- [ ] **Uploads de arquivo validam tipo e tamanho?**
  - Não confiar no `Content-Type` do cliente — verificar magic bytes ou extensão no servidor.

---

## A9 — Logging and Monitoring

- [ ] **Eventos de segurança são logados?**
  - Login com falha, tentativas de acesso não autorizado, mudanças de senha.
  - Supabase loga auth events no painel. Complementar com Sentry ou similar.

---

## A10 — SSRF (Server-Side Request Forgery)

- [ ] **URLs fornecidas pelo usuário para fetch são validadas?**
  - Se o servidor busca URLs que o usuário fornece, validar contra lista branca de hosts.
  - Bloquear requisições para `169.254.169.254` (metadata AWS), `localhost`, ranges privados.

---

## Stripe específico

- [ ] **`stripe.webhooks.constructEvent()` é usado e o webhook secret está configurado?**
- [ ] **`payment_intent.succeeded` é verificado antes de liberar acesso?**
- [ ] **Preços/amounts não vêm do cliente?** (calcular no servidor via `stripe.prices.retrieve()`)

---

## RLS — Cobertura mínima

Para cada tabela com dados de usuário:

```sql
-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Verificar policies existentes
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

Padrão mínimo por tabela:
```sql
-- Leitura: só o próprio usuário
CREATE POLICY "select_own" ON profiles FOR SELECT USING (auth.uid() = user_id);

-- Escrita: só o próprio usuário
CREATE POLICY "update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Ninguém pode deletar diretamente (só via função com SECURITY DEFINER)
-- (sem policy DELETE = bloqueado por RLS)
```
