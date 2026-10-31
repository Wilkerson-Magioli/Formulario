"""Gera a arte do QR Code de acesso sem alterar o endereço público."""
from pathlib import Path
from PIL import Image, ImageDraw
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://pao-vivo-participar.risencrab2.chatgpt.site/'
INK = '#523F1B'
qr = QRCode(version=5, errorCorrectLevel=QRErrorCorrectLevel.M)
qr.addData(URL)
qr.make()
size, quiet, scale = qr.getModuleCount(), 4, 18
code = Image.new('RGB', ((size + quiet * 2) * scale,) * 2, 'white')
draw = ImageDraw.Draw(code)
for row in range(size):
    for col in range(size):
        if qr.isDark(row, col):
            x, y = (col + quiet) * scale, (row + quiet) * scale
            draw.rectangle((x, y, x + scale - 1, y + scale - 1), fill=INK)

# A página usa o código simples para evitar repetir o logotipo.
assets = ROOT / 'public/assets'
code.save(assets / 'qr-code-acesso-simples.png', optimize=True)

ORANGE = '#D36A38'
canvas = Image.new('RGB', (1080, 1480), 'white')
draw = ImageDraw.Draw(canvas)
draw.rectangle((0, 0, 1079, 9), fill=ORANGE)
logo = Image.open(assets / 'logo-oficial.png').convert('RGBA')
logo = logo.resize((380, round(380 * logo.height / logo.width)), Image.Resampling.LANCZOS)
canvas.paste(logo, ((1080 - logo.width) // 2, 60), logo)
photo = Image.open(assets / 'favela.jpg').convert('RGB')
photo = photo.resize((1080, round(1080 * photo.height / photo.width)), Image.Resampling.LANCZOS)
canvas.paste(photo, (0, 230))
draw.rounded_rectangle((112, 684, 967, 1439), radius=22, fill='white', outline='#EAE2DD', width=2)
draw.rectangle((144, 684, 935, 689), fill=ORANGE)
code_poster = code.resize((720, 720), Image.Resampling.NEAREST)
canvas.paste(code_poster, (180, 703))
canvas.save(assets / 'qr-code-acesso.png', optimize=True)
output = ROOT / 'output'
output.mkdir(exist_ok=True)
canvas.save(output / 'qr-code-acesso-pao-vivo.png', optimize=True)
canvas.save(output / 'ministerio-pao-vivo-doacoes.png', optimize=True)
print('Arte atualizada com fundo branco, laranja e fotografia oficial.')
