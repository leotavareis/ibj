const { criarTokenSessao, compararSenha, cookieLogin, lerCorpoJSON } = require("./_lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminSenha = process.env.ADMIN_PASSWORD || "";

  if (!adminEmail || !adminSenha || !process.env.SESSION_SECRET) {
    res.status(500).json({ erro: "Área restrita ainda não configurada no servidor (variáveis de ambiente ausentes)." });
    return;
  }

  const { email, senha } = await lerCorpoJSON(req);

  const emailOk = typeof email === "string" && email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
  const senhaOk = compararSenha(typeof senha === "string" ? senha : "", adminSenha);

  if (!emailOk || !senhaOk) {
    res.status(401).json({ erro: "E-mail ou senha incorretos." });
    return;
  }

  const token = criarTokenSessao(adminEmail);
  res.setHeader("Set-Cookie", cookieLogin(token));
  res.status(200).json({ ok: true });
};
