// Organização do módulo Despensa: listar, cadastrar, atualizar e remover
// produtos e os itens da checklist (lista de compras).
//
// Produtos:  GET | POST | PUT ?id= | DELETE ?id=
//            GET ?incluir=medicamentos -> também devolve os lotes de medicamento
//            (usado pela tela de Vencimentos)
// Checklist: GET ?recurso=checklist | POST ?recurso=checklist
//            PUT ?recurso=checklist&id=  (body { comprado })
//            DELETE ?recurso=checklist&id= | DELETE ?recurso=checklist (limpar)
// Medicamentos (só estoque; o cadastro é do módulo Medicamentos):
//            GET ?recurso=medicamentos
//            POST ?recurso=medicamentos&acao=repor&id=      (body { quantidade, validade })
//            POST ?recurso=medicamentos&acao=baixa&id=      (body { quantidade })
//            POST ?recurso=medicamentos&acao=descartar&id=  (id do lote)
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
  listarProdutos,
} from '../../server/repositories/despensa/produtos.js';
import {
  adicionarItem,
  limparLista,
  listarItens,
  marcarComprado,
  removerItem,
} from '../../server/repositories/despensa/checklist.js';
import {
  UNIDADES_INTEIRAS,
  buscarMedicamentoEstoque,
  darBaixaMedicamento,
  descartarLote,
  listarLotesParaVencimento,
  listarMedicamentosEstoque,
  reporMedicamento,
} from '../../server/repositories/despensa/medicamentos.js';
import {
  origemDaRequisicaoValida,
  usuarioDaSessao,
} from '../../server/auth-session.js';

export const CATEGORIAS = ['Laticínios', 'Grãos', 'Bebidas', 'Limpeza', 'Hortifruti', 'Outros'];
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const QUANTIDADE_MAXIMA = 100000;

function dataISOValida(valor) {
  if (!DATA_VALIDA.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function validarBase(body) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const categoria = typeof body.categoria === 'string' ? body.categoria : '';
  const quantidade = Number(body.quantidade);

  if (!nome || nome.length > 150) return { erro: 'Informe um nome de produto válido.' };
  if (!CATEGORIAS.includes(categoria)) return { erro: 'Selecione uma categoria válida.' };
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) {
    return { erro: 'Informe uma quantidade inteira maior que zero.' };
  }
  return { dados: { nome, categoria, quantidade } };
}

export function validarProduto(body = {}) {
  const base = validarBase(body);
  if (base.erro) return base;
  const validade = typeof body.validade === 'string' ? body.validade : '';
  if (validade && !dataISOValida(validade)) return { erro: 'Informe uma data de validade válida.' };
  return { dados: { ...base.dados, validade } };
}

export function validarItemLista(body = {}) {
  return validarBase(body);
}

// Quantidade de medicamento: até 2 casas decimais; inteira para comprimidos, caixas etc.
export function validarQuantidadeMedicamento(valor, unidade) {
  const quantidade = Number(valor);
  if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 1000000 ||
      Math.abs(quantidade * 100 - Math.round(quantidade * 100)) > 0.0000001) {
    return { erro: 'Informe uma quantidade válida.' };
  }
  if (UNIDADES_INTEIRAS.has(String(unidade).toLowerCase()) && !Number.isInteger(quantidade)) {
    return { erro: 'Use uma quantidade inteira para esta unidade de estoque.' };
  }
  return { quantidade };
}

function idDaRequisicao(req) {
  const id = Number(req.query?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function temId(req) {
  return Object.prototype.hasOwnProperty.call(req.query || {}, 'id');
}

async function tratarProdutos(req, res, usuarioId) {
  if (req.method === 'GET') {
    const produtos = await listarProdutos(usuarioId);
    if (req.query?.incluir === 'medicamentos') {
      return res.status(200).json({
        produtos,
        medicamentos: await listarLotesParaVencimento(usuarioId),
      });
    }
    return res.status(200).json({ produtos });
  }

  const id = idDaRequisicao(req);
  if (temId(req) && !id) return res.status(400).json({ erro: 'Informe um identificador válido.' });

  if (req.method === 'POST' || req.method === 'PUT') {
    const validacao = validarProduto(req.body || {});
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

    if (req.method === 'POST') {
      return res.status(201).json({ produto: await criarProduto(usuarioId, validacao.dados) });
    }
    if (!id) return res.status(400).json({ erro: 'Informe o produto.' });
    const produto = await atualizarProduto(id, usuarioId, validacao.dados);
    return produto
      ? res.status(200).json({ produto })
      : res.status(404).json({ erro: 'Produto não encontrado.' });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ erro: 'Informe o produto.' });
    return (await excluirProduto(id, usuarioId))
      ? res.status(204).end()
      : res.status(404).json({ erro: 'Produto não encontrado.' });
  }

  return res.status(405).json({ erro: 'Método não permitido.' });
}

