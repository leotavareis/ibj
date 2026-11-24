const crypto = require("crypto");
const { put, get } = require("@vercel/blob");
const { sessaoValida, lerCorpoJSON } = require("./_lib/auth");

// Guarda a lista de eventos especiais (fora da escala fixa de domingo/quarta)
// num único arquivo JSON no Vercel Blob. Qualquer visitante pode LER (GET);
// só quem está logado na área restrita pode escrever (POST/DELETE).
//
// O store foi criado como "private" (padrão atual da Vercel), então toda
// leitura/escrita usa access:"private" — get()/put() cuidam da autenticação,
// a leitura nunca é exposta como URL pública direta ao navegador.
const BLOB_PATH = "ibj-eventos-especiais.json";

async function lerEventos() {
  try {
    const resultado = await get(BLOB_PATH, { access: "private" });
    if (!resultado) return []; // ainda não existe nenhum evento salvo
    const texto = await new Response(resultado.stream).text();
    const lista = JSON.parse(texto);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

async function salvarEventos(lista) {
  await put(BLOB_PATH, JSON.stringify(lista, null, 2), {
    access: "private",
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
