#!/usr/bin/env python3
r"""
validar_personalidade.py — NostalgiaGPT
Valida estrutura e metadados de personalidades em js/personalities.js.

Uso:
  # Validar uma personalidade específica pelo id:
  python validar_personalidade.py E:\Projetos\Sites\NostalgiaGPT\js\personalities.js --id galileo-galilei

  # Validar todas as personalidades do arquivo:
  python validar_personalidade.py E:\Projetos\Sites\NostalgiaGPT\js\personalities.js --all

O script extrai o array JS via regex (sem transpiler), valida cada objeto e
reporta erros por campo. Saída: OK ou lista de erros com indicação de campo.
"""

import sys
import re
import json
import os
import argparse
from pathlib import Path

CATEGORIAS_VALIDAS = {
    "scientists",
    "philosophers",
    "artists",
    "leaders",
    "writers",
    "explorers",
}

CAMPOS_OBRIGATORIOS = ["id", "name", "category", "era", "years",
                       "nationality", "description", "starters", "systemPrompt"]

YEARS_RE = re.compile(r"^(c\.\s*)?\d{1,4}(–|-)\d{1,4}$")


def extrair_array_js(caminho: Path) -> list[dict]:
    """
    Extrai o array de personalidades do arquivo JS usando regex + json.loads.
    O arquivo usa sintaxe JS (chaves sem aspas, trailing commas) — normalizamos
    antes de parsear como JSON.
    """
    texto = caminho.read_text(encoding="utf-8")

    # Localiza o array principal (primeiro colchete de abertura até o fechamento correspondente)
    inicio = texto.find("[")
    if inicio == -1:
        raise ValueError("Nenhum array encontrado em " + str(caminho))

    # Extrai o bloco do array balanceando colchetes
    profundidade = 0
    fim = -1
    for i, ch in enumerate(texto[inicio:], start=inicio):
        if ch == "[":
            profundidade += 1
        elif ch == "]":
            profundidade -= 1
            if profundidade == 0:
                fim = i + 1
                break

    if fim == -1:
        raise ValueError("Array não fechado em " + str(caminho))

    bloco = texto[inicio:fim]

    # Normalizar JS → JSON
    # 1. Remover trailing commas antes de } ou ]
    bloco = re.sub(r",\s*([}\]])", r"\1", bloco)
    # 2. Adicionar aspas em chaves sem aspas (ex.: id: → "id":)
    bloco = re.sub(r"([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):", r'\1"\2"\3:', bloco)
    # 3. Converter template literals simples (sem ${}) para strings com aspas duplas
    bloco = re.sub(r"`([^`]*?)`", lambda m: json.dumps(m.group(1)), bloco)
    # 4. Converter strings com aspas simples para aspas duplas (cuidado com apostrofos)
    bloco = re.sub(r"'([^']*)'", r'"\1"', bloco)
    # 5. Remover comentários de linha
    bloco = re.sub(r"//[^\n]*", "", bloco)

    try:
        return json.loads(bloco)
    except json.JSONDecodeError as e:
        raise ValueError(f"Falha ao parsear personalities.js como JSON: {e}\n"
                         f"Dica: verifique template literals com ${{}} — esses exigem ajuste manual.")


