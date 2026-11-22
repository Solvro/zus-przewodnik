# Scala PDF-y slajdów: python merge_pdf.py out.pdf a.pdf b.pdf ...
import sys, fitz
out = fitz.open()
for f in sys.argv[2:]:
    out.insert_pdf(fitz.open(f))
out.save(sys.argv[1], garbage=3, deflate=True)
print("saved", sys.argv[1], len(out), "pages")
