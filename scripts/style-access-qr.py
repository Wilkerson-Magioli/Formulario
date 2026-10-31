"""Gera a arte do QR Code de acesso sem alterar o endereço público."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from reportlab.graphics.barcode.qrencoder import QRCode, QRErrorCorrectLevel

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://pao-vivo-participar.risencrab2.chatgpt.site/'
CREAM, GOLD, INK = '#FFF6E5', '#F9BF51', '#523F1B'
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

canvas = Image.new('RGB', (1080, 1330), GOLD)
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((22, 22, 1057, 1307), radius=40, fill=CREAM)
logo = Image.open(ROOT / 'public/assets/logo.png').convert('RGBA')
logo = logo.resize((380, round(380 * logo.height / logo.width)), Image.Resampling.LANCZOS)
canvas.paste(logo, ((1080 - logo.width) // 2, 76), logo)

font_dir = Path('C:/Windows/Fonts')
def font(size, bold=False):
    return ImageFont.truetype(str(font_dir / ('arialbd.ttf' if bold else 'arial.ttf')), size)

def center(text, top, size, color=INK, bold=False):
    draw.text((540, top), text, font=font(size, bold), fill=color, anchor='mt')

center('FAÇA PARTE DESTA OBRA DE AMOR', 230, 22)
draw.rounded_rectangle((112, 282, 967, 1137), radius=24, fill='white', outline='#E4D3AF', width=2)
canvas.paste(code, (135, 305))
center('Aponte a câmera e abra o formulário', 1160, 29, bold=True)
center('Participe orando, contribuindo ou das duas formas.', 1211, 23)
center('pao-vivo-participar.risencrab2.chatgpt.site', 1256, 22)

assets = ROOT / 'public/assets'
canvas.save(assets / 'qr-code-acesso.png', optimize=True)
output = ROOT / 'output'
output.mkdir(exist_ok=True)
canvas.save(output / 'qr-code-acesso-pao-vivo.png', optimize=True)
canvas.save(output / 'ministerio-pao-vivo-doacoes.png', optimize=True)
print('QR Code estilizado gerado em 1080 × 1330 px.')