def validar_um(p: dict, diretorio_projeto: Path) -> list[str]:
    """Retorna lista de erros para uma personalidade. Lista vazia = OK."""
    erros = []
    pid = p.get("id", "<sem id>")

    # 1. Campos obrigatórios presentes e não-vazios
    for campo in CAMPOS_OBRIGATORIOS:
        val = p.get(campo)
        if val is None:
            erros.append(f"[{pid}] Campo obrigatório ausente: '{campo}'")
        elif isinstance(val, str) and not val.strip():
            erros.append(f"[{pid}] Campo '{campo}' está vazio")
        elif isinstance(val, list) and len(val) == 0:
            erros.append(f"[{pid}] Campo '{campo}' é lista vazia")

    # 2. category válida
    categoria = p.get("category", "")
    if categoria and categoria not in CATEGORIAS_VALIDAS:
        erros.append(f"[{pid}] Categoria inválida: '{categoria}'. "
                     f"Válidas: {sorted(CATEGORIAS_VALIDAS)}")

    # 3. years no formato esperado
    years = p.get("years", "")
    if years and not YEARS_RE.match(years.strip()):
        erros.append(f"[{pid}] 'years' fora do formato esperado: '{years}'. "
                     f"Esperado: 'AAAA–AAAA' ou 'c. AAAA–AAAA'")

    # 4. starters: entre 3 e 5 itens
    starters = p.get("starters", [])
    if isinstance(starters, list):
        if len(starters) < 3:
            erros.append(f"[{pid}] 'starters' tem {len(starters)} item(s); mínimo 3")
        elif len(starters) > 5:
            erros.append(f"[{pid}] 'starters' tem {len(starters)} itens; máximo 5")
        for i, s in enumerate(starters):
            if not isinstance(s, str) or not s.strip():
                erros.append(f"[{pid}] starters[{i}] está vazio ou não é string")

    # 5. systemPrompt: mínimo 200 chars e contém pronome de primeira pessoa
    sp = p.get("systemPrompt", "")
    if isinstance(sp, str):
        if len(sp) < 200:
            erros.append(f"[{pid}] 'systemPrompt' muito curto ({len(sp)} chars); mínimo 200")
        sp_lower = sp.lower()
        if "eu " not in sp_lower and "minha " not in sp_lower and "meu " not in sp_lower and \
                "primeira pessoa" not in sp_lower and "you are" not in sp_lower and \
                "você é" not in sp_lower:
            erros.append(f"[{pid}] 'systemPrompt' não contém indicadores de primeira pessoa "
                         f"('eu', 'minha', 'meu', 'você é'). Verifique o tom.")

    # 6. photo: null ou arquivo existente
    photo = p.get("photo")
    if photo is not None:
        caminho_foto = diretorio_projeto / photo
        if not caminho_foto.exists():
            erros.append(f"[{pid}] 'photo' aponta para arquivo inexistente: '{photo}' "
                         f"(caminho verificado: {caminho_foto})")

    # 7. id sem acentos e sem espaços
    pid_real = p.get("id", "")
    if pid_real and (not re.match(r"^[a-z0-9-]+$", pid_real)):
        erros.append(f"[{pid}] 'id' deve ser kebab-case sem acentos: '{pid_real}'")

    return erros


def main():
    parser = argparse.ArgumentParser(
        description="Valida personalidades do NostalgiaGPT em js/personalities.js"
    )
    parser.add_argument("arquivo", help="Caminho para js/personalities.js")
    grupo = parser.add_mutually_exclusive_group(required=True)
    grupo.add_argument("--id", help="Validar personalidade específica pelo id")
    grupo.add_argument("--all", action="store_true", help="Validar todas as personalidades")
    args = parser.parse_args()

    caminho = Path(args.arquivo)
    if not caminho.exists():
        print(f"ERRO: arquivo não encontrado: {caminho}", file=sys.stderr)
        sys.exit(1)

    diretorio_projeto = caminho.parent.parent  # js/ → raiz do projeto

    try:
        personalidades = extrair_array_js(caminho)
    except ValueError as e:
        print(f"ERRO ao extrair array: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Arquivo carregado: {len(personalidades)} personalidade(s) encontrada(s).\n")

    # Checar ids duplicados (sempre, independente do modo)
    ids = [p.get("id") for p in personalidades]
    vistos = set()
    duplicados = []
    for pid in ids:
        if pid in vistos:
            duplicados.append(pid)
        vistos.add(pid)
    if duplicados:
        print(f"ERRO CRÍTICO: ids duplicados encontrados: {duplicados}")
        print("Corrija antes de prosseguir.\n")

    # Selecionar alvo(s)
    if args.all:
        alvos = personalidades
    else:
        alvos = [p for p in personalidades if p.get("id") == args.id]
        if not alvos:
            ids_disponiveis = [p.get("id") for p in personalidades]
            print(f"ERRO: id '{args.id}' não encontrado em personalities.js.")
            print(f"IDs disponíveis: {ids_disponiveis}")
            sys.exit(1)

    total_erros = 0
    for p in alvos:
        erros = validar_um(p, diretorio_projeto)
        pid = p.get("id", "<sem id>")
        if erros:
            print(f"FALHOU [{pid}]:")
            for e in erros:
                print(f"  - {e}")
            total_erros += len(erros)
        else:
            print(f"OK    [{pid}]")

    print(f"\n{'='*50}")
    if total_erros == 0 and not duplicados:
        print(f"Tudo OK — {len(alvos)} personalidade(s) validada(s) sem erros.")
        sys.exit(0)
    else:
        print(f"Total de erros: {total_erros} em {len(alvos)} personalidade(s).")
        if duplicados:
            print(f"IDs duplicados: {duplicados}")
        sys.exit(1)


if __name__ == "__main__":
    main()