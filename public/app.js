const PIX = '00020126360014BR.GOV.BCB.PIX0114081457130001555204000053039865802BR5919MINISTERIO PAO VIVO6012PORTO ALEGRE62070503***6304F895';
const form = document.querySelector('#participation-form');
const contribution = document.querySelector('#contribuindo');
const fields = document.querySelector('#contribution-fields');
document.querySelector('#pix-code').value = PIX;
contribution.addEventListener('change', () => { fields.hidden = !contribution.checked; fields.disabled = !contribution.checked; });
const transferBankDetails = document.querySelector('#transfer-bank-details');
function updateTransferBankDetails() {
  transferBankDetails.hidden = !contribution.checked || form.elements.metodo.value !== 'Transferência';
}
form.addEventListener('change', event => {
  if (event.target.name === 'metodo' || event.target.name === 'contribuindo') updateTransferBankDetails();
});
updateTransferBankDetails();
form.elements.cep.addEventListener('input', e => { const n=e.target.value.replace(/\D/g,'').slice(0,8); e.target.value=n.length>5 ? n.slice(0,5)+'-'+n.slice(5) : n; });
form.elements.whatsapp.addEventListener('input', e => {
  const n = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) { e.target.value = n; return; }
  const local = n.slice(2);
  e.target.value = `(${n.slice(0, 2)}) ${local.length > 4 ? local.slice(0, -4) + '-' + local.slice(-4) : local}`;
});
for (const name of ['orando','contribuindo']) form.elements[name].addEventListener('change',()=>{document.querySelector('#participation-error').hidden=true;});
document.querySelector('#copy-pix').addEventListener('click', async () => {
  const status=document.querySelector('#copy-status');
  try { await navigator.clipboard.writeText(PIX); status.textContent='Código Pix copiado! Cole no aplicativo do seu banco.'; }
  catch { document.querySelector('details').open=true; document.querySelector('#pix-code').select(); status.textContent='Selecione e copie o código abaixo.'; }
});
form.addEventListener('submit', e => {
  e.preventDefault();
  if (!form.elements.orando.checked && !contribution.checked) { const error=document.querySelector('#participation-error'); error.hidden=false; form.elements.orando.focus(); return; }
  const data=new FormData(form);
  const modes=[data.has('orando')?'Orando':'', data.has('contribuindo')?'Contribuindo':''].filter(Boolean).join(' e ');
  // O WhatsApp interpreta asteriscos simples como negrito após o envio.
  const sections = [
    '🧡 *MINISTÉRIO PÃO VIVO*\n*Ficha de participação*',
    'Olá! Quero fazer parte desta obra.',
    `👤 *DADOS DO PARTICIPANTE*\n*Nome:* ${data.get('nome').trim()}\n*Endereço:* ${data.get('endereco').trim()}\n*CEP:* ${data.get('cep')}\n*E-mail:* ${data.get('email').trim()}\n*WhatsApp:* ${data.get('whatsapp')}`,
    `🤝 *MINHA PARTICIPAÇÃO*\n${modes}`,
  ];
  if (contribution.checked) {
    const amount = Number(data.get('valor')).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    sections.push(`🎁 *CONTRIBUIÇÃO*\n*Frequência:* ${data.get('frequencia')}\n*Forma:* ${data.get('metodo')}\n*Valor: ${amount}*`);
  }
  sections.push('✅ *AUTORIZAÇÃO*\nAutorizo o contato do Ministério Pão Vivo sobre minha participação.');
  const message = sections.join('\n\n');
  const url=`https://wa.me/5551993463773?text=${encodeURIComponent(message)}`;
  document.querySelector('#registration-whatsapp').href = url;
  const summary = contribution.checked
    ? `${data.get('nome').trim()}, você escolheu participar ${modes.toLowerCase()}, com ${data.get('frequencia').toLowerCase()} de ${Number(data.get('valor')).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}. Informe esse valor no aplicativo do banco.`
    : `${data.get('nome').trim()}, obrigado por se unir a esta obra em oração!`;
  document.querySelector('#participation-summary').textContent = summary;
  document.querySelector('#payment-options').hidden = !contribution.checked;
  document.querySelector('#form-view').hidden = true;
  document.querySelector('#payment-view').hidden = false;
  window.scrollTo({top: 0, behavior: 'instant'});
  document.querySelector('#payment-heading').focus({preventScroll:true});
  window.participationCard.generate({
    nome: data.get('nome').trim(), endereco: data.get('endereco').trim(),
    cep: data.get('cep'), email: data.get('email').trim(), whatsapp: data.get('whatsapp'),
    orando: data.has('orando'), contribuindo: contribution.checked,
    frequencia: data.get('frequencia'), metodo: data.get('metodo'), valor: data.get('valor'),
  });
});
document.querySelector('#edit-form').addEventListener('click', () => {
  document.querySelector('#payment-view').hidden = true;
  document.querySelector('#form-view').hidden = false;
  document.querySelector('#registration-whatsapp').removeAttribute('href');
  window.participationCard.clear();
  document.querySelector('#participar').scrollIntoView();
});
