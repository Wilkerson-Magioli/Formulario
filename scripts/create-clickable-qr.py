"""Gera o PDF vertical de acesso, otimizado para leitura no celular.

Requer ReportLab. Execute: python scripts/create-clickable-qr.py.
Os links do QR Code e do botão abrem o início da página inicial.
"""
from pathlib import Path
from shutil import copyfile

from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen.canvas import Canvas

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
OUTPUT = ASSETS / "qr-code-acesso-clicavel.pdf"
DESTINATION = "https://pao-vivo-participar.risencrab2.chatgpt.site/"
PAGE_WIDTH, PAGE_HEIGHT = 390, 780
ORANGE = HexColor("#f39a23")
INK = HexColor("#2d210e")

canvas = Canvas(str(OUTPUT), pagesize=(PAGE_WIDTH, PAGE_HEIGHT), invariant=True)
canvas.setTitle("Ministério Pão Vivo - Participe desta obra")
canvas.setAuthor("Ministério Pão Vivo")
canvas.setFillColor(white)
canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
canvas.drawImage(str(ASSETS / "logo-oficial.png"), 95, 690, 200, 66.5, mask="auto")

# Fotografia em largura total, com recorte da legenda incorporada ao original.
canvas.saveState()
photo_clip = canvas.beginPath()
photo_clip.roundRect(16, 474, 358, 194, 12)
canvas.clipPath(photo_clip, stroke=0)
canvas.drawImage(str(ASSETS / "favela.jpg"), -109, 435, 608, 233.5)
for index in range(48):
    canvas.setFillColor(black)
    canvas.setFillAlpha(0.92 * (1 - index / 48))
    canvas.rect(16, 474 + index * 3, 358, 3.1, fill=1, stroke=0)
canvas.restoreState()
canvas.setFillColor(ORANGE)
canvas.rect(34, 551, 31, 3, fill=1, stroke=0)
canvas.setFillColor(white)
canvas.setFont("Helvetica-Bold", 22)
canvas.drawString(34, 518, "Plantando igrejas.")
canvas.setFont("Times-Italic", 25)
canvas.drawString(34, 489, "Transformando vidas.")

# Mantém o QR original e sua margem branca para leitura por câmera.
canvas.setFillColor(white)
canvas.setStrokeColor(HexColor("#f0d1a0"))
canvas.setLineWidth(1)
canvas.roundRect(16, 130, 358, 324, 12, fill=1, stroke=1)
canvas.setStrokeColor(ORANGE)
canvas.setLineWidth(3)
canvas.line(28, 453, 362, 453)
canvas.setFillColor(HexColor("#925000"))
canvas.setFont("Helvetica-Bold", 12)
canvas.drawCentredString(195, 433, "FAÇA PARTE DESTA OBRA")
canvas.drawImage(str(ASSETS / "qr-code-acesso-simples.png"), 75, 180, 240, 240)
canvas.linkURL(DESTINATION, (75, 180, 315, 420), relative=0, thickness=0)
canvas.setFillColor(HexColor("#675638"))
canvas.setFont("Helvetica", 12)
canvas.drawCentredString(195, 160, "Sua oração e sua generosidade")
canvas.drawCentredString(195, 143, "fazem parte desta história.")

canvas.setFillColor(ORANGE)
canvas.roundRect(16, 64, 358, 50, 10, fill=1, stroke=0)
canvas.setFillColor(INK)
canvas.setFont("Helvetica-Bold", 16)
canvas.drawCentredString(195, 83, "Toque aqui para participar e doar")
canvas.linkURL(DESTINATION, (16, 64, 374, 114), relative=0, thickness=0)
canvas.setFillColor(HexColor("#786d56"))
canvas.setFont("Helvetica", 11)
canvas.drawCentredString(195, 34, "Fé que alimenta. Amor que alcança.")
canvas.showPage()
canvas.save()

local_output = ROOT / "output" / "pdf"
local_output.mkdir(parents=True, exist_ok=True)
copyfile(OUTPUT, local_output / OUTPUT.name)
print("PDF vertical clicável gerado em public/assets e output/pdf.")
