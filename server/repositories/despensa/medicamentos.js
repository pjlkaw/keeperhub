// Estoque dos medicamentos administrado pela Despensa.
//
// O cadastro (nome, dose, rotina, unidade) continua sendo do módulo
// Medicamentos. Aqui só lemos os medicamentos e mexemos no estoque, que fica
// nas mesmas tabelas usadas por eles: lote (quantidade + validade) e
// movimentacao (histórico de entradas e saídas).
import db from '../../db.js';
import { registrarEntradaEstoque } from '../medicamentos/medicamentos.js';
import { emTransacao } from './produtos.js';

export const UNIDADES_INTEIRAS = new Set([
  'comprimidos', 'capsulas', 'unidades', 'caixa', 'caixas',
  'frasco', 'frascos', 'cartela', 'cartelas',
]);

function arredondar(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

async function consultarMedicamentos(usuarioId, idMedicamento = null) {
  const filtro = idMedicamento ? ' AND m.id_medicamento = ?' : '';
  const valores = idMedicamento ? [usuarioId, idMedicamento] : [usuarioId];

  const [medicamentos] = await db.execute(
    `SELECT m.id_medicamento AS id, i.id_item AS itemId, i.nome,
            m.unidade_estoque AS unidade
       FROM medicamento m
       JOIN item i ON i.id_item = m.item_id
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1${filtro}
      ORDER BY i.nome`,
    valores
  );
  if (!medicamentos.length) return [];

  const [lotes] = await db.execute(
    `SELECT l.id_lote AS id, l.item_id AS itemId, l.quantidade,
            DATE_FORMAT(l.validade, '%Y-%m-%d') AS validade
       FROM lote l
       JOIN item i ON i.id_item = l.item_id
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1
        AND l.quantidade > 0
      ORDER BY l.validade IS NULL, l.validade, l.id_lote`,
    [usuarioId]
  );

  return medicamentos.map((medicamento) => {
    const lotesDoItem = lotes
      .filter((lote) => Number(lote.itemId) === Number(medicamento.itemId))
      .map((lote) => ({
        id: String(lote.id),
        quantidade: Number(lote.quantidade),
        validade: lote.validade || '',
      }));
    return {
      id: String(medicamento.id),
      nome: medicamento.nome,
      unidade: medicamento.unidade,
      quantidade: arredondar(lotesDoItem.reduce((soma, lote) => soma + lote.quantidade, 0)),
      lotes: lotesDoItem,
    };
  });
}

export async function listarMedicamentosEstoque(usuarioId) {
  return consultarMedicamentos(usuarioId);
}

export async function buscarMedicamentoEstoque(idMedicamento, usuarioId) {
  const [medicamento] = await consultarMedicamentos(usuarioId, idMedicamento);
  return medicamento ?? null;
}

// Repor: mesma função que o módulo Medicamentos usa (lote novo + entrada).
export async function reporMedicamento(idMedicamento, usuarioId, quantidade, validade) {
  const resultado = await registrarEntradaEstoque(idMedicamento, usuarioId, quantidade, validade);
  return resultado ? buscarMedicamentoEstoque(idMedicamento, usuarioId) : null;
}

// Dar baixa: abate primeiro do lote que vence antes (igual às doses).
export async function darBaixaMedicamento(idMedicamento, usuarioId, quantidade) {
  const resultado = await emTransacao(async (conexao) => {
    const [donos] = await conexao.execute(
      `SELECT i.id_item
         FROM medicamento m
         JOIN item i ON i.id_item = m.item_id
        WHERE m.id_medicamento = ? AND i.usuario_id = ?
          AND i.tipo_item = 'medicamento' AND i.ativo = 1
        FOR UPDATE`,
      [idMedicamento, usuarioId]
    );
    const itemId = donos[0]?.id_item;
    if (!itemId) return 'nao-encontrado';

    const [lotes] = await conexao.execute(
      `SELECT id_lote, quantidade FROM lote
        WHERE item_id = ? AND quantidade > 0
        ORDER BY validade IS NULL, validade, id_lote
        FOR UPDATE`,
      [itemId]
    );
    const total = arredondar(lotes.reduce((soma, lote) => soma + Number(lote.quantidade), 0));
    if (quantidade > total) return 'sem-estoque';

    let restante = arredondar(quantidade);
    for (const lote of lotes) {
      if (restante <= 0) break;
      const abatido = arredondar(Math.min(Number(lote.quantidade), restante));
      await conexao.execute(
        'UPDATE lote SET quantidade = quantidade - ? WHERE id_lote = ?',
        [abatido, lote.id_lote]
      );
      await conexao.execute(
        `INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao)
         VALUES (?, 'saida', ?, ?)`,
        [lote.id_lote, abatido, 'Baixa pela Despensa']
      );
      restante = arredondar(restante - abatido);
    }
    return 'ok';
  });

  if (resultado !== 'ok') return { erro: resultado };
  return { medicamento: await buscarMedicamentoEstoque(idMedicamento, usuarioId) };
}

// Descartar lote: zera o lote inteiro (ex.: vencido) e registra a saída.
export async function descartarLote(idLote, usuarioId) {
  const medicamentoId = await emTransacao(async (conexao) => {
    const [linhas] = await conexao.execute(
      `SELECT l.id_lote, l.quantidade, m.id_medicamento
         FROM lote l
         JOIN item i ON i.id_item = l.item_id
         JOIN medicamento m ON m.item_id = i.id_item
        WHERE l.id_lote = ? AND i.usuario_id = ?
          AND i.tipo_item = 'medicamento' AND i.ativo = 1
        FOR UPDATE`,
      [idLote, usuarioId]
    );
    const lote = linhas[0];
    if (!lote) return null;

    const quantidade = Number(lote.quantidade);
    if (quantidade > 0) {
      await conexao.execute('UPDATE lote SET quantidade = 0 WHERE id_lote = ?', [idLote]);
      await conexao.execute(
        `INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao)
         VALUES (?, 'saida', ?, ?)`,
        [idLote, quantidade, 'Lote descartado pela Despensa']
      );
    }
    return lote.id_medicamento;
  });

  return medicamentoId ? buscarMedicamentoEstoque(medicamentoId, usuarioId) : null;
}

// Lotes com validade e quantidade, para a tela de Vencimentos.
export async function listarLotesParaVencimento(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT l.id_lote AS id, i.nome, m.unidade_estoque AS unidade, l.quantidade,
            DATE_FORMAT(l.validade, '%Y-%m-%d') AS validade
       FROM lote l
       JOIN item i ON i.id_item = l.item_id
       JOIN medicamento m ON m.item_id = i.id_item
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1
        AND l.quantidade > 0 AND l.validade IS NOT NULL
      ORDER BY l.validade`,
    [usuarioId]
  );
  return linhas.map((linha) => ({
    id: `lote-${linha.id}`,
    nome: linha.nome,
    categoria: 'Medicamentos',
    quantidade: Number(linha.quantidade),
    unidade: linha.unidade,
    validade: linha.validade,
    tipo: 'medicamento',
  }));
}
