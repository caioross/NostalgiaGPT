---
name: secrets-guardian
description: "Detecta segredos expostos, audita histórico git, orienta rotação e migração para cofre/GitHub Secrets. Use SEMPRE que a conversa tocar em: .env, .env.local, keystore, service_role, sk_live, GOCSPX-, OAuth client secret, refresh_token, Supabase key, segredos do skilldepot/MecanicaSmart/ProjetosMapper, dados genéticos do DNA Explorer, ou qualquer suspeita de credencial no código ou histórico git. Não espere o usuário dizer 'segurança' — dispare se a tarefa pode tocar num segredo real."
---

# secrets-guardian

## Contexto real do portfólio

O relatório central identificou segredos **vivos** espalhados por pelo menos 10 projetos. Os mais críticos:

| Projeto | Segredo | Gravidade |
|---|---|---|
| `skilldepot/.env` | `STRIPE_SECRET_KEY=sk_live_*` + `SUPABASE_SERVICE_ROLE` | 🔴 P0 |
| `ProjetosMapper/credentials_config.js` | OAuth client_secret de 10+ projetos | 🔴 P0 |
| `ProjetosMapper/db_config.js` | service_role de múltiplos Supabase | 🔴 P0 |
| `ProjetosMapper/ga_token.json` | `refresh_token` ativo do Google Analytics | 🔴 P0 |
| `MecanicaSmart/.env.local` | `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_DB_PASSWORD` | 🔴 P0 |
| `Guerra/.env.local`, `RealCities/.env.local`, `ScienceAdventure/.env.local`, `Senet/.env.local`, `ShoppingTrem/.env.local` | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (formato `GOCSPX-`) reais | 🔴 P0 |
| `AulaLogger/keystore.properties` | Senha do upload keystore da Play Store em texto plano | 🟠 Alta |
| `DNA Explorer/dna_caio/` | Dados genéticos pessoais reais — risco de privacidade irreversível | 🔴 P0 |
| `Claude Skilldepot` (migration SQL) | `client_secret` hardcoded; sem `.gitignore` | 🟠 Alta |

**Regra absoluta:** NUNCA imprima, armazene, loggue ou repasse um valor de segredo real. Sempre mascare (`sk_live_****`). O objetivo é confirmar a presença e remediar, não exibir.

---

## Workflow de triagem

### 1. Escanear o repositório atual

```bash
python3 scripts/scan_secrets.py <caminho-do-repo>
```

O script retorna arquivo:linha, severidade e dica de remediação. Rode antes de qualquer commit ou push.

### 2. Verificar se o segredo entrou no histórico git

```bash
bash scripts/check_git_history.sh <arquivo-suspeito> [padrão-de-busca]
# Exemplo:
bash scripts/check_git_history.sh .env "sk_live"
bash scripts/check_git_history.sh keystore.properties "storePassword"
```

Se o script confirmar que o segredo está no histórico de um repo público, **rotacionar é obrigatório** — apagar o arquivo não remove do histórico. Ver `references/rotation-runbook.md`.

### 3. Rotacionar as credenciais afetadas

Siga `references/rotation-runbook.md` — há uma seção por provedor (Stripe, Supabase, Google OAuth, GA, Android keystore).

A sequência correta é sempre: **rotacionar primeiro, limpar histórico depois.** Rotacionar com o segredo ainda no histórico garante que a chave velha (possivelmente vazada) para de funcionar imediatamente.

### 4. Corrigir a causa raiz

- Copie `assets/.env.example` como template para o projeto.
- Adicione as entradas de `assets/gitignore-secrets.txt` ao `.gitignore` do projeto.
- Mova os valores reais para GitHub Secrets (CI/CD) ou cofre local (1Password / Bitwarden).
- ProjetosMapper: aposentar `credentials_config.js` e `db_config.js` — nunca concentrar segredos de múltiplos projetos num único arquivo fora de cofre.

### 5. Limpar histórico git (se o segredo foi commitado)

Para repos públicos ou repositórios com histórico compartilhado:

```bash
# Opção A — BFG Repo-Cleaner (mais simples, exige Java)
java -jar bfg.jar --delete-files .env <repo>
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force

# Opção B — git-filter-repo (mais preciso, via pip)
pip install git-filter-repo
git filter-repo --path .env --invert-paths
git push --force
```

Após reescrever histórico, todos os colaboradores devem fazer `git clone` novo — `git pull` não funciona sobre histórico reescrito.

---

## Dados genéticos — cuidado especial

`DNA Explorer/dna_caio/` contém dados genéticos pessoais reais. Dados genéticos são **irrevogáveis** — não é possível "rotacionar" DNA. Se esse diretório foi commitado em repo público:
1. Torne o repo privado imediatamente.
2. Reescreva o histórico com `git filter-repo --path dna_caio --invert-paths`.
3. Nunca coloque dados biométricos ou genéticos em repositório (público ou privado).
4. Mova os arquivos para armazenamento local cifrado fora de qualquer repo.

---

## Critério de aceite

- `scripts/scan_secrets.py` roda sem erro e produz saída com severidade por arquivo:linha.
- `scripts/check_git_history.sh` confirma ausência do segredo no histórico, OU o segredo foi rotacionado e o runbook de limpeza foi executado.
- Nenhum segredo real aparece no diff do próximo commit.
- `.env.example` (sem valores reais) está commitado; `.env` e `.env.local` estão no `.gitignore`.
- ProjetosMapper não é mais usado como cofre de credenciais de outros projetos.

---

## Referências e assets

- `references/rotation-runbook.md` — rotação passo a passo por provedor
- `assets/.env.example` — template seguro de variáveis de ambiente
- `assets/gitignore-secrets.txt` — entradas de `.gitignore` prontas para copiar
