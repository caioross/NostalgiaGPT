#!/usr/bin/env python3
"""
scan_secrets.py — Scanner de segredos para o portfólio Caio.

Uso:
    python3 scan_secrets.py <caminho-do-repo>
    python3 scan_secrets.py .
    python3 scan_secrets.py E:/Projetos/skilldepot

O script varre todos os arquivos de texto do diretório, aplica regexes
para padrões de segredo conhecidos e imprime file:linha, severidade e
dica de remediação. NUNCA imprime o valor completo — sempre mascara.

Regra absoluta: este script detecta e avisa. Nunca exfiltra dados.
"""

import os
import re
import sys
from pathlib import Path
from typing import NamedTuple

# ---------------------------------------------------------------------------
# Padrões — baseados nos achados reais do Relatório Central
# ---------------------------------------------------------------------------

class Pattern(NamedTuple):
    name: str
    regex: re.Pattern
    severity: str   # CRITICA | ALTA | MEDIA
    hint: str       # o que fazer ao encontrar


PATTERNS = [
    Pattern(
        name="Stripe live key",
        regex=re.compile(r"sk_live_[A-Za-z0-9]{20,}"),
        severity="CRITICA",
        hint="Rotacionar AGORA em dashboard.stripe.com → Developers → API Keys. Ver rotation-runbook.md §Stripe.",
    ),
    Pattern(
        name="Stripe test key",
        regex=re.compile(r"sk_test_[A-Za-z0-9]{20,}"),
        severity="ALTA",
        hint="Chave de teste: menor risco, mas não deve estar versionada. Mover para .env (ignorado).",
    ),
    Pattern(
        name="Google OAuth client secret (GOCSPX-)",
        regex=re.compile(r"GOCSPX-[A-Za-z0-9_\-]{20,}"),
        severity="CRITICA",
        hint="Revogar em console.cloud.google.com → APIs & Services → Credentials. Projetos afetados: Guerra, RealCities, ScienceAdventure, Senet, ShoppingTrem.",
    ),
    Pattern(
        name="Google OAuth client_secret em JSON",
        regex=re.compile(r'"client_secret"\s*:\s*"(GOCSPX-[^"]{10,}|[A-Za-z0-9_\-]{20,})"'),
        severity="CRITICA",
        hint="client_secret em JSON/JS. Ver ProjetosMapper/credentials_config.js. Mover para cofre.",
    ),
    Pattern(
        name="Supabase service_role JWT",
        regex=re.compile(r"eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"),
        severity="ALTA",
        hint="Parece JWT. Verificar se é service_role (decodifique e confira o campo 'role'). Se sim: rotacionar no painel Supabase → Settings → API.",
    ),
    Pattern(
        name="SUPABASE_SERVICE_ROLE_KEY em variável de ambiente",
        regex=re.compile(r"SUPABASE_SERVICE_ROLE(?:_KEY)?\s*[=:]\s*\S+"),
        severity="CRITICA",
        hint="service_role dá acesso total ao banco, bypass de RLS. Rotacionar em app.supabase.com → Settings → API. Projetos: skilldepot, MecanicaSmart.",
    ),
    Pattern(
        name="Private key PEM",
        regex=re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"),
        severity="CRITICA",
        hint="Chave privada em texto plano. Mover para local cifrado fora do repositório.",
    ),
    Pattern(
        name="keystore.properties senha",
        regex=re.compile(r"(?:storePassword|keyPassword)\s*=\s*\S+"),
        severity="ALTA",
        hint="Senha do keystore Android em texto plano. Ver AulaLogger/keystore.properties. Mover para GitHub Secrets. Ver rotation-runbook.md §Android.",
    ),
    Pattern(
        name="Google Analytics refresh_token",
        regex=re.compile(r'"refresh_token"\s*:\s*"[A-Za-z0-9_\-/]{20,}"'),
        severity="CRITICA",
        hint="refresh_token do GA ativo. Ver ProjetosMapper/ga_token.json. Revogar em myaccount.google.com/permissions.",
    ),
    Pattern(
        name="Supabase DB password",
        regex=re.compile(r"SUPABASE_DB_PASSWORD\s*[=:]\s*\S+"),
        severity="CRITICA",
        hint="Senha direta do banco Postgres do Supabase. Rotacionar em Settings → Database → Reset database password.",
    ),
    Pattern(
        name="Variável .env com valor preenchido",
        regex=re.compile(r'^[A-Z][A-Z0-9_]{3,}\s*=\s*(?!$)(?!["\']\s*["\']$)\S+', re.MULTILINE),
        severity="MEDIA",
        hint="Variável de ambiente com valor. Confirmar se é segredo; se sim, mover para .env (ignorado pelo git) e documentar no .env.example sem valor.",
    ),
]

# ---------------------------------------------------------------------------
# Arquivos e diretórios a ignorar
# ---------------------------------------------------------------------------

IGNORE_DIRS = {
    ".git", "node_modules", "__pycache__", ".next", "build", "dist",
    "out", ".venv", "venv", "env", ".gradle", ".idea", ".vs",
    "Library", "Temp", "obj", "bin",
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".mp3", ".mp4", ".wav", ".ogg", ".flac",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".exe", ".dll", ".so", ".dylib", ".apk", ".aab",
    ".glb", ".gltf", ".fbx", ".obj",
    ".ttf", ".otf", ".woff", ".woff2",
    ".map",  # source maps podem ser grandes
    ".lock",
    ".gguf", ".bin", ".pt", ".onnx",  # modelos de IA
}

