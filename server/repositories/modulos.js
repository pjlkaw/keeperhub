import db from '../db.js';

export const MODULOS_VALIDOS = new Set([
  'financas',
  'despensa',
  'pets',
  'medicamentos',
]);

export async function listarAcessosUsuario(usuarioId, executor = db) {
  const [rows] = await executor.query(
    `SELECT m.codigo, m.nome, um.periodo, um.status, um.origem, um.expira_em
     FROM usuario_modulo um
     INNER JOIN modulo m ON m.id_modulo = um.modulo_id
     WHERE um.usuario_id = ? AND um.status = 'ativo'
       AND um.origem IN ('teste', 'compra') AND m.ativo = 1
       AND (um.expira_em IS NULL OR um.expira_em > NOW())
     ORDER BY m.id_modulo`,
    [usuarioId]
  );
  return rows;
}

export async function usuarioTemAcesso(usuarioId, codigo) {
  if (!MODULOS_VALIDOS.has(codigo)) return false;
  const [rows] = await db.query(
    `SELECT 1
     FROM usuario_modulo um
     INNER JOIN modulo m ON m.id_modulo = um.modulo_id
     WHERE um.usuario_id = ? AND m.codigo = ? AND um.status = 'ativo'
       AND um.origem IN ('teste', 'compra') AND m.ativo = 1
       AND (um.expira_em IS NULL OR um.expira_em > NOW())
     LIMIT 1`,
    [usuarioId, codigo]
  );
  return rows.length > 0;
}

export async function salvarAcessosUsuario(usuarioId, codigos, periodo, origem = 'compra', conexaoExterna = null) {
  const propriaConexao = !conexaoExterna;
  const conexao = conexaoExterna || await db.getConnection();
  try {
    if (propriaConexao) await conexao.beginTransaction();
    for (const codigo of codigos) {
      await conexao.query(
        `INSERT INTO usuario_modulo
            (usuario_id, modulo_id, periodo, status, origem, expira_em)
         SELECT ?, id_modulo, ?, 'ativo', ?,
            IF(? = 'teste', DATE_ADD(NOW(), INTERVAL 30 DAY), NULL)
         FROM modulo
         WHERE codigo = ? AND ativo = 1
         ON DUPLICATE KEY UPDATE
            periodo = ?,
            status = 'ativo',
            origem = ?,
            expira_em = IF(? = 'teste', DATE_ADD(NOW(), INTERVAL 30 DAY), NULL)`,
        [usuarioId, periodo, origem, origem, codigo, periodo, origem, origem]
      );
    }
    if (propriaConexao) await conexao.commit();
  } catch (erro) {
    if (propriaConexao) await conexao.rollback();
    throw erro;
  } finally {
    if (propriaConexao) conexao.release();
  }
  return listarAcessosUsuario(usuarioId, propriaConexao ? db : conexao);
}

