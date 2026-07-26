#!/usr/bin/env python3
r"""
validar_personalidade.py — NostalgiaGPT
Valida estrutura e metadados das personalidades reais de js/personalities.js.

O modelo de dados e `{ name, cat, years, tagline, img, starters? }`.
`slug` e `initials` NAO existem no fonte — sao derivados em runtime por
`slugify()`/`initials()` dentro do proprio personalities.js.

Uso:
  # Todas as personalidades (caminho detectado a partir da raiz do repo):
  python validar_personalidade.py --all

  # Uma personalidade, por nome ou por slug derivado:
  python validar_personalidade.py --name "Galileu Galilei"
  python validar_personalidade.py --slug galileu-galilei

  # Apontando o arquivo explicitamente:
  python validar_personalidade.py js/personalities.js --all

Requer `node` no PATH: o script carrega o arquivo de verdade (mesma tecnica do
gate, `vm.runInContext`) em vez de adivinhar o conteudo por regex. Assim as
categorias validas saem do proprio arquivo e nunca desatualizam.

Saida: OK por personalidade, avisos (nao falham) e erros (falham). Codigo de
saida 0 = tudo certo; 1 = ha erros.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

# scripts/ -> nostalgia-content/ -> skills/ -> .claude/ -> raiz do repo
RAIZ_PADRAO = Path(__file__).resolve().parents[4]

# Rotulos aceitos em `years` para quem nao tem datas (figuras lendarias)
YEARS_SEM_DATA = {"Lenda", "Mito"}

# `years` com datas: comeca com digito ou prefixo textual curto seguido de digito
YEARS_COM_DATA = re.compile(r"^[^\d]{0,4}\d")

TAGLINE_MAX = 40   # cabe no card da galeria sem truncar (ver issue #41)
STARTERS_MIN = 3
STARTERS_MAX = 5

JS_DUMP = (
    "const vm=require('vm'),fs=require('fs');"
    "const s={window:{}};vm.createContext(s);"
    "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),s,"
    "{filename:'personalities.js'});"
    "const D=s.window.NostalgiaData;"
    "if(!D||!Array.isArray(D.people)||!D.categories)"
    "{throw new Error('window.NostalgiaData nao exposto corretamente');}"
    "process.stdout.write(JSON.stringify({categories:D.categories,people:D.people}));"
)


def carregar_modelo(arquivo: Path) -> dict:
    """Carrega NostalgiaData de verdade via node; devolve dict com categories/people."""
    if shutil.which("node") is None:
        raise RuntimeError(
            "node nao encontrado no PATH. O validador carrega personalities.js de "
            "verdade (como scripts/gate.mjs) - instale o Node para rodar."
        )
    try:
        saida = subprocess.run(
            ["node", "-e", JS_DUMP, str(arquivo)],
            capture_output=True, text=True, encoding="utf-8", check=True,
        ).stdout
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"falha ao carregar {arquivo}:\n{(e.stderr or '').strip()}") from e
    return json.loads(saida)


def validar_um(p: dict, categorias: list, raiz: Path) -> tuple:
    """Retorna (erros, avisos) de uma personalidade. Listas vazias = OK."""
    erros = []
    avisos = []
    ident = p.get("name") or "(sem nome)"

    # 1. Campos obrigatorios (strings nao vazias)
    for campo in ("name", "cat", "years", "tagline"):
        valor = p.get(campo)
        if not isinstance(valor, str) or not valor.strip():
            erros.append(f"campo '{campo}' ausente ou vazio")

    # 2. Categoria existe em CATEGORIES (lida do proprio arquivo)
    cat = p.get("cat")
    if isinstance(cat, str) and cat not in categorias:
        erros.append(f"categoria desconhecida '{cat}'. Validas: {', '.join(categorias)}")

    # 3. years: datas com en-dash, ou rotulo textual conhecido
    years = (p.get("years") or "").strip()
    if years and years not in YEARS_SEM_DATA:
        if not YEARS_COM_DATA.match(years):
            erros.append(
                "'years' sem datas e fora dos rotulos aceitos "
                f"({', '.join(sorted(YEARS_SEM_DATA))}): '{years}'"
            )
        elif "-" in years:
            avisos.append(f"'years' usa hifen '-'; o arquivo padroniza en-dash: '{years}'")

    # 4. tagline curta o bastante para o card
    tagline = p.get("tagline") or ""
    if len(tagline) > TAGLINE_MAX:
        avisos.append(f"'tagline' com {len(tagline)} chars (>{TAGLINE_MAX}) - risco de truncar no card")

    # 5. img: null/ausente (monograma) ou arquivo existente na raiz
    img = p.get("img")
    if img is not None:
        if not isinstance(img, str) or not img.strip():
            erros.append("'img' deve ser null ou um caminho relativo valido")
        elif not (raiz / img).exists():
            erros.append(f"'img' aponta para arquivo inexistente: '{img}'")

    # 6. starters: opcionais; se houver, 3 a 5 perguntas nao vazias
    starters = p.get("starters")
    if starters is None:
        avisos.append("sem 'starters' proprios - cai no fallback generico de mainJs.js (ver issue #24)")
    elif not isinstance(starters, list):
        erros.append("'starters' deve ser um array de strings")
    else:
        if not STARTERS_MIN <= len(starters) <= STARTERS_MAX:
            erros.append(
                f"'starters' tem {len(starters)} item(s); esperado entre "
                f"{STARTERS_MIN} e {STARTERS_MAX}"
            )
        for i, s in enumerate(starters):
            if not isinstance(s, str) or not s.strip():
                erros.append(f"starters[{i}] vazio ou nao e string")

    return ([f"[{ident}] {e}" for e in erros], [f"[{ident}] {a}" for a in avisos])


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Valida personalidades do NostalgiaGPT em js/personalities.js"
    )
    parser.add_argument(
        "arquivo", nargs="?", default=str(RAIZ_PADRAO / "js" / "personalities.js"),
        help="Caminho para js/personalities.js (padrao: o do proprio repo)",
    )
    grupo = parser.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--name", help="Validar uma personalidade pelo campo 'name'")
    grupo.add_argument("--slug", help="Validar uma personalidade pelo slug derivado")
    grupo.add_argument("--all", action="store_true", help="Validar todas as personalidades")
    args = parser.parse_args()

    arquivo = Path(args.arquivo).resolve()
    if not arquivo.exists():
        print(f"ERRO: arquivo nao encontrado: {arquivo}", file=sys.stderr)
        sys.exit(1)
    raiz = arquivo.parent.parent  # js/ -> raiz do projeto

    try:
        modelo = carregar_modelo(arquivo)
    except (RuntimeError, json.JSONDecodeError) as e:
        print(f"ERRO ao carregar o modelo: {e}", file=sys.stderr)
        sys.exit(1)

    pessoas = modelo["people"]
    categorias = list(modelo["categories"].keys())
    print(f"Arquivo carregado: {len(pessoas)} personalidade(s), "
          f"{len(categorias)} categoria(s) ({', '.join(categorias)}).\n")

    # Unicidade vale para o arquivo inteiro, independente do alvo
    erros_globais = []
    for campo in ("name", "slug"):
        vistos = set()
        for p in pessoas:
            valor = p.get(campo)
            if valor in vistos:
                erros_globais.append(f"{campo} duplicado: '{valor}'")
            vistos.add(valor)

    if args.all:
        alvos = pessoas
    elif args.name:
        alvos = [p for p in pessoas if p.get("name") == args.name]
        if not alvos:
            print(f"ERRO: nome '{args.name}' nao encontrado em {arquivo.name}.", file=sys.stderr)
            sys.exit(1)
    else:
        alvos = [p for p in pessoas if p.get("slug") == args.slug]
        if not alvos:
            print(f"ERRO: slug '{args.slug}' nao encontrado em {arquivo.name}.", file=sys.stderr)
            sys.exit(1)

    total_erros = len(erros_globais)
    total_avisos = 0
    for e in erros_globais:
        print(f"ERRO  {e}")

    for p in alvos:
        erros, avisos = validar_um(p, categorias, raiz)
        ident = p.get("name") or "(sem nome)"
        if erros:
            print(f"FALHOU [{ident}]:")
            for e in erros:
                print(f"  - {e}")
        else:
            print(f"OK    [{ident}]")
        for a in avisos:
            print(f"  ! {a}")
        total_erros += len(erros)
        total_avisos += len(avisos)

    print("\n" + "=" * 50)
    if total_erros == 0:
        print(f"Tudo OK - {len(alvos)} personalidade(s) validada(s), {total_avisos} aviso(s).")
        sys.exit(0)
    print(f"Total de erros: {total_erros} ({total_avisos} aviso(s)) em {len(alvos)} personalidade(s).")
    sys.exit(1)


if __name__ == "__main__":
    main()
