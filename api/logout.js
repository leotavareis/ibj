const { cookieLogout } = require("./_lib/auth");

module.exports = async (req, res) => {
  res.setHeader("Set-Cookie", cookieLogout());
  res.status(200).json({ ok: true });
};
