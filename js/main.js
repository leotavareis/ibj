// Menu mobile
const btn = document.querySelector('.menu-btn');
const menu = document.getElementById('menu');
btn.addEventListener('click', () => {
  const aberto = menu.classList.toggle('aberto');
  btn.setAttribute('aria-expanded', aberto);
});
menu.addEventListener('click', e => {
  if (e.target.tagName === 'A') {
    menu.classList.remove('aberto');
    btn.setAttribute('aria-expanded', 'false');
  }
});

// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();

// Pedido de oração -> WhatsApp da igreja.
// Preencha o número no formato internacional, só dígitos (ex.: 5584999999999).
const WHATSAPP_IGREJA = '';

document.getElementById('form-oracao').addEventListener('submit', e => {
  e.preventDefault();
  if (!WHATSAPP_IGREJA) {
    alert('O envio por WhatsApp ainda não foi configurado. Fale conosco pelo Instagram @igrejabatistajardins.');
    return;
  }
  const d = new FormData(e.target);
  const texto = `Pedido de oração\nNome: ${d.get('nome')}\n${d.get('pedido')}`;
  window.open(`https://wa.me/${WHATSAPP_IGREJA}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});
