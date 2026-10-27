import { limparCookieSessao, origemDaRequisicaoValida } from '../server/auth-session.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  if (!origemDaRequisicaoValida(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  // Sessões sem estado no banco não podem ser revogadas individualmente;
  // o navegador apaga o cookie e o token expira em até 12 horas.
  limparCookieSessao(res);
  return res.status(200).json({ ok: true });
}
