"""Gera a versão em PDF da arte de acesso, com links reais para doação.

Requer ReportLab. Execute a partir de qualquer pasta: python scripts/create-clickable-qr.py.
O PNG continua escaneável; as anotações de link pertencem ao PDF.
"""

from pathlib import Path
from shutil import copyfile

from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
DESTINATION = "https://pao-vivo-participar.risencrab2.chatgpt.site/#participar"
OUTPUT = ASSETS / "qr-code-acesso-clicavel.pdf"

canvas = Canvas(str(OUTPUT), pagesize=(720, 500), invariant=True)
canvas.setTitle("Ministério Pão Vivo - Participe desta obra")
canvas.setAuthor("Ministério Pão Vivo")
canvas.drawImage(str(ASSETS / "qr-code-divulgacao.png"), 0, 0, 720, 500)

# A área do QR Code da arte também abre o formulário quando tocada.
canvas.linkURL(DESTINATION, (398, 146, 648, 395), relative=0, thickness=0)

canvas.setFillColor(HexColor("#a14722"))
canvas.roundRect(205, 64, 310, 37, 8, stroke=0, fill=1)
canvas.setFillColor(white)
canvas.setFont("Helvetica-Bold", 12)
canvas.drawCentredString(360, 78, "Toque aqui para participar e doar")
canvas.linkURL(DESTINATION, (205, 64, 515, 101), relative=0, thickness=0)
canvas.showPage()
canvas.save()

local_output = ROOT / "output" / "pdf"
local_output.mkdir(parents=True, exist_ok=True)
copyfile(OUTPUT, local_output / OUTPUT.name)
print("PDF clicável gerado em public/assets e output/pdf.")
