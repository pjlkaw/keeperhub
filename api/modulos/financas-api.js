import {
  atualizarConta, criarConta, excluirConta, idValido as idContaValido,
  listarContas, normalizarTipoConta
} from '../../server/repositories/financas/contas.js';
import {
  atualizarTransacao, criarTransacao, excluirTransacao,
  idValido as idTransacaoValido, listarTransacoes, STATUS, TIPOS
} from '../../server/repositories/financas/transacoes.js';
import { origemDaRequisicaoValida, usuarioDaSessao } from '../../server/auth-session.js';

function erro(res, status, mensagem) {
  return res.status(status).json({ erro: mensagem });
}

function falhaValidacao(mensagem) {
  const exception = new Error(mensagem);
  exception.status = 400;
  throw exception;
}

function dataValida(valor) {
  if (typeof valor !== 'string' || valor.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function dadosConta(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const tipo = normalizarTipoConta(body.tipo);
  return nome && tipo ? { nome, tipo } : null;
}

function dadosTransacao(body) {
  const valorOriginal = Number(body.valor);
  const valor = Number.isFinite(valorOriginal)
    ? Math.round((valorOriginal + Number.EPSILON) * 100) / 100
    : NaN;
  const contaId = idTransacaoValido(body.conta_id);
  const tipo = String(body.tipo || '');
  const status = String(body.status || 'pending');
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
  const data = typeof body.data === 'string' ? body.data : '';
  const vencimento = body.vencimento === null || body.vencimento === undefined || body.vencimento === ''
    ? null
    : body.vencimento;

  if (!dataValida(data)) falhaValidacao('Data inválida.');
  if (vencimento !== null && !dataValida(vencimento)) falhaValidacao('Vencimento inválido.');
  if (!Number.isFinite(valor) || valor <= 0) falhaValidacao('Valor inválido.');
  if (!contaId || !TIPOS.has(tipo) || !STATUS.has(status) || !descricao) return null;

  return {
    conta_id: contaId, tipo, valor, descricao,
    categoria: typeof body.categoria === 'string' ? body.categoria.trim() || null : null,
    data, vencimento, status,
    observacoes: typeof body.observacoes === 'string' ? body.observacoes.trim() || null : null
  };
}

export default async function handler(req, res) {
  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return erro(res, 401, 'Entre na sua conta para continuar.');
  if (req.method !== 'GET' && !origemDaRequisicaoValida(req)) {
    return erro(res, 403, 'Origem da requisição não permitida.');
  }

  const recurso = req.query?.recurso;
  const id = recurso === 'contas'
    ? idContaValido(req.query?.id)
    : idTransacaoValido(req.query?.id);

  try {
    if (recurso === 'contas') {
      if (req.method === 'GET') return res.status(200).json({ contas: await listarContas(usuarioId) });
      if (req.method === 'DELETE') {
        if (!id) return erro(res, 400, 'Identificador de conta inválido.');
        const resultado = await excluirConta(usuarioId, id);
        return resultado.affectedRows ? res.status(204).end() : erro(res, 404, 'Conta não encontrada.');
      }
      if (req.method !== 'POST' && req.method !== 'PUT') return erro(res, 405, 'Método não permitido.');
      const dados = dadosConta(req.body || {});
      if (!dados) return erro(res, 400, 'Informe nome e tipo de conta válidos.');
      if (req.method === 'POST') return res.status(201).json(await criarConta(usuarioId, dados));
      if (!id) return erro(res, 400, 'Identificador de conta inválido.');
      const resultado = await atualizarConta(usuarioId, id, dados);
      return resultado.affectedRows ? res.status(200).json({ ok: true }) : erro(res, 404, 'Conta não encontrada.');
    }

    if (recurso === 'transacoes') {
      if (req.method === 'GET') return res.status(200).json({ transacoes: await listarTransacoes(usuarioId) });
      if (req.method === 'DELETE') {
        if (!id) return erro(res, 400, 'Identificador de transação inválido.');
        const resultado = await excluirTransacao(usuarioId, id);
        return resultado.affectedRows ? res.status(204).end() : erro(res, 404, 'Transação não encontrada.');
      }
      if (req.method !== 'POST' && req.method !== 'PUT') return erro(res, 405, 'Método não permitido.');
      const dados = dadosTransacao(req.body || {});
      if (!dados) return erro(res, 400, 'Informe os dados válidos da transação.');
      if (req.method === 'POST') return res.status(201).json(await criarTransacao(usuarioId, dados));
      if (!id) return erro(res, 400, 'Identificador de transação inválido.');
      const resultado = await atualizarTransacao(usuarioId, id, dados);
      return resultado.affectedRows ? res.status(200).json({ ok: true }) : erro(res, 404, 'Transação não encontrada.');
    }

    return erro(res, 400, 'Recurso financeiro inválido.');
  } catch (exception) {
    if (exception.status === 400) return erro(res, 400, exception.message);
    console.error('Erro na API de finanças:', exception);
    if (exception.code === 'ACCOUNT_NOT_FOUND') return erro(res, 400, exception.message);
    if (exception.code === 'ER_DUP_ENTRY') return erro(res, 409, 'Já existe um registro com estes dados.');
    return erro(res, 500, 'Erro ao acessar os dados financeiros.');
  }
}
