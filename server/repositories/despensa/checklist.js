// Consultas SQL dos itens de checklist da despensa: listar e administrar itens
// do usuário autenticado.
//
// Cada usuário tem uma lista_compras "Minha lista" (criada na primeira vez).
// Os itens ficam em item_lista. Quando um item é marcado como comprado, vira um
// produto da despensa e o id dele fica guardado em item_lista.item_id.
import db from '../../db.js';
import {
  criarProdutoNaConexao,
  emTransacao,
  excluirProdutoNaConexao,
} from './produtos.js';

const NOME_LISTA = 'Minha lista';

function mapearItem(linha) {
  return {
    id: String(linha.id),
    nome: linha.nome,
    quantidade: Number(linha.quantidade || 1),
    categoria: linha.categoria || 'Outros',
    comprado: Boolean(Number(linha.comprado)),
    produtoId: linha.produtoId == null ? null : String(linha.produtoId),
  };
}

async function obterListaId(usuarioId, executor = db) {
  const [listas] = await executor.execute(
    `SELECT id_lista FROM lista_compras
      WHERE usuario_id = ? AND status = 'aberta'
      ORDER BY id_lista LIMIT 1`,
    [usuarioId]
  );
  if (listas[0]) return listas[0].id_lista;

  const [nova] = await executor.execute(
    `INSERT INTO lista_compras (usuario_id, nome, tipo, status)
     VALUES (?, ?, 'compras', 'aberta')`,
    [usuarioId, NOME_LISTA]
  );
  return nova.insertId;
}

const SELECT_ITENS = `
  SELECT il.id_item_lista AS id, il.descricao AS nome, il.quantidade,
         il.categoria, il.comprado, il.item_id AS produtoId
    FROM item_lista il
    JOIN lista_compras lc ON lc.id_lista = il.lista_id
   WHERE lc.usuario_id = ?`;

export async function listarItens(usuarioId) {
  const listaId = await obterListaId(usuarioId);
  const [linhas] = await db.execute(
    `${SELECT_ITENS} AND lc.id_lista = ? ORDER BY il.id_item_lista`,
    [usuarioId, listaId]
  );
  return linhas.map(mapearItem);
}

async function buscarItem(idItemLista, usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `${SELECT_ITENS} AND il.id_item_lista = ? LIMIT 1`,
    [usuarioId, idItemLista]
  );
  return linhas[0] ? mapearItem(linhas[0]) : null;
}

export async function adicionarItem(usuarioId, dados) {
  const listaId = await obterListaId(usuarioId);
  const [resultado] = await db.execute(
    `INSERT INTO item_lista (lista_id, descricao, categoria, quantidade, comprado)
     VALUES (?, ?, ?, ?, 0)`,
    [listaId, dados.nome, dados.categoria, dados.quantidade]
  );
  return buscarItem(resultado.insertId, usuarioId);
}

// Marca/desmarca como comprado. Marcar cria o produto na despensa;
// desmarcar apaga o produto que esse item tinha criado.
export async function marcarComprado(usuarioId, idItemLista, comprado) {
  const alterou = await emTransacao(async (conexao) => {
    const [linhas] = await conexao.execute(
      `SELECT il.id_item_lista, il.descricao, il.quantidade, il.categoria,
              il.comprado, il.item_id
         FROM item_lista il
         JOIN lista_compras lc ON lc.id_lista = il.lista_id
        WHERE il.id_item_lista = ? AND lc.usuario_id = ?
        FOR UPDATE`,
      [idItemLista, usuarioId]
    );
    const item = linhas[0];
    if (!item) return false;

    const jaComprado = Boolean(Number(item.comprado));
    if (comprado && !jaComprado) {
      const produtoId = await criarProdutoNaConexao(conexao, usuarioId, {
        nome: item.descricao,
        categoria: item.categoria,
        quantidade: Number(item.quantidade) || 1,
        validade: '',
        observacao: 'Comprado pela checklist',
      });
      await conexao.execute(
        'UPDATE item_lista SET comprado = 1, item_id = ? WHERE id_item_lista = ?',
        [produtoId, idItemLista]
      );
    } else if (!comprado && jaComprado) {
      if (item.item_id) {
        await excluirProdutoNaConexao(conexao, item.item_id, usuarioId);
      }
      await conexao.execute(
        'UPDATE item_lista SET comprado = 0, item_id = NULL WHERE id_item_lista = ?',
        [idItemLista]
      );
    }
    return true;
  });
  return alterou ? buscarItem(idItemLista, usuarioId) : null;
}

// Remover da lista não apaga o produto já comprado.
export async function removerItem(usuarioId, idItemLista) {
  const [resultado] = await db.execute(
    `DELETE il FROM item_lista il
       JOIN lista_compras lc ON lc.id_lista = il.lista_id
      WHERE il.id_item_lista = ? AND lc.usuario_id = ?`,
    [idItemLista, usuarioId]
  );
  return resultado.affectedRows > 0;
}

export async function limparLista(usuarioId) {
  await db.execute(
    `DELETE il FROM item_lista il
       JOIN lista_compras lc ON lc.id_lista = il.lista_id
      WHERE lc.usuario_id = ?`,
    [usuarioId]
  );
}
