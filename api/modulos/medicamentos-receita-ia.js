import { usuarioDaSessao, origemDaRequisicaoValida } from '../../server/auth-session.js';
import { usuarioTemAcesso } from '../../server/repositories/modulos.js';
import { interpretarReceita } from '../../server/services/receita-vision.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) {
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }
  if (!origemDaRequisicaoValida(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  try {
    if (!(await usuarioTemAcesso(usuarioId, 'medicamentos'))) {
      return res.status(403).json({ erro: 'O módulo Medicamentos não está ativo para esta conta.' });
    }

    const sugestao = await interpretarReceita(req.body?.imagens);
    return res.status(200).json({ sugestao });
  } catch (erro) {
    if (erro.statusCode) {
      return res.status(erro.statusCode).json({ erro: erro.message });
    }
    console.error('[Receitas] Falha no endpoint de leitura:', erro.code || 'erro');
    return res.status(500).json({ erro: 'Não foi possível ler a receita agora.' });
  }
}
