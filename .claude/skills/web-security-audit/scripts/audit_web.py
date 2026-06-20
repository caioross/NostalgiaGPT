#!/usr/bin/env python3
"""
audit_web.py — Scanner de segurança OWASP-style para a stack Next.js + Supabase + Stripe.

Uso:
    python3 audit_web.py <caminho-do-projeto>
    python3 audit_web.py E:/Projetos/skilldepot
    python3 audit_web.py .

Detecta os padrões identificados no audit do skilldepot (14 vulnerabilidades):
  CRIT-01: SQL injection / interpolação em filtros Supabase/PostgREST
  CRIT-02: XSS via dangerouslySetInnerHTML sem DOMPurify
  CRIT-03: CORS wildcard Access-Control-Allow-Origin: *
  CRIT-04: OAuth PKCE com method 'plain' em vez de 'S256'
  CRIT-05: Rate limiting em Map() em memória (não funciona em serverless)
  CRIT-06: Redirect URI sem validação (open redirect)
  CRIT-07: state/CSRF ausente no fluxo OAuth
  CRIT-08: Tokens armazenados em localStorage
  CRIT-09: RLS ausente ou tabelas sem enable_rls

Produz relatório em stdout com severidade, localização e dica de fix.
"""

import os
import re
import sys
from pathlib import Path
from typing import NamedTuple, Optional


class AuditPattern(NamedTuple):
    crit_id: str
    name: str
    regex: re.Pattern
    severity: str       # CRITICA | ALTA | MEDIA
    hint: str
    false_positive_hint: Optional[str] = None  # o que verificar manualmente


