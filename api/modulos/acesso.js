import {
  listarAcessosUsuario,
  MODULOS_VALIDOS,
  salvarAcessosUsuario,
} from '../../server/repositories/modulos.js';
import { origemDaRequisicaoValida, usuarioDaSessao } from '../../server/auth-session.js';

const PERIODOS_VALIDOS = new Set(['mensal', 'anual']);

export default async function handler(req, res) {
  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  if (req.method !== 'GET' && !origemDaRequisicaoValida(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      return res.status(200).json({ modulos: await listarAcessosUsuario(usuarioId) });
    }
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ erro: 'Método não permitido.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const periodo = typeof body.periodo === 'string' ? body.periodo : '';
    const modulos = [...new Set(Array.isArray(body.modulos) ? body.modulos : [])];
    if (!PERIODOS_VALIDOS.has(periodo) || !modulos.length ||
        modulos.some((codigo) => typeof codigo !== 'string' || !MODULOS_VALIDOS.has(codigo))) {
      return res.status(400).json({ erro: 'Selecione módulos válidos e um período.' });
    }

    return res.status(200).json({
      modulos: await salvarAcessosUsuario(usuarioId, modulos, periodo, 'compra'),
    });
  } catch (erro) {
    console.error('Erro ao salvar o plano de módulos:', erro);
    return res.status(500).json({ erro: 'Não foi possível salvar o plano selecionado.' });
  }
}
