const { sessaoValida } = require("./_lib/auth");

// Diz à página /admin se o cookie de login ainda é válido, sem expor nada sensível.
module.exports = async (req, res) => {
  res.status(200).json({ autenticado: sessaoValida(req) });
};