async function tratarChecklist(req, res, usuarioId) {
  if (req.method === 'GET') {
    return res.status(200).json({ itens: await listarItens(usuarioId) });
  }

  const id = idDaRequisicao(req);
  if (temId(req) && !id) return res.status(400).json({ erro: 'Informe um identificador válido.' });

  if (req.method === 'POST') {
    const validacao = validarItemLista(req.body || {});
    if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
    return res.status(201).json({ item: await adicionarItem(usuarioId, validacao.dados) });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ erro: 'Informe o item da lista.' });
    if (typeof req.body?.comprado !== 'boolean') {
      return res.status(400).json({ erro: 'Informe se o item foi comprado.' });
    }
    const item = await marcarComprado(usuarioId, id, req.body.comprado);
    return item
      ? res.status(200).json({ item })
      : res.status(404).json({ erro: 'Item não encontrado.' });
  }

  if (req.method === 'DELETE') {
    if (!id) {
      await limparLista(usuarioId);
      return res.status(204).end();
    }
    return (await removerItem(usuarioId, id))
      ? res.status(204).end()
      : res.status(404).json({ erro: 'Item não encontrado.' });
  }

  return res.status(405).json({ erro: 'Método não permitido.' });
}

async function tratarMedicamentos(req, res, usuarioId) {
  if (req.method === 'GET') {
    return res.status(200).json({ medicamentos: await listarMedicamentosEstoque(usuarioId) });
  }
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  const id = idDaRequisicao(req);
  if (!id) return res.status(400).json({ erro: 'Informe um identificador válido.' });
  const acao = req.query?.acao;

  if (acao === 'descartar') {
    const medicamento = await descartarLote(id, usuarioId);
    return medicamento
      ? res.status(200).json({ medicamento })
      : res.status(404).json({ erro: 'Lote não encontrado.' });
  }

  if (acao !== 'repor' && acao !== 'baixa') {
    return res.status(400).json({ erro: 'Ação inválida.' });
  }

  const atual = await buscarMedicamentoEstoque(id, usuarioId);
  if (!atual) return res.status(404).json({ erro: 'Medicamento não encontrado.' });

  const validacao = validarQuantidadeMedicamento(req.body?.quantidade, atual.unidade);
  if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

  if (acao === 'repor') {
    const validade = typeof req.body?.validade === 'string' ? req.body.validade : '';
    if (validade && !dataISOValida(validade)) {
      return res.status(400).json({ erro: 'Informe uma data de validade válida.' });
    }
    const medicamento = await reporMedicamento(id, usuarioId, validacao.quantidade, validade);
    return medicamento
      ? res.status(201).json({ medicamento })
      : res.status(404).json({ erro: 'Medicamento não encontrado.' });
  }

  const resultado = await darBaixaMedicamento(id, usuarioId, validacao.quantidade);
  if (resultado.erro === 'sem-estoque') {
    return res.status(409).json({ erro: 'A quantidade é maior que o estoque disponível.' });
  }
  if (resultado.erro) return res.status(404).json({ erro: 'Medicamento não encontrado.' });
  return res.status(200).json({ medicamento: resultado.medicamento });
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const usuarioId = usuarioDaSessao(req);
    if (!usuarioId) {
      return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
    }
    if (req.method !== 'GET' && !origemDaRequisicaoValida(req)) {
      return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
    }

    if (req.query?.recurso === 'checklist') return await tratarChecklist(req, res, usuarioId);
    if (req.query?.recurso === 'medicamentos') return await tratarMedicamentos(req, res, usuarioId);
    return await tratarProdutos(req, res, usuarioId);
  } catch (erro) {
    console.error('Erro na API da despensa:', erro);
    return res.status(erro.statusCode || 500).json({
      erro: erro.statusCode ? erro.message : 'Erro ao acessar a despensa.',
    });
  }
}
