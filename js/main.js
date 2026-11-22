// Número de WhatsApp da igreja — formato internacional sem símbolos, ex: 5584999999999
// PENDENTE: Leandro vai enviar o número oficial da igreja.
const WHATSAPP_IGREJA = "";

document.addEventListener("DOMContentLoaded", () => {
  const anoAtual = document.getElementById("anoAtual");
  if (anoAtual) anoAtual.textContent = new Date().getFullYear();

  const formOracao = document.getElementById("formOracao");
  if (formOracao) {
    formOracao.addEventListener("submit", (e) => {
      e.preventDefault();

      const nome = document.getElementById("nomeOracao").value.trim();
      const pedido = document.getElementById("pedidoOracao").value.trim();

      const mensagem = `Olá! Meu nome é ${nome} e gostaria de enviar um pedido de oração:\n\n${pedido}`;
      const mensagemCodificada = encodeURIComponent(mensagem);

      if (!WHATSAPP_IGREJA) {
        alert("O número de WhatsApp da igreja ainda não foi configurado. Fale com a administração do site.");
        return;
      }

      window.open(`https://wa.me/${WHATSAPP_IGREJA}?text=${mensagemCodificada}`, "_blank");
      formOracao.reset();
    });
  }
});
