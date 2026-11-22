#!/usr/bin/env bash
# Buduje korpus asystenta AI (tekst) z materiałów uczestnika HackNation.
# Materiały ZUS nie są commitowane — wynik trafia do data/corpus/ (w .gitignore).
# Użycie: scripts/build-corpus.sh "/ścieżka/do/Materiały dla uczestników"   (macOS — PDFKit)
set -euo pipefail
SRC="${1:?Podaj katalog z materiałami}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/data/corpus"
TMP="$(mktemp -d)"
cat > "$TMP/pdf2txt.swift" <<'SW'
import PDFKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
if let d = PDFDocument(url: url) { print(d.string ?? "") }
SW
mkdir -p "$OUT"
swift "$TMP/pdf2txt.swift" "$SRC/Poradnik dla rodziców, ZUS 2026.pdf" > "$OUT/01-poradnik-zus-2026.txt"
swift "$TMP/pdf2txt.swift" "$SRC/wyciąg z ustawy o świadczeniach pieniężnych z ubezpieczeń społecznych w razie choroby i macierzyństwa (ustawa zasiłkowa).pdf" > "$OUT/02-ustawa-zasilkowa.txt"
swift "$TMP/pdf2txt.swift" "$SRC/Kodeks pracy (wyciąg z przepisów).pdf" > "$OUT/03-kodeks-pracy.txt"
textutil -convert txt -output "$OUT/04-zalacznik-wymiary-stawki.txt" "$SRC/Załącznik_ maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru.docx"
rm -rf "$TMP"
wc -c "$OUT"/*.txt
