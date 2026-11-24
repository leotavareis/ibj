// Funções compartilhadas de autenticação da área restrita.
// Nunca expor estas funções como rota de API — este arquivo vive em api/_lib/
// (pasta com "_" na frente), que a Vercel não transforma em endpoint.

const crypto = require("crypto");

const COOKIE_NOME = "ibj_admin";
const SESSAO_DURACAO_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function assinar(base64url) {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(base64url)
    .digest("hex");
}

function criarTokenSessao(email) {
  const payload = JSON.stringify({ email, exp: Date.now() + SESSAO_DURACAO_MS });
  const base64url = Buffer.from(payload).toString("base64url");
  const assinatura = assinar(base64url);
  return `${base64url}.${assinatura}`;
}

function lerCookie(req, nome) {
  const header = req.headers.cookie || "";
  for (const parte of header.split(";")) {
    const i = parte.indexOf("=");
    if (i === -1) continue;
    const chave = parte.slice(0, i).trim();
    if (chave === nome) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}

function sessaoValida(req) {
  const token = lerCookie(req, COOKIE_NOME);
  if (!token) return false;

  const [base64url, assinatura] = token.split(".");
  if (!base64url || !assinatura) return false;

  const esperada = assinar(base64url);
  if (esperada.length !== assinatura.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(assinatura))) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(base64url, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!payload.exp || Date.now() > payload.exp) return false;
  return true;
}

function compararSenha(digitada, correta) {
  if (typeof digitada !== "string" || typeof correta !== "string") return false;
  if (digitada.length !== correta.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digitada), Buffer.from(correta));
}

function cookieLogin(token) {
  return `${COOKIE_NOME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSAO_DURACAO_MS / 1000)}`;
}

function cookieLogout() {
  return `${COOKIE_NOME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

async function lerCorpoJSON(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return {}; }
  }
  // fallback: junta os chunks manualmente (alguns runtimes não fazem parse automático)
  return new Promise((resolve) => {
    let dados = "";
    req.on("data", (c) => (dados += c));
    req.on("end", () => {
      try { resolve(JSON.parse(dados || "{}")); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = {
  criarTokenSessao,
  sessaoValida,
  compararSenha,
  cookieLogin,
  cookieLogout,
  lerCorpoJSON,
};
