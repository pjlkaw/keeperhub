import db from '../db.js';

export const MODULOS_VALIDOS = new Set([
  'financas',
  'despensa',
  'pets',
  'medicamentos',
]);

const CATALOGO_MODULOS = [
  ['financas', 'Finanças'],
  ['despensa', 'Despensa'],
  ['pets', 'Pets'],
  ['medicamentos', 'Medicamentos'],
];

async function garantirCatalogoModulos(executor = db) {
  for (const [codigo, nome] of CATALOGO_MODULOS) {
    await executor.query(
      `INSERT INTO modulo (codigo, nome, ativo) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE nome = VALUES(nome)`,
      [codigo, nome]
    );
  }
}

export async function listarAcessosUsuario(usuarioId, executor = db) {
  await garantirCatalogoModulos(executor);
  await desativarTestesExpirados(usuarioId, executor);
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

async function desativarTestesExpirados(usuarioId, executor = db) {
  await executor.query(
    `UPDATE usuario_modulo
     SET status = 'inativo'
     WHERE usuario_id = ? AND origem = 'teste' AND status = 'ativo'
       AND expira_em IS NOT NULL AND expira_em <= NOW()`,
    [usuarioId]
  );
}

export async function usuarioTemAcesso(usuarioId, codigo) {
  if (!MODULOS_VALIDOS.has(codigo)) return false;
  await garantirCatalogoModulos();
  await desativarTestesExpirados(usuarioId);
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
    await garantirCatalogoModulos(conexao);
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

export async function ativarTesteGratis(usuarioId) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    await garantirCatalogoModulos(conexao);
    await desativarTestesExpirados(usuarioId, conexao);

    const [testes] = await conexao.query(
      `SELECT COUNT(*) AS quantidade, MAX(expira_em) > NOW() AS vigente
       FROM usuario_modulo WHERE usuario_id = ? AND origem = 'teste'`,
      [usuarioId]
    );
    if (Number(testes[0]?.quantidade) > 0) {
      if (!testes[0]?.vigente) {
        await conexao.commit();
        return { expirado: true, modulos: [] };
      }
      await conexao.commit();
      return { expirado: false, modulos: await listarAcessosUsuario(usuarioId) };
    }

    for (const codigo of MODULOS_VALIDOS) {
      await conexao.query(
        `INSERT INTO usuario_modulo
           (usuario_id, modulo_id, periodo, status, origem, expira_em)
         SELECT ?, m.id_modulo, 'mensal', 'ativo', 'teste', DATE_ADD(NOW(), INTERVAL 30 DAY)
         FROM modulo m
         WHERE m.codigo = ? AND m.ativo = 1
           AND NOT EXISTS (
             SELECT 1 FROM usuario_modulo um
             WHERE um.usuario_id = ? AND um.modulo_id = m.id_modulo
           )`,
        [usuarioId, codigo, usuarioId]
      );
    }
    await conexao.commit();
    return { expirado: false, modulos: await listarAcessosUsuario(usuarioId) };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

