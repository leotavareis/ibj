// Script de teste manual (não faz parte do site). Simula o Vercel Blob em memória
// para validar a lógica de api/eventos.js e api/login.js sem precisar de um deploy real.
// Usa credenciais fictícias só para o teste — não são a senha real do admin.
// Rodar com: node scripts/teste-api-eventos.js

process.env.SESSION_SECRET = "segredo-de-teste";
process.env.ADMIN_EMAIL = "admin@exemplo.com";
process.env.ADMIN_PASSWORD = "senha-ficticia-123";

// --- mock do @vercel/blob em memória ---
const armazenamento = new Map();
const Module = require("module");
const originalResolve = Module._resolveFilename;
const mockPath = require.resolve("@vercel/blob");
Module._resolveFilename = function (request, ...args) {
  if (request === "@vercel/blob") return mockPath;
  return originalResolve.call(this, request, ...args);
};
require.cache[mockPath] = {
  id: mockPath,
  filename: mockPath,
  loaded: true,
  exports: {
    put: async (pathname, body) => {
      armazenamento.set(pathname, body);
      return { url: `mock://blob/${pathname}`, pathname };
    },
    list: async ({ prefix }) => {
      const blobs = [...armazenamento.keys()]
        .filter((p) => p.startsWith(prefix))
        .map((p) => ({ url: `mock://blob/${p}`, pathname: p }));
      return { blobs };
    },
  },
};

// fetch(url) precisa entender nossas URLs mock://
const fetchOriginal = global.fetch;
global.fetch = async (url, opts) => {
  if (typeof url === "string" && url.startsWith("mock://blob/")) {
    const pathname = url.replace("mock://blob/", "");
    const body = armazenamento.get(pathname);
    return { ok: body !== undefined, json: async () => JSON.parse(body) };
  }
  return fetchOriginal(url, opts);
};

const eventosHandler = require("../api/eventos");
const loginHandler = require("../api/login");
const { criarTokenSessao, cookieLogin } = require("../api/_lib/auth");

function reqFalso({ method, body, cookie }) {
  return { method, headers: cookie ? { cookie } : {}, body };
}
function resFalso() {
  const r = { statusCode: 200, headers: {}, corpo: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (j) => { r.corpo = j; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}

async function run() {
  let falhas = 0;
  function afirmar(desc, condicao) {
    console.log((condicao ? "OK  " : "FALHOU ") + desc);
    if (!condicao) falhas++;
  }

  // 1) GET sem nenhum evento ainda -> lista vazia
  let res = resFalso();
  await eventosHandler(reqFalso({ method: "GET" }), res);
  afirmar("GET inicial retorna 200 e lista vazia", res.statusCode === 200 && Array.isArray(res.corpo) && res.corpo.length === 0);

  // 2) POST sem login -> 401
  res = resFalso();
  await eventosHandler(reqFalso({ method: "POST", body: { data: "2026-12-24", hora: "19h", titulo: "Culto de Natal" } }), res);
  afirmar("POST sem sessão retorna 401", res.statusCode === 401);

  // 3) login com senha errada -> 401
  res = resFalso();
  await loginHandler(reqFalso({ method: "POST", body: { email: "admin@exemplo.com", senha: "errada" } }), res);
  afirmar("login com senha errada retorna 401", res.statusCode === 401);

  // 4) login correto -> 200 + cookie
  res = resFalso();
  await loginHandler(reqFalso({ method: "POST", body: { email: "admin@exemplo.com", senha: "senha-ficticia-123" } }), res);
  afirmar("login correto retorna 200", res.statusCode === 200);
  const cookie = res.headers["Set-Cookie"].split(";")[0];
  afirmar("login define cookie ibj_admin", cookie.startsWith("ibj_admin="));

  // 5) POST autenticado com dados inválidos -> 400
  res = resFalso();
  await eventosHandler(reqFalso({ method: "POST", cookie, body: { hora: "19h" } }), res);
  afirmar("POST autenticado sem data/título retorna 400", res.statusCode === 400);

  // 6) POST autenticado válido -> 200 + evento criado
  res = resFalso();
  await eventosHandler(reqFalso({ method: "POST", cookie, body: { data: "2026-12-24", hora: "19h", titulo: "Culto de Natal", local: "Templo principal" } }), res);
  afirmar("POST autenticado válido retorna 200", res.statusCode === 200);
  const idCriado = res.corpo && res.corpo.id;
  afirmar("evento criado tem id", !!idCriado);

  // 7) GET depois do POST -> lista com 1 item
  res = resFalso();
  await eventosHandler(reqFalso({ method: "GET" }), res);
  afirmar("GET depois do POST retorna 1 evento", res.corpo.length === 1 && res.corpo[0].titulo === "Culto de Natal");

  // 8) segundo evento, pra garantir que o GET soma (não sobrescreve) e fica ordenado
  res = resFalso();
  await eventosHandler(reqFalso({ method: "POST", cookie, body: { data: "2026-11-01", hora: "9h", titulo: "Culto de Ano Novo Espiritual" } }), res);
  res = resFalso();
  await eventosHandler(reqFalso({ method: "GET" }), res);
  afirmar("GET agora retorna 2 eventos, ordenados por data", res.corpo.length === 2 && res.corpo[0].data === "2026-11-01");

  // 9) DELETE sem login -> 401
  res = resFalso();
  await eventosHandler(reqFalso({ method: "DELETE", body: { id: idCriado } }), res);
  afirmar("DELETE sem sessão retorna 401", res.statusCode === 401);

  // 10) DELETE autenticado -> remove o evento certo
  res = resFalso();
  await eventosHandler(reqFalso({ method: "DELETE", cookie, body: { id: idCriado } }), res);
  afirmar("DELETE autenticado retorna 200", res.statusCode === 200);
  res = resFalso();
  await eventosHandler(reqFalso({ method: "GET" }), res);
  afirmar("GET depois do DELETE retorna 1 evento restante", res.corpo.length === 1 && res.corpo[0].titulo !== "Culto de Natal");

  // 11) sessão forjada com segredo errado -> 401
  process.env.SESSION_SECRET = "outro-segredo";
  const tokenForjado = criarTokenSessao("admin@exemplo.com");
  process.env.SESSION_SECRET = "segredo-de-teste";
  res = resFalso();
  await eventosHandler(reqFalso({ method: "POST", cookie: cookieLogin(tokenForjado).split(";")[0], body: { data: "2026-01-01", hora: "9h", titulo: "x" } }), res);
  afirmar("token assinado com segredo diferente é rejeitado", res.statusCode === 401);

  console.log(falhas === 0 ? "\nTudo certo: 11 verificações passaram." : `\n${falhas} verificação(ões) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

run();
