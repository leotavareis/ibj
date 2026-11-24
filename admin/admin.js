(function () {
  const telaLogin = document.getElementById("tela-login");
  const telaPainel = document.getElementById("tela-painel");
  const formLogin = document.getElementById("form-login");
  const loginErro = document.getElementById("login-erro");
  const loginBotao = document.getElementById("login-botao");
  const botaoSair = document.getElementById("botao-sair");
  const formEvento = document.getElementById("form-evento");
  const eventoErro = document.getElementById("evento-erro");
  const eventoSucesso = document.getElementById("evento-sucesso");
  const eventoBotao = document.getElementById("evento-botao");
  const listaEventos = document.getElementById("lista-eventos");

  function mostrarPainel() {
    telaLogin.hidden = true;
    telaPainel.hidden = false;
    carregarEventos();
  }

  function mostrarLogin() {
    telaPainel.hidden = true;
    telaLogin.hidden = false;
  }

  async function verificarSessao() {
    try {
      const r = await fetch("/api/sessao", { credentials: "include" });
      const j = await r.json();
      if (j.autenticado) mostrarPainel();
      else mostrarLogin();
    } catch {
      mostrarLogin();
    }
  }

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginErro.hidden = true;
    loginBotao.disabled = true;
    try {
      const email = document.getElementById("login-email").value.trim();
      const senha = document.getElementById("login-senha").value;
      const r = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        loginErro.textContent = j.erro || "Não foi possível entrar.";
        loginErro.hidden = false;
        return;
      }
      formLogin.reset();
      mostrarPainel();
    } catch {
      loginErro.textContent = "Falha de conexão. Tente novamente.";
      loginErro.hidden = false;
    } finally {
      loginBotao.disabled = false;
    }
  });

  botaoSair.addEventListener("click", async () => {
    try { await fetch("/api/logout", { method: "POST", credentials: "include" }); } catch {}
    mostrarLogin();
  });

  function formatarDataCurta(iso) {
    const [ano, mes, dia] = iso.split("-");
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const mesCurto = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return { dia, mesCurto };
  }

  function renderEventos(lista) {
    if (!lista.length) {
      listaEventos.innerHTML = '<p class="ibj-texto" style="font-size:.95rem;">Nenhum evento especial cadastrado ainda.</p>';
      return;
    }
    listaEventos.innerHTML = lista
      .map((e) => {
        const { dia, mesCurto } = formatarDataCurta(e.data);
        return `<div class="ibj-ev-item" data-id="${e.id}">
          <div class="ibj-ev-data"><b>${dia}</b><small>${mesCurto}</small></div>
          <div class="ibj-ev-info"><strong>${escaparHTML(e.titulo)}</strong><span>${escaparHTML(e.hora)}${e.local ? " · " + escaparHTML(e.local) : ""}</span></div>
          <button type="button" class="ibj-ev-apagar" title="Remover" aria-label="Remover ${escaparHTML(e.titulo)}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      })
      .join("");

    listaEventos.querySelectorAll(".ibj-ev-apagar").forEach((botao) => {
      botao.addEventListener("click", async () => {
        const item = botao.closest(".ibj-ev-item");
        const id = item.dataset.id;
        if (!confirm("Remover este evento da agenda?")) return;
        botao.disabled = true;
        try {
          await fetch("/api/eventos", {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          carregarEventos();
        } catch {
          alert("Não foi possível remover. Tente novamente.");
          botao.disabled = false;
        }
      });
    });
  }

  function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  async function carregarEventos() {
    try {
      const r = await fetch("/api/eventos", { credentials: "include" });
      const lista = await r.json();
      renderEventos(Array.isArray(lista) ? lista : []);
    } catch {
      listaEventos.innerHTML = '<p class="text-danger" style="font-size:.95rem;">Não foi possível carregar os eventos.</p>';
    }
  }

  formEvento.addEventListener("submit", async (e) => {
    e.preventDefault();
    eventoErro.hidden = true;
    eventoSucesso.hidden = true;
    eventoBotao.disabled = true;
    try {
      const corpo = {
        data: document.getElementById("ev-data").value,
        hora: document.getElementById("ev-hora").value.trim(),
        titulo: document.getElementById("ev-titulo").value.trim(),
        local: document.getElementById("ev-local").value.trim(),
      };
      const r = await fetch("/api/eventos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        eventoErro.textContent = j.erro || "Não foi possível adicionar o evento.";
        eventoErro.hidden = false;
        return;
      }
      formEvento.reset();
      eventoSucesso.textContent = "Evento adicionado com sucesso!";
      eventoSucesso.hidden = false;
      setTimeout(() => { eventoSucesso.hidden = true; }, 3000);
      carregarEventos();
    } catch {
      eventoErro.textContent = "Falha de conexão. Tente novamente.";
      eventoErro.hidden = false;
    } finally {
      eventoBotao.disabled = false;
    }
  });

  verificarSessao();
})();
