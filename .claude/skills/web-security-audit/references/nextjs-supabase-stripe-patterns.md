# Padrões Seguros — Next.js + Supabase + Stripe

> Código concreto para corrigir cada vulnerabilidade identificada no skilldepot e padrões do portfólio.
> Cada seção começa com o padrão ERRADO (o que foi encontrado) e termina com o CORRETO.

---

## 1. Cliente Supabase seguro (App Router / SSR)

```typescript
// src/lib/supabase/server.ts — cliente server-side (lê cookies da sessão)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // anon key no client — ok com RLS
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

// src/lib/supabase/client.ts — cliente browser
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

**Por que `@supabase/ssr`**: gerencia cookies httpOnly automaticamente, evitando `localStorage` com tokens (CRIT-08).

---

## 2. Verificar autenticação em route handlers

```typescript
// app/api/skills/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();

  // CORRETO: getUser() valida com o servidor (não pode ser adulterado)
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ERRADO: getSession() confia no cookie sem verificar com o servidor
  // const { data: { session } } = await supabase.auth.getSession(); // NÃO USE ASSIM

  const { data: skills } = await supabase.from('skills').select('*');
  return NextResponse.json(skills);
}
```

---

## 3. Queries Supabase sem interpolação (CRIT-01)

```typescript
// ERRADO — mcp-tools.ts:47 (o caso real do skilldepot):
const userInput = req.query.name as string;
const { data } = await supabase
  .from('skills')
  .select('*')
  .filter('name', 'ilike', `%${userInput}%`);  // interpolação no valor — risco baixo aqui
  // MAS: nunca interpolar o nome da tabela, coluna ou operador

// CORRETO — deixar o Supabase gerenciar o escape:
const { data } = await supabase
  .from('skills')
  .select('*')
  .ilike('name', `%${userInput}%`);  // .ilike() escapa internamente

// Para buscas complexas, usar RPC com função SQL parametrizada:
const { data } = await supabase.rpc('search_skills_safe', {
  search_term: userInput,
});
// SQL (no Supabase):
// CREATE OR REPLACE FUNCTION search_skills_safe(search_term text)
// RETURNS SETOF skills AS $$
//   SELECT * FROM skills WHERE name ILIKE '%' || search_term || '%'
// $$ LANGUAGE sql SECURITY INVOKER;  -- INVOKER respeita RLS do chamador
```

---

## 4. dangerouslySetInnerHTML com DOMPurify (CRIT-02)

```typescript
// Instalar: npm install dompurify @types/dompurify isomorphic-dompurify

// Em componente cliente (tem DOM disponível):
'use client';
import DOMPurify from 'dompurify';

export function SafeHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Em Server Component ou API route (sem DOM):
import createDOMPurify from 'isomorphic-dompurify';
const DOMPurify = createDOMPurify();
const clean = DOMPurify.sanitize(html);
```

---

## 5. CORS com lista branca (CRIT-03)

```typescript
// middleware.ts ou em cada route handler que precisa de CORS
const ALLOWED_ORIGINS = new Set([
  'https://skilldepot.com',
  'https://www.skilldepot.com',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
]);

export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const origin = req.headers.get('origin') ?? '';
    const response = await handler(req);

    if (ALLOWED_ORIGINS.has(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    // Se origin não está na lista, não adiciona o header — browser bloqueia automaticamente

    return response;
  };
}
```

---

## 6. OAuth PKCE S256 (CRIT-04)

```typescript
// Supabase @supabase/ssr >= 0.5 usa S256 automaticamente via PKCE interno.
// Se estiver usando versão antiga ou implementação manual:

const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    // NÃO definir pkceMethod: 'plain' — deixar o Supabase usar S256
  },
});

// Em app/auth/callback/route.ts:
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Validar redirect contra lista branca
      const allowedPaths = ['/', '/dashboard', '/profile'];
      const safePath = allowedPaths.includes(next) ? next : '/';
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }
  return NextResponse.redirect(`${origin}/auth/error`);
}
```

---

## 7. Rate limiting serverless-safe (CRIT-05)

```typescript
// Instalar: npm install @upstash/ratelimit @upstash/redis
// Configurar env: UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN

// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10 req / 10 seg
  analytics: true,
  prefix: 'skilldepot',
});

// middleware.ts — aplicar globalmente nas rotas de API:
import { ratelimit } from '@/lib/rate-limit';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      });
    }
  }
  return NextResponse.next();
}
```

---

## 8. Verificação de webhook Stripe

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  const body = await req.text();  // raw text, não parsed
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const pi = event.data.object as Stripe.PaymentIntent;
      // Liberar acesso baseado no payment_intent, não em dados do cliente
      await handlePaymentSuccess(pi);
      break;
    // outros eventos...
  }

  return NextResponse.json({ received: true });
}

// Desabilitar body parsing do Next.js para esta rota (necessário para constructEvent)
export const config = { api: { bodyParser: false } };
```

---

## 9. Headers de segurança no next.config.js

```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```
