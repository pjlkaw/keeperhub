// Consultas SQL de produtos da despensa: listar, cadastrar, atualizar e excluir
// produtos do usuário autenticado.
//
// Um produto da despensa é gravado em 3 tabelas:
//   item     -> nome, categoria (tipo_item = 'produto')
//   produto  -> unidade_medida (a tela não pede unidade, usamos 'un')
//   lote     -> quantidade e validade (opcional)
// O id do produto devolvido para o navegador é o id_item.
import db from '../../db.js';

const UNIDADE_PADRAO = 'un';

const SELECT_PRODUTOS = `
  SELECT i.id_item AS id,
         i.nome,
         i.categoria,
         COALESCE((SELECT SUM(l.quantidade) FROM lote l WHERE l.item_id = i.id_item), 0) AS quantidade,
         (SELECT DATE_FORMAT(MIN(l.validade), '%Y-%m-%d') FROM lote l WHERE l.item_id = i.id_item) AS validade
    FROM item i
    JOIN produto p ON p.item_id = i.id_item
   WHERE i.usuario_id = ? AND i.tipo_item = 'produto' AND i.ativo = 1`;

function mapearProduto(linha) {
  return {
    id: String(linha.id),
    nome: linha.nome,
    categoria: linha.categoria || 'Outros',
    quantidade: Number(linha.quantidade || 0),
    validade: linha.validade || '',
  };
}

export async function listarProdutos(usuarioId) {
  const [linhas] = await db.execute(`${SELECT_PRODUTOS} ORDER BY i.nome`, [usuarioId]);
  return linhas.map(mapearProduto);
}

export async function buscarProduto(idItem, usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `${SELECT_PRODUTOS} AND i.id_item = ? LIMIT 1`,
    [usuarioId, idItem]
  );
  return linhas[0] ? mapearProduto(linhas[0]) : null;
}

// Usada também pela checklist dentro da mesma transação.
export async function criarProdutoNaConexao(conexao, usuarioId, dados) {
  const [item] = await conexao.execute(
    `INSERT INTO item (usuario_id, nome, categoria, tipo_item, ativo)
     VALUES (?, ?, ?, 'produto', 1)`,
    [usuarioId, dados.nome, dados.categoria || null]
  );
  await conexao.execute(
    'INSERT INTO produto (item_id, unidade_medida) VALUES (?, ?)',
    [item.insertId, UNIDADE_PADRAO]
  );
  const [lote] = await conexao.execute(
    'INSERT INTO lote (item_id, quantidade, validade) VALUES (?, ?, ?)',
    [item.insertId, dados.quantidade, dados.validade || null]
  );
  await conexao.execute(
    "INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao) VALUES (?, 'entrada', ?, ?)",
    [lote.insertId, dados.quantidade, dados.observacao || 'Cadastro do produto']
  );
  return item.insertId;
}

// Apaga o produto e tudo que depende dele. Devolve false se não pertencer ao usuário.
export async function excluirProdutoNaConexao(conexao, idItem, usuarioId) {
  const [donos] = await conexao.execute(
    `SELECT id_item FROM item
      WHERE id_item = ? AND usuario_id = ? AND tipo_item = 'produto'
      FOR UPDATE`,
    [idItem, usuarioId]
  );
  if (!donos.length) return false;

  await conexao.execute(
    `DELETE m FROM movimentacao m JOIN lote l ON l.id_lote = m.lote_id WHERE l.item_id = ?`,
    [idItem]
  );
  await conexao.execute('DELETE FROM lote WHERE item_id = ?', [idItem]);
  await conexao.execute('DELETE FROM produto WHERE item_id = ?', [idItem]);
  // Itens da checklist que geraram este produto continuam na lista, só perdem o vínculo.
  await conexao.execute('UPDATE item_lista SET item_id = NULL WHERE item_id = ?', [idItem]);
  await conexao.execute('DELETE FROM item WHERE id_item = ?', [idItem]);
  return true;
}

async function emTransacao(acao) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await acao(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function criarProduto(usuarioId, dados) {
  const idItem = await emTransacao((conexao) => criarProdutoNaConexao(conexao, usuarioId, dados));
  return buscarProduto(idItem, usuarioId);
}

export async function atualizarProduto(idItem, usuarioId, dados) {
  const atualizado = await emTransacao(async (conexao) => {
    const [item] = await conexao.execute(
      `UPDATE item SET nome = ?, categoria = ?
        WHERE id_item = ? AND usuario_id = ? AND tipo_item = 'produto' AND ativo = 1`,
      [dados.nome, dados.categoria || null, idItem, usuarioId]
    );
    if (!item.affectedRows) return false;

    // A tela trabalha com um único lote por produto.
    const [lotes] = await conexao.execute(
      'SELECT id_lote, quantidade FROM lote WHERE item_id = ? ORDER BY id_lote FOR UPDATE',
      [idItem]
    );
    let loteId = lotes[0]?.id_lote;
    const quantidadeAnterior = Number(lotes[0]?.quantidade ?? 0);

    if (loteId) {
      await conexao.execute(
        'UPDATE lote SET quantidade = ?, validade = ? WHERE id_lote = ?',
        [dados.quantidade, dados.validade || null, loteId]
      );
      const extras = lotes.slice(1).map((lote) => lote.id_lote);
      for (const extra of extras) {
        await conexao.execute('DELETE FROM movimentacao WHERE lote_id = ?', [extra]);
        await conexao.execute('DELETE FROM lote WHERE id_lote = ?', [extra]);
      }
    } else {
      const [lote] = await conexao.execute(
        'INSERT INTO lote (item_id, quantidade, validade) VALUES (?, ?, ?)',
        [idItem, dados.quantidade, dados.validade || null]
      );
      loteId = lote.insertId;
    }

    if (quantidadeAnterior !== Number(dados.quantidade)) {
      await conexao.execute(
        "INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao) VALUES (?, 'ajuste', ?, ?)",
        [loteId, dados.quantidade, 'Edição do produto']
      );
    }
    return true;
  });
  return atualizado ? buscarProduto(idItem, usuarioId) : null;
}

export async function excluirProduto(idItem, usuarioId) {
  return emTransacao((conexao) => excluirProdutoNaConexao(conexao, idItem, usuarioId));
}

export { emTransacao };
