"""Gera o QR Code de acesso; a arte de divulgação usa o PDF vertical."""
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://ministerio-pao-vivo-doacoes.vercel.app/'
INK = '#523F1B'
QUIET_ZONE = 4
MODULE_SCALE = 18

qr = QRCode(version=5, errorCorrectLevel=QRErrorCorrectLevel.M)
qr.addData(URL)
qr.make()
modules = qr.getModuleCount()
size = (modules + QUIET_ZONE * 2) * MODULE_SCALE
code = Image.new('RGB', (size, size), 'white')
draw = ImageDraw.Draw(code)
for row in range(modules):
    for column in range(modules):
        if qr.isDark(row, column):
            x = (column + QUIET_ZONE) * MODULE_SCALE
            y = (row + QUIET_ZONE) * MODULE_SCALE
            draw.rectangle((x, y, x + MODULE_SCALE - 1, y + MODULE_SCALE - 1), fill=INK)

code.save(ROOT / 'public/assets/qr-code-acesso-simples.png', optimize=True)
output = ROOT / 'output'
output.mkdir(exist_ok=True)
code.save(output / 'qr-code-formulario.png', optimize=True)
print('QR Code de acesso atualizado para a Vercel.')
