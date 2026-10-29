import {
  atualizarMedicamento,
  buscarMedicamento,
  criarMedicamento,
  encerrarTratamento,
  excluirMedicamento,
  listarHistoricoEstoque,
  listarMovimentacoesEstoque,
  listarMedicamentos,
  listarRegistrosUso,
  registrarEntradaEstoque,
  salvarRegistroUso,
} from '../../server/repositories/medicamentos/medicamentos.js';
import {
  origemDaRequisicaoValida,
  usuarioDaSessao,
} from '../../server/auth-session.js';

const TIPOS_USO = ['continuo', 'temporario', 'eventual'];
const FREQUENCIAS = ['diario', 'especifico', 'intervalo'];
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const HORARIO_VALIDO = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function dataISOValida(valor) {
  if (!DATA_VALIDA.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function quantidadeComDuasCasas(valor) {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 0.0000001;
}

function validarDados(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const unidade = typeof body.unidade === 'string' ? body.unidade.trim() : '';
  const concentracao = typeof body.concentracao === 'string'
    ? body.concentracao.trim()
    : '';
  const dose = typeof body.dose === 'string' ? body.dose.trim() : '';
  const tipoUso = typeof body.tipoUso === 'string' ? body.tipoUso : '';
  const frequencia = typeof body.frequencia === 'string' ? body.frequencia : 'diario';
  const intervaloHoras = body.intervaloHoras === '' || body.intervaloHoras == null
    ? null
    : Number(body.intervaloHoras);
  const dias = Array.isArray(body.dias) ? [...new Set(body.dias)] : [];
  const horarios = Array.isArray(body.horarios)
    ? [...new Set(body.horarios.filter((hora) => typeof hora === 'string'))]
    : [];
  const dataInicio = typeof body.dataInicio === 'string' ? body.dataInicio : '';
  const dataFim = typeof body.dataFim === 'string' ? body.dataFim : '';
  const quantidadeInicial = body.quantidadeInicial === '' || body.quantidadeInicial == null
    ? 0
    : Number(body.quantidadeInicial);
  const validade = typeof body.validade === 'string' ? body.validade : '';

  if (!nome || nome.length > 150) {
    return { erro: 'Informe um nome de medicamento válido.' };
  }
  if (!unidade || unidade.length > 30) {
    return { erro: 'Informe a unidade do medicamento.' };
  }
  if (concentracao.length > 80 || dose.length > 100) {
    return { erro: 'Os dados do medicamento são muito longos.' };
  }
  if (!TIPOS_USO.includes(tipoUso)) {
    return { erro: 'Informe um tipo de uso válido.' };
  }
  if (!FREQUENCIAS.includes(frequencia)) {
    return { erro: 'Informe uma frequência válida.' };
  }
  if (frequencia === 'intervalo' && (!Number.isInteger(intervaloHoras) || intervaloHoras < 1 || intervaloHoras > 48)) {
    return { erro: 'Informe um intervalo entre 1 e 48 horas.' };
  }
  if (frequencia === 'especifico' && (!dias.length || dias.some((dia) => !DIAS.includes(dia)))) {
    return { erro: 'Selecione ao menos um dia válido para a rotina.' };
  }
  if (horarios.some((hora) => !HORARIO_VALIDO.test(hora))) {
    return { erro: 'Informe os horários no formato HH:mm.' };
  }
  if ((dataInicio && !dataISOValida(dataInicio)) || (dataFim && !dataISOValida(dataFim)) ||
      (dataInicio && dataFim && dataFim < dataInicio)) {
    return { erro: 'Confira as datas do tratamento.' };
  }
  if (!Number.isFinite(quantidadeInicial) || quantidadeInicial < 0 || quantidadeInicial > 1000000 ||
      !quantidadeComDuasCasas(quantidadeInicial)) {
    return { erro: 'Informe uma quantidade inicial válida.' };
  }
  if (['comprimidos', 'capsulas', 'unidades'].includes(unidade) && !Number.isInteger(quantidadeInicial)) {
    return { erro: 'Use uma quantidade inteira para esta unidade de estoque.' };
  }
  if (validade && !dataISOValida(validade)) {
    return { erro: 'Informe uma data de validade válida.' };
  }

  return {
    dados: {
      nome, unidade, concentracao, dose, tipoUso, frequencia, intervaloHoras,
      dias, horarios, dataInicio, dataFim, quantidadeInicial, validade,
    },
  };
}

function idDaRequisicao(req) {
  const valor = req.query?.id;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requisicaoTemId(req) {
  return Object.prototype.hasOwnProperty.call(req.query || {}, 'id');
}

function dadosPublicos(medicamento) {
  if (!medicamento) return null;
  const { itemId, ativo, rotinaId, lotesCadastrados, ...dados } = medicamento;
  return { ...dados, status: dados.status || (ativo ? 'ativo' : 'encerrado') };
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const usuarioId = usuarioDaSessao(req);
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
    }

    if (req.method === 'GET') {
      if (req.query?.acao === 'historico') {
        return res.status(200).json({ eventos: await listarHistoricoEstoque(usuarioId) });
      }
      if (req.query?.acao === 'usos') {
        return res.status(200).json({ registros: await listarRegistrosUso(usuarioId) });
      }
      const id = idDaRequisicao(req);
      if (requisicaoTemId(req) && !id) {
        return res.status(400).json({ erro: 'Informe um identificador válido.' });
      }
      if (req.query?.acao === 'movimentacoes') {
        if (!id) return res.status(400).json({ erro: 'Informe o medicamento.' });
        return res.status(200).json({ eventos: await listarMovimentacoesEstoque(id, usuarioId) });
      }
      if (id) {
        const medicamento = await buscarMedicamento(id, usuarioId);
        return medicamento
          ? res.status(200).json({ medicamento: dadosPublicos(medicamento) })
          : res.status(404).json({ erro: 'Medicamento não encontrado.' });
      }
      const medicamentos = await listarMedicamentos(usuarioId);
      return res.status(200).json({ medicamentos: medicamentos.map(dadosPublicos) });
    }

    if (!origemDaRequisicaoValida(req)) {
      return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
    }

    if (req.method === 'POST' && req.query?.acao === 'uso') {
      const body = req.body || {};
      const medicamentoId = Number(body.medicamentoId);
      const tipoUso = body.tipoUso;
      const data = typeof body.data === 'string' ? body.data : '';
      const horario = typeof body.horario === 'string' && body.horario !== 'Sem horário'
        ? body.horario
        : '';
      const status = body.status;
      const dose = typeof body.dose === 'string' ? body.dose.trim() : '';
      const observacao = typeof body.observacao === 'string' ? body.observacao.trim() : '';

      if (!Number.isInteger(medicamentoId) || medicamentoId <= 0 || !dataISOValida(data) ||
          !['rotina', 'eventual'].includes(tipoUso)) {
        return res.status(400).json({ erro: 'Informe um medicamento e uma data válidos.' });
      }
      if ((horario && !HORARIO_VALIDO.test(horario)) || (tipoUso === 'eventual' && !horario)) {
        return res.status(400).json({ erro: 'Informe um horário válido.' });
      }
      if (!['tomada', 'sem-estoque'].includes(status) || dose.length > 100 || observacao.length > 2000) {
        return res.status(400).json({ erro: 'Confira os dados do registro de uso.' });
      }

      const registros = await salvarRegistroUso(usuarioId, {
        medicamentoId, tipoUso, data, horario, status, dose, observacao,
      });
      return registros
        ? res.status(200).json({ registros })
        : res.status(404).json({ erro: 'Medicamento não encontrado.' });
    }

    if (req.method === 'POST' && req.query?.acao === 'entrada') {
      const quantidade = Number(req.body?.quantidade);
      const validade = typeof req.body?.validade === 'string' ? req.body.validade : '';
      if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 1000000 ||
          !quantidadeComDuasCasas(quantidade)) {
        return res.status(400).json({ erro: 'Informe uma quantidade de reposição válida.' });
      }
      if (validade && !dataISOValida(validade)) {
        return res.status(400).json({ erro: 'Informe uma data de validade válida.' });
      }
      const id = idDaRequisicao(req);
      if (!id) return res.status(400).json({ erro: 'Informe o medicamento.' });
      const atual = await buscarMedicamento(id, usuarioId);
      if (!atual) return res.status(404).json({ erro: 'Medicamento não encontrado.' });
      if (['comprimidos', 'capsulas', 'unidades'].includes(atual.unidade) && !Number.isInteger(quantidade)) {
        return res.status(400).json({ erro: 'Use uma quantidade inteira para esta unidade de estoque.' });
      }
      const medicamento = await registrarEntradaEstoque(id, usuarioId, quantidade, validade);
      return medicamento
        ? res.status(201).json({ medicamento: dadosPublicos(medicamento) })
        : res.status(404).json({ erro: 'Medicamento não encontrado.' });
    }

    if (req.method === 'POST' && req.query?.acao === 'encerrar') {
      const id = idDaRequisicao(req);
      if (!id) return res.status(400).json({ erro: 'Informe o medicamento.' });
      const medicamento = await encerrarTratamento(id, usuarioId);
      return medicamento
        ? res.status(200).json({ medicamento: dadosPublicos(medicamento) })
        : res.status(404).json({ erro: 'Medicamento ou rotina não encontrado.' });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const validacao = validarDados(req.body || {});
      if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

      const id = idDaRequisicao(req);
      if (req.method === 'POST') {
        const medicamento = await criarMedicamento(usuarioId, validacao.dados);
        return res.status(201).json({ medicamento: dadosPublicos(medicamento) });
      }
      if (!id) return res.status(400).json({ erro: 'Informe o medicamento.' });

      const existente = await buscarMedicamento(id, usuarioId);
      if (!existente) return res.status(404).json({ erro: 'Medicamento não encontrado.' });
      if (existente.estoqueCadastrado && existente.unidade !== validacao.dados.unidade) {
        return res.status(409).json({ erro: 'A unidade não pode ser alterada enquanto houver lotes de estoque.' });
      }

      const medicamento = await atualizarMedicamento(id, usuarioId, validacao.dados);
      return medicamento
        ? res.status(200).json({ medicamento: dadosPublicos(medicamento) })
        : res.status(404).json({ erro: 'Medicamento não encontrado.' });
    }

    if (req.method === 'DELETE') {
      const id = idDaRequisicao(req);
      if (!id) return res.status(400).json({ erro: 'Informe o medicamento.' });
      const removido = await excluirMedicamento(id, usuarioId);
      return removido
        ? res.status(204).end()
        : res.status(404).json({ erro: 'Medicamento não encontrado.' });
    }

    return res.status(405).json({ erro: 'Método não permitido.' });
  } catch (erro) {
    console.error('Erro na API de medicamentos:', erro);
    return res.status(500).json({ erro: 'Erro ao acessar medicamentos.' });
  }
}
