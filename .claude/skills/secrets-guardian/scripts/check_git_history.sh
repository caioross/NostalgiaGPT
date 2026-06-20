#!/usr/bin/env bash
# check_git_history.sh — Verifica se um arquivo ou padrão de texto já entrou
# no histórico git de um repositório.
#
# Uso:
#   bash check_git_history.sh <arquivo-ou-glob>              # busca o arquivo no histórico
#   bash check_git_history.sh <arquivo> <padrão-de-texto>   # busca o padrão no diff do arquivo
#
# Exemplos reais do portfólio:
#   bash check_git_history.sh .env
#   bash check_git_history.sh .env "sk_live"
#   bash check_git_history.sh keystore.properties "storePassword"
#   bash check_git_history.sh credentials_config.js "client_secret"
#   bash check_git_history.sh "dna_caio/" ""
#
# O script NUNCA imprime valores de segredo — apenas indica se o padrão
# foi encontrado e em qual commit.

set -euo pipefail

FILE="${1:-}"
PATTERN="${2:-}"

if [[ -z "$FILE" ]]; then
    echo "Uso: $0 <arquivo-ou-glob> [padrão-de-texto]"
    echo "Exemplo: $0 .env 'sk_live'"
    exit 1
fi

# Verifica que estamos dentro de um repositório git
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    echo "Erro: não estamos dentro de um repositório git."
    echo "Navegue até a raiz do projeto antes de rodar este script."
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
echo ""
echo "========================================================"
echo "  AUDITORIA DE HISTÓRICO GIT"
echo "  Repositório : $REPO_ROOT"
echo "  Arquivo     : $FILE"
echo "  Padrão      : ${PATTERN:-'(qualquer conteúdo)'}"
echo "========================================================"
echo ""

# ---------------------------------------------------------------------------
# Passo 1: Verificar se o arquivo/glob aparece em algum commit do histórico
# ---------------------------------------------------------------------------
echo "── Passo 1: commits que tocaram '$FILE' ──────────────────"
COMMITS=$(git log --all --oneline -- "$FILE" 2>/dev/null || true)

if [[ -z "$COMMITS" ]]; then
    echo "  ✓ Nenhum commit encontrado para '$FILE'."
    echo "    O arquivo aparentemente nunca entrou no histórico git."
else
    echo "  ⚠  ARQUIVO ENCONTRADO NO HISTÓRICO:"
    echo "$COMMITS" | head -30
    COMMIT_COUNT=$(echo "$COMMITS" | wc -l)
    echo ""
    echo "  Total de commits que tocaram '$FILE': $COMMIT_COUNT"
    echo "  Isso significa que mesmo que o arquivo esteja no .gitignore hoje,"
    echo "  o conteúdo pode estar acessível via 'git checkout <hash> -- $FILE'."
    echo ""
    echo "  Se o arquivo continha segredos e o repo é público: ROTACIONAR AGORA."
fi

echo ""

# ---------------------------------------------------------------------------
# Passo 2: Se um padrão foi fornecido, buscar no diff de todos os commits
# ---------------------------------------------------------------------------
if [[ -n "$PATTERN" ]]; then
    echo "── Passo 2: commits cujo diff contém o padrão '$PATTERN' ─"
    # -S busca commits que adicionaram ou removeram o padrão (pickaxe search)
    PATTERN_COMMITS=$(git log --all --oneline -S "$PATTERN" -- "$FILE" 2>/dev/null || true)

    if [[ -z "$PATTERN_COMMITS" ]]; then
        echo "  ✓ Padrão '$PATTERN' não encontrado nos diffs de '$FILE'."
    else
        echo "  🔴 PADRÃO ENCONTRADO NOS DIFFS:"
        echo "$PATTERN_COMMITS" | head -20
        echo ""
        echo "  ► O texto '$PATTERN' foi adicionado ou removido nesses commits."
        echo "    Para ver o contexto de um commit específico (sem imprimir o valor):"
        echo "    git show <hash> -- $FILE | grep -n '${PATTERN:0:6}' | head -5"
        echo ""
        echo "  ► AÇÃO OBRIGATÓRIA se o repo for público (ou puder ter sido clonado):"
        echo "    1. Rotacionar a credencial imediatamente (ver rotation-runbook.md)."
        echo "    2. Limpar o histórico:"
        echo "       pip install git-filter-repo"
        echo "       git filter-repo --path '$FILE' --invert-paths"
        echo "       git push --force"
        echo "    3. OU: tornar o repositório privado."
    fi
    echo ""
fi

# ---------------------------------------------------------------------------
# Passo 3: Verificar presença atual no .gitignore
# ---------------------------------------------------------------------------
echo "── Passo 3: status atual no .gitignore ───────────────────"
BASENAME=$(basename "$FILE")
if git check-ignore -q "$FILE" 2>/dev/null; then
    echo "  ✓ '$FILE' está ignorado pelo .gitignore atual."
else
    # Tenta verificar o basename também
    if grep -qF "$BASENAME" "$(git rev-parse --show-toplevel)/.gitignore" 2>/dev/null; then
        echo "  ✓ '$BASENAME' encontrado no .gitignore."
    else
        echo "  ⚠  '$FILE' NÃO está listado no .gitignore."
        echo "    Adicione a linha abaixo ao .gitignore do projeto:"
        echo "    $BASENAME"
    fi
fi

echo ""
echo "========================================================"
echo "  Próximos passos:"
echo "  • Rotacionar credencial: ver references/rotation-runbook.md"
echo "  • Template .gitignore  : ver assets/gitignore-secrets.txt"
echo "========================================================"
echo ""