# Arquivos que NUNCA devem existir com conteúdo de segredo
SENSITIVE_FILENAMES = {
    ".env", ".env.local", ".env.production", ".env.staging",
    "keystore.properties", "credentials_config.js", "db_config.js",
    "ga_token.json", "client_secret.json", "service_account.json",
}


def mask(value: str, keep: int = 4) -> str:
    """Mascara um valor mantendo apenas os primeiros `keep` caracteres."""
    if len(value) <= keep:
        return "****"
    return value[:keep] + "****"


def mask_line(line: str, match: re.Match) -> str:
    """Retorna a linha com o match mascarado para exibição segura."""
    start, end = match.span()
    matched = match.group(0)
    # Tenta mascarar somente a parte sensível (após = ou :)
    eq_pos = matched.find("=")
    colon_pos = matched.find(":")
    pivot = max(eq_pos, colon_pos)
    if pivot >= 0:
        prefix = matched[: pivot + 1]
        secret = matched[pivot + 1:].strip().strip('"').strip("'")
        masked_part = f"{prefix} {mask(secret)}"
    else:
        masked_part = mask(matched)
    return line[:start] + masked_part + line[end:]


def should_skip_dir(d: str) -> bool:
    return d in IGNORE_DIRS or d.startswith(".")


def is_binary_or_large(path: Path, max_bytes: int = 2_000_000) -> bool:
    try:
        size = path.stat().st_size
        if size > max_bytes:
            return True
        if size == 0:
            return False
        with open(path, "rb") as f:
            chunk = f.read(1024)
        # Heurística simples: presença de byte nulo → binário
        return b"\x00" in chunk
    except OSError:
        return True


def scan_file(path: Path) -> list[dict]:
    findings = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return findings

    lines = text.splitlines()
    for lineno, line in enumerate(lines, start=1):
        for pat in PATTERNS:
            m = pat.regex.search(line)
            if m:
                findings.append(
                    {
                        "file": str(path),
                        "line": lineno,
                        "pattern": pat.name,
                        "severity": pat.severity,
                        "hint": pat.hint,
                        "preview": mask_line(line.strip(), m)[:120],
                    }
                )
                break  # um achado por linha é suficiente para não duplicar
    return findings


def warn_sensitive_filename(path: Path) -> dict | None:
    if path.name in SENSITIVE_FILENAMES:
        return {
            "file": str(path),
            "line": 0,
            "pattern": "Arquivo sensível detectado",
            "severity": "ALTA",
            "hint": f"'{path.name}' não deve ser commitado. Confirme que está no .gitignore.",
            "preview": f"(arquivo: {path.name})",
        }
    return None


def scan_repo(root: str) -> list[dict]:
    root_path = Path(root).resolve()
    all_findings: list[dict] = []

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Poda dirs ignorados in-place para não descer neles
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        for fname in filenames:
            fpath = Path(dirpath) / fname

            # Aviso de nome de arquivo sensível (mesmo sem escanear conteúdo)
            warn = warn_sensitive_filename(fpath)
            if warn:
                all_findings.append(warn)

            if fpath.suffix.lower() in IGNORE_EXTENSIONS:
                continue
            if is_binary_or_large(fpath):
                continue

            findings = scan_file(fpath)
            all_findings.extend(findings)

    return all_findings


def severity_order(s: str) -> int:
    return {"CRITICA": 0, "ALTA": 1, "MEDIA": 2}.get(s, 9)


def print_report(findings: list[dict], root: str) -> None:
    if not findings:
        print(f"\n✓ Nenhum segredo detectado em '{root}'.")
        print("  Sempre confirme também com: bash scripts/check_git_history.sh <arquivo> <padrão>")
        return

    findings_sorted = sorted(findings, key=lambda f: (severity_order(f["severity"]), f["file"], f["line"]))

    counts = {"CRITICA": 0, "ALTA": 0, "MEDIA": 0}
    for f in findings_sorted:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1

    print(f"\n{'='*70}")
    print(f"  RELATÓRIO DE SEGREDOS — {root}")
    print(f"{'='*70}")
    print(f"  CRÍTICA: {counts['CRITICA']}  |  ALTA: {counts['ALTA']}  |  MÉDIA: {counts['MEDIA']}")
    print(f"{'='*70}\n")

    current_severity = None
    for f in findings_sorted:
        if f["severity"] != current_severity:
            current_severity = f["severity"]
            label = {"CRITICA": "🔴 CRITICA", "ALTA": "🟠 ALTA", "MEDIA": "🟡 MEDIA"}.get(current_severity, current_severity)
            print(f"\n  [{label}]\n")

        loc = f"{f['file']}:{f['line']}" if f["line"] else f["file"]
        print(f"  ► {loc}")
        print(f"    Padrão : {f['pattern']}")
        print(f"    Trecho : {f['preview']}")
        print(f"    Ação   : {f['hint']}")
        print()

    print(f"{'='*70}")
    if counts["CRITICA"] > 0:
        print("  ⚠  Segredos CRÍTICOS detectados. Rotacionar ANTES de qualquer push.")
        print("  ⚠  Ver references/rotation-runbook.md para instruções por provedor.")
    print(f"{'='*70}\n")


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Uso: python3 {sys.argv[0]} <caminho-do-repo>")
        sys.exit(1)

    root = sys.argv[1]
    if not os.path.isdir(root):
        print(f"Erro: '{root}' não é um diretório válido.")
        sys.exit(1)

    print(f"Escaneando '{root}'...")
    findings = scan_repo(root)
    print_report(findings, root)

    # Exit code não-zero se houver achados críticos (útil em CI)
    critica = sum(1 for f in findings if f["severity"] == "CRITICA")
    sys.exit(1 if critica > 0 else 0)


if __name__ == "__main__":
    main()
