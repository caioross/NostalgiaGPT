# Runbook de Rotação de Credenciais

> Sequência correta: **rotacionar primeiro, limpar histórico depois.**
> Rotacionar invalida a chave velha imediatamente, mesmo que ela ainda esteja no histórico.

---

## 1. Stripe — `sk_live_*` (skilldepot)

**Contexto:** `STRIPE_SECRET_KEY=sk_live_*` encontrado em `skilldepot/.env`. Essa chave dá acesso total à conta Stripe (cobranças, reembolsos, webhooks).

**Rotação:**
1. Acesse [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → API Keys**.
2. Clique em **Roll key** ao lado da chave live atual. O Stripe cria uma nova e mantém a velha ativa por 24h (período de transição).
3. Copie a nova chave (só aparece uma vez).
4. No `skilldepot`, atualize a variável no ambiente de produção (Vercel/Railway → Environment Variables) com o novo valor.
5. Teste um webhook de desenvolvimento para confirmar que a nova chave funciona.
6. Após 24h, revogue a chave antiga no painel.
7. Atualize `skilldepot/.env.example` com `STRIPE_SECRET_KEY=sk_live_****` (mascarado).

**Verificação:** `stripe listen --forward-to localhost:3000/api/webhooks` sem erro de autenticação.

---

## 2. Supabase — `SUPABASE_SERVICE_ROLE_KEY` (skilldepot, MecanicaSmart, ProjetosMapper)

**Contexto:** service_role bypassa Row Level Security — acesso total ao banco como admin.

**Rotação:**
1. Acesse [app.supabase.com](https://app.supabase.com) → projeto afetado → **Settings → API**.
2. Em **Project API keys**, clique em **Reveal** ao lado de `service_role`.
3. Clique em **Generate new key** (disponível em projetos pagos) OU, se não disponível, troque a senha do banco (Settings → Database → **Reset database password**) — isso invalida os JWTs antigos.
4. Atualize as variáveis de ambiente em todos os ambientes (local, staging, produção).
5. Rotacione o `SUPABASE_DB_PASSWORD` em Settings → Database separadamente se ele também estava exposto (caso MecanicaSmart).

**Atenção:** O `anon` key (público) pode aparecer hardcoded no frontend — isso é aceitável **somente se RLS estiver configurado corretamente**. O `service_role` jamais deve ser exposto no cliente.

---

## 3. Google OAuth Client Secret — `GOCSPX-*` (5 jogos)

**Contexto:** `GOOGLE_CLIENT_SECRET=GOCSPX-*` em `.env.local` de: Guerra dos Formigueiros, RealCities, ScienceAdventure, Senet, ShoppingTrem.

**Rotação (cada jogo tem um client_secret separado — rotacionar todos):**
1. Acesse [console.cloud.google.com](https://console.cloud.google.com) → projeto do jogo → **APIs & Services → Credentials**.
2. Clique no OAuth 2.0 Client ID do jogo.
3. Clique em **Reset Secret** (ou **Edit** → **Reset Secret**). O novo secret é gerado imediatamente; o antigo para de funcionar.
4. Copie o novo secret e atualize o `.env.local` local e as variáveis de ambiente de produção.
5. Repita para cada um dos 5 projetos.

**Verificação:** fluxo de login OAuth completo no ambiente de staging sem erro `invalid_client`.

---

## 4. Google Analytics — `refresh_token` (ProjetosMapper)

**Contexto:** `ProjetosMapper/ga_token.json` contém um `refresh_token` ativo da conta Google Analytics do Caio. Com esse token, qualquer pessoa consegue ler/escrever dados de analytics da conta.

**Revogação:**
1. Acesse [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
2. Encontre o aplicativo que gerou o token (ProjetosMapper / GA Data API) e clique em **Revogar acesso**.
3. Para regenerar acesso legítimo: use o fluxo OAuth novamente no ProjetosMapper com escopos mínimos e armazene o novo token fora do repositório (variável de ambiente ou cofre).

**Alternativa segura:** use uma Service Account com escopo de leitura somente, em vez de refresh_token de usuário pessoal.

---

## 5. Android Upload Keystore — `keystore.properties` (AulaLogger)

**Contexto:** `AulaLogger/keystore.properties` contém `storePassword` e `keyPassword` em texto plano. Essa senha protege a chave de upload da Play Store — quem tiver a chave + senha pode publicar builds fraudulentos como AulaLogger.

**A chave de upload do Google Play NÃO pode ser rotacionada facilmente** — o Google assina o APK e exige continuidade. O foco é proteger o arquivo existente.

**Remediação (sem rotacionar a chave):**
1. Confirme que `keystore.properties` está no `.gitignore` do AulaLogger. Se não estiver, adicione:
   ```
   keystore.properties
   *.jks
   *.keystore
   ```
2. Se `keystore.properties` está no histórico git:
   ```bash
   git filter-repo --path keystore.properties --invert-paths
   git push --force
   ```
3. Mova as senhas para **GitHub Secrets** (`KEYSTORE_PASSWORD`, `KEY_PASSWORD`) e referencie no `build.gradle.kts`:
   ```kotlin
   storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
   keyPassword = System.getenv("KEY_PASSWORD") ?: ""
   ```
4. O arquivo `.jks` / `.keystore` físico deve ficar em local cifrado offline (ex.: KeePass, 1Password, cofre físico) — nunca no repositório.

**Se a chave REALMENTE vazou** (repositório público + arquivo exposto): contate o Google Play Developer Support para iniciar o processo de rotação de chave de upload (processo longo, exige verificação de identidade).

---

## 6. Dados genéticos — `dna_caio/` (DNA Explorer)

Dados genéticos não são credenciais — não há "rotação". Ver seção específica no `SKILL.md` principal.

**Ação:** mover para armazenamento local cifrado (VeraCrypt, BitLocker) e remover do repositório com `git filter-repo`.

---

## Checklist pós-rotação

- [ ] Nova credencial funciona nos ambientes de staging e produção.
- [ ] Credencial antiga foi explicitamente revogada (não só substituída).
- [ ] `.env.example` atualizado com placeholder (ex.: `STRIPE_SECRET_KEY=sk_live_****`).
- [ ] `.gitignore` tem as entradas necessárias (ver `assets/gitignore-secrets.txt`).
- [ ] `check_git_history.sh` confirma que o padrão não aparece mais em commits futuros.
- [ ] ProjetosMapper não é mais a fonte de verdade para credenciais de outros projetos.
