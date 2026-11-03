"""Gera a versão em PDF da arte de acesso, com links reais para doação.

Requer ReportLab. Execute a partir de qualquer pasta: python scripts/create-clickable-qr.py.
O PNG continua escaneável; as anotações de link pertencem ao PDF.
"""

from pathlib import Path
from shutil import copyfile

from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
DESTINATION = "https://pao-vivo-participar.risencrab2.chatgpt.site/"
OUTPUT = ASSETS / "qr-code-acesso-clicavel.pdf"

canvas = Canvas(str(OUTPUT), pagesize=(720, 500), invariant=True)
canvas.setTitle("Ministério Pão Vivo - Participe desta obra")
canvas.setAuthor("Ministério Pão Vivo")
# Layout vetorial: permite atualizar as cores sem alterar a foto ou o QR Code.
ORANGE = HexColor("#f39a23")
INK = HexColor("#2d210e")
canvas.setFillColor(white)
canvas.rect(0, 0, 720, 500, stroke=0, fill=1)
canvas.drawImage(str(ASSETS / "logo-oficial.png"), 293, 430, 134, 44.6, mask="auto")

canvas.saveState()
photo_clip = canvas.beginPath()
photo_clip.roundRect(72, 136, 350, 268, 9)
canvas.clipPath(photo_clip, stroke=0)
# Recorta a faixa de texto incorporada à fotografia original.
canvas.drawImage(str(ASSETS / "favela.jpg"), -167, 86, 828, 318)
for index in range(60):
    canvas.setFillColor(black)
    canvas.setFillAlpha(0.94 * (1 - index / 60))
    canvas.rect(72, 136 + index * 3, 350, 3.1, stroke=0, fill=1)
canvas.restoreState()
canvas.setFillColor(ORANGE)
canvas.rect(94, 222, 24, 2, stroke=0, fill=1)
canvas.setFillColor(white)
canvas.setFont("Helvetica-Bold", 17)
canvas.drawString(94, 192, "Plantando igrejas.")
canvas.setFont("Times-Italic", 19)
canvas.drawString(94, 169, "Transformando vidas.")

canvas.setFillColor(white)
canvas.setStrokeColor(HexColor("#eee0c7"))
canvas.roundRect(398, 146, 250, 248, 8, stroke=1, fill=1)
canvas.setStrokeColor(ORANGE)
canvas.setLineWidth(2)
canvas.line(406, 393, 640, 393)
canvas.setFillColor(HexColor("#925000"))
canvas.setFont("Helvetica-Bold", 6)
canvas.drawCentredString(523, 382, "FAÇA PARTE DESTA OBRA")
canvas.drawImage(str(ASSETS / "qr-code-acesso-simples.png"), 430, 193, 186, 186)
canvas.setStrokeColor(HexColor("#eee0c7"))
canvas.setLineWidth(0.5)
canvas.line(414, 191, 632, 191)
canvas.setFillColor(HexColor("#786d56"))
canvas.setFont("Helvetica", 6.5)
canvas.drawCentredString(523, 176, "Sua oração e sua generosidade")
canvas.drawCentredString(523, 166, "fazem parte desta história.")
canvas.setFont("Helvetica", 6)
canvas.drawCentredString(360, 114, "Fé que alimenta. Amor que alcança.")

# A área do QR Code da arte também abre o formulário quando tocada.
canvas.linkURL(DESTINATION, (398, 146, 648, 395), relative=0, thickness=0)

canvas.setFillColor(ORANGE)
canvas.roundRect(205, 64, 310, 37, 8, stroke=0, fill=1)
canvas.setFillColor(INK)
canvas.setFont("Helvetica-Bold", 12)
canvas.drawCentredString(360, 78, "Toque aqui para participar e doar")
canvas.linkURL(DESTINATION, (205, 64, 515, 101), relative=0, thickness=0)
canvas.showPage()
canvas.save()

local_output = ROOT / "output" / "pdf"
local_output.mkdir(parents=True, exist_ok=True)
copyfile(OUTPUT, local_output / OUTPUT.name)
print("PDF clicável gerado em public/assets e output/pdf.")