PATTERNS: list[AuditPattern] = [
    # CRIT-01: Interpolação de string em query Supabase
    AuditPattern(
        crit_id="CRIT-01",
        name="SQL Injection — interpolação em query Supabase/PostgREST",
        regex=re.compile(
            r'\.filter\s*\(\s*[\'"][^,]+[\'"],\s*[\'"](?:eq|neq|like|ilike|cs|cd)[\'"],\s*[`\'"]\$\{|'
            r'\.rpc\s*\([^)]+\$\{[^}]+\}|'
            r'supabase\.from\([^)]+\)\.select\([^)]*\$\{',
            re.MULTILINE,
        ),
        severity="CRITICA",
        hint="Não interpole variáveis em queries Supabase. Use .eq('col', value) com o valor separado, ou RPC com parâmetros tipados. Ver SKILL.md §CRIT-01.",
        false_positive_hint="Verificar se a interpolação é realmente no filtro ou apenas na seleção de colunas.",
    ),
    # CRIT-02: dangerouslySetInnerHTML sem DOMPurify
    AuditPattern(
        crit_id="CRIT-02",
        name="XSS — dangerouslySetInnerHTML sem DOMPurify",
        regex=re.compile(r"dangerouslySetInnerHTML\s*=\s*\{\s*\{", re.MULTILINE),
        severity="CRITICA",
        hint="Todo dangerouslySetInnerHTML deve passar por DOMPurify.sanitize(). Instalar: npm install dompurify @types/dompurify",
        false_positive_hint="Verificar se a linha seguinte contém DOMPurify.sanitize() ou isomorphic-dompurify.",
    ),
    # CRIT-02b: dangerouslySetInnerHTML com __html direto (sem sanitize)
    AuditPattern(
        crit_id="CRIT-02b",
        name="XSS — __html sem sanitização aparente",
        regex=re.compile(r'__html\s*:\s*(?!DOMPurify)', re.MULTILINE),
        severity="CRITICA",
        hint="Confirmar que o valor de __html passa por DOMPurify.sanitize() antes de ser atribuído.",
    ),
    # CRIT-03: CORS wildcard
    AuditPattern(
        crit_id="CRIT-03",
        name="CORS wildcard — Access-Control-Allow-Origin: *",
        regex=re.compile(
            r"Access-Control-Allow-Origin['\"]?\s*[,:]?\s*['\"]?\*|"
            r"setHeader\s*\(\s*['\"]Access-Control-Allow-Origin['\"],\s*['\*'\"]\*['\"]",
            re.MULTILINE | re.IGNORECASE,
        ),
        severity="CRITICA",
        hint="Substituir '*' por lista explícita de origens permitidas. Em endpoints autenticados, wildcard permite CSRF cross-origin. Ver SKILL.md §CRIT-03.",
        false_positive_hint="OK em endpoints verdadeiramente públicos sem autenticação (ex.: health check). Documentar explicitamente se intencional.",
    ),
    # CRIT-04: OAuth PKCE plain
    AuditPattern(
        crit_id="CRIT-04",
        name="OAuth PKCE inseguro — method 'plain'",
        regex=re.compile(r"pkce(?:Method|method|_method)\s*[=:]\s*['\"]plain['\"]", re.MULTILINE | re.IGNORECASE),
        severity="CRITICA",
        hint="PKCE 'plain' é vulnerável a interceptação. Usar 'S256' (SHA-256). Supabase @supabase/ssr >= 0.5 usa S256 por padrão.",
    ),
    # CRIT-05: Rate limiting em Map() em memória
    AuditPattern(
        crit_id="CRIT-05",
        name="Rate limiting em memória — não funciona em serverless",
        regex=re.compile(
            r"new\s+Map\s*<[^>]*string[^>]*number|"
            r"rateLimitMap\s*=\s*new\s+Map|"
            r"const\s+\w*[Rr]ate[Ll]imit\w*\s*=\s*new\s+Map",
            re.MULTILINE,
        ),
        severity="ALTA",
        hint="Map() em memória é zerado a cada deploy/cold start no serverless. Usar Redis (ex.: Upstash Ratelimit) para rate limiting distribuído. Ver SKILL.md §CRIT-05.",
    ),
    # CRIT-06: redirect_uri sem validação
    AuditPattern(
        crit_id="CRIT-06",
        name="Open redirect — redirect_uri sem validação de lista branca",
        regex=re.compile(
            r"redirectTo\s*[=:]\s*(?:req\.query|params\.|searchParams\.get)\s*[\(\['][^)]*redirect",
            re.MULTILINE | re.IGNORECASE,
        ),
        severity="CRITICA",
        hint="redirect_uri deve ser validado contra lista branca de URLs permitidas antes de redirecionar. Nunca use valor direto de query string como redirectTo.",
    ),
    # CRIT-07: state/CSRF ausente em OAuth
    AuditPattern(
        crit_id="CRIT-07",
        name="CSRF — state ausente em initiation de OAuth",
        regex=re.compile(
            r"signInWithOAuth\s*\(\s*\{(?![^}]*state)[^}]*\}",
            re.MULTILINE | re.DOTALL,
        ),
        severity="CRITICA",
        hint="Adicionar parâmetro 'state' gerado aleatoriamente ao iniciar OAuth e verificar na callback. Supabase @supabase/ssr gerencia isso automaticamente se usado corretamente.",
        false_positive_hint="Verificar se Supabase está gerenciando o state internamente na versão usada.",
    ),
    # CRIT-08: tokens em localStorage
    AuditPattern(
        crit_id="CRIT-08",
        name="Tokens sensíveis em localStorage (sujeito a XSS)",
        regex=re.compile(
            r"localStorage\.setItem\s*\(\s*['\"][^'\"]*(?:token|key|secret|auth|session)[^'\"]*['\"]",
            re.MULTILINE | re.IGNORECASE,
        ),
        severity="ALTA",
        hint="Tokens de autenticação em localStorage são roubados por qualquer XSS. Usar httpOnly cookies para sessões. Supabase @supabase/ssr gerencia storage seguro automaticamente.",
    ),
    # CRIT-09: tabelas Supabase sem RLS
    AuditPattern(
        crit_id="CRIT-09",
        name="Supabase — tabela sem RLS habilitado",
        regex=re.compile(
            r"create\s+table\s+(?!.*enable\s+row\s+level\s+security)(\w+)",
            re.MULTILINE | re.IGNORECASE,
        ),
        severity="CRITICA",
        hint="Toda tabela Supabase deve ter RLS habilitado. Tabela sem RLS = dados acessíveis a qualquer usuário autenticado. Adicionar: ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY;",
        false_positive_hint="Em migrations, verificar se existe uma migration posterior habilitando RLS na mesma tabela.",
    ),
    # Extra: service_role no cliente
    AuditPattern(
        crit_id="SEC-10",
        name="service_role exposta no cliente (NEXT_PUBLIC_)",
        regex=re.compile(r"NEXT_PUBLIC_[A-Z_]*SERVICE_ROLE", re.MULTILINE),
        severity="CRITICA",
        hint="service_role NUNCA deve ser prefixada com NEXT_PUBLIC_ — isso a expõe ao browser e bypassa RLS.",
    ),
]

# ---------------------------------------------------------------------------
# Arquivos e diretórios a ignorar
# ---------------------------------------------------------------------------

IGNORE_DIRS = {
    ".git", "node_modules", ".next", "build", "dist", "out",
    ".venv", "venv", "__pycache__", ".gradle", ".idea", ".vs",
    "coverage", ".turbo",
}

