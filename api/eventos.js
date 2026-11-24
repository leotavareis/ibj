const crypto = require("crypto");
const { put, list } = require("@vercel/blob");
const { sessaoValida, lerCorpoJSON } = require("./_lib/auth");

// Guarda a lista de eventos especiais (fora da escala fixa de domingo/quarta)
// num único arquivo JSON no Vercel Blob. Qualquer visitante pode LER (GET);
// só quem está logado na área restrita pode escrever (POST/DELETE).
//
// Observação: head() do SDK exige a URL completa do blob (com o id único),
// não o nome do arquivo — por isso usamos list({ prefix }) para encontrar o
// blob atual pelo nome fixo (addRandomSuffix: false garante que o nome nunca muda).
const BLOB_PATH = "ibj-eventos-especiais.json";

async function lerEventos() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const atual = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!atual) return [];
    const resp = await fetch(atual.url, { cache: "no-store" });
    if (!resp.ok) return [];
    const lista = await resp.json();
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function salvarEventos(lista) {
  await put(BLOB_PATH, JSON.stringify(lista, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
}

function validarEvento(body) {
  const { data, hora, titulo, local } = body || {};
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return "Informe uma data válida (AAAA-MM-DD).";
  if (typeof hora !== "string" || !hora.trim()) return "Informe o horário.";
  if (typeof titulo !== "string" || !titulo.trim()) return "Informe o título do evento.";
  if (local != null && typeof local !== "string") return "Local inválido.";
  return null;
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const lista = await lerEventos();
    res.setHeader("Cache-Control", "public, max-age=30");
    res.status(200).json(lista);
    return;
  }

  // POST e DELETE exigem login
  if (!sessaoValida(req)) {
    res.status(401).json({ erro: "Não autenticado. Faça login na área restrita." });
    return;
  }

  if (req.method === "POST") {
    const body = await lerCorpoJSON(req);
    const erro = validarEvento(body);
    if (erro) {
      res.status(400).json({ erro });
      return;
    }
    const lista = await lerEventos();
    const novo = {
      id: crypto.randomUUID(),
      data: body.data,
      hora: body.hora.trim(),
      titulo: body.titulo.trim(),
      local: (body.local || "").trim(),
    };
    lista.push(novo);
    lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    await salvarEventos(lista);
    res.status(200).json(novo);
    return;
  }

  if (req.method === "DELETE") {
    const { id } = await lerCorpoJSON(req);
    if (!id) {
      res.status(400).json({ erro: "Informe o id do evento a remover." });
      return;
    }
    const lista = await lerEventos();
    const nova = lista.filter((e) => e.id !== id);
    await salvarEventos(nova);
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).json({ erro: "Método não permitido." });
};