IGNORE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp",
    ".mp3", ".mp4", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".7z",
    ".pdf", ".docx", ".xlsx",
    ".exe", ".dll", ".apk", ".aab",
    ".map", ".lock",
    ".gguf", ".bin", ".pt", ".onnx",
    ".ttf", ".otf", ".woff", ".woff2",
}

TARGET_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".sql", ".prisma",
    ".json",  # para package.json, config files
}


def should_skip_dir(d: str) -> bool:
    return d in IGNORE_DIRS or d.startswith(".")


def is_target_file(path: Path) -> bool:
    suffix = path.suffix.lower()
    if suffix in IGNORE_EXTENSIONS:
        return False
    if suffix in TARGET_EXTENSIONS:
        return True
    # Arquivos sem extensão conhecida: checar se é texto pequeno
    return False


def is_binary(path: Path) -> bool:
    try:
        with open(path, "rb") as f:
            chunk = f.read(1024)
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
                # Preview seguro: mostrar contexto mas limitar tamanho
                preview = line.strip()[:150]
                findings.append(
                    {
                        "file": str(path),
                        "line": lineno,
                        "crit_id": pat.crit_id,
                        "name": pat.name,
                        "severity": pat.severity,
                        "hint": pat.hint,
                        "preview": preview,
                        "fp_hint": pat.false_positive_hint,
                    }
                )
                break  # um achado por linha

    return findings


def scan_project(root: str) -> list[dict]:
    root_path = Path(root).resolve()
    all_findings: list[dict] = []

    for dirpath, dirnames, filenames in os.walk(root_path):
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        for fname in filenames:
            fpath = Path(dirpath) / fname
            if not is_target_file(fpath):
                continue
            if is_binary(fpath):
                continue
            all_findings.extend(scan_file(fpath))

    return all_findings


def severity_order(s: str) -> int:
    return {"CRITICA": 0, "ALTA": 1, "MEDIA": 2}.get(s, 9)


def print_report(findings: list[dict], root: str) -> None:
    if not findings:
        print(f"\n✓ Nenhuma vulnerabilidade detectada automaticamente em '{root}'.")
        print("  Execute a checklist manual: references/owasp-web-checklist.md")
        return

    findings_sorted = sorted(
        findings,
        key=lambda f: (severity_order(f["severity"]), f["crit_id"], f["file"], f["line"]),
    )

    # Contar por severidade e por CRIT-ID
    by_crit: dict[str, list[dict]] = {}
    counts = {"CRITICA": 0, "ALTA": 0, "MEDIA": 0}
    for f in findings_sorted:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
        by_crit.setdefault(f["crit_id"], []).append(f)

    print(f"\n{'='*72}")
    print(f"  RELATÓRIO DE SEGURANÇA WEB — {root}")
    print(f"{'='*72}")
    print(f"  CRÍTICA: {counts['CRITICA']}  |  ALTA: {counts['ALTA']}  |  MÉDIA: {counts['MEDIA']}")
    print(f"  Total de achados: {len(findings_sorted)}")
    print(f"{'='*72}\n")

    current_sev = None
    for f in findings_sorted:
        if f["severity"] != current_sev:
            current_sev = f["severity"]
            label = {"CRITICA": "🔴 CRÍTICA", "ALTA": "🟠 ALTA", "MEDIA": "🟡 MÉDIA"}.get(current_sev, current_sev)
            print(f"\n  [{label}]\n")

        print(f"  [{f['crit_id']}] {f['name']}")
        print(f"  Arquivo : {f['file']}:{f['line']}")
        print(f"  Trecho  : {f['preview']}")
        print(f"  Fix     : {f['hint']}")
        if f.get("fp_hint"):
            print(f"  ⚠ Falso positivo?: {f['fp_hint']}")
        print()

    print(f"{'='*72}")
    print("  Próximos passos:")
    print("  1. Revisar cada achado CRÍTICO manualmente (ver ⚠ Falso positivo?)")
    print("  2. Preencher assets/AUDIT-VERIFIED.template.md com status de cada item")
    print("  3. Aplicar fixes via references/nextjs-supabase-stripe-patterns.md")
    print("  4. Re-rodar este script até zerar os CRÍTICOS")
    print(f"{'='*72}\n")


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Uso: python3 {sys.argv[0]} <caminho-do-projeto>")
        sys.exit(1)

    root = sys.argv[1]
    if not os.path.isdir(root):
        print(f"Erro: '{root}' não é um diretório válido.")
        sys.exit(1)

    print(f"Auditando '{root}'...")
    findings = scan_project(root)
    print_report(findings, root)

    critica = sum(1 for f in findings if f["severity"] == "CRITICA")
    sys.exit(1 if critica > 0 else 0)


if __name__ == "__main__":
    main()
