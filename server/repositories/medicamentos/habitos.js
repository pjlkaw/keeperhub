import db from '../../db.js';

function mapearHabito(linha, conclusoes = []) {
  return {
    id: String(linha.id),
    nome: linha.nome,
    frequencia: linha.frequencia,
    meta: Number(linha.meta),
    unidade: linha.unidade,
    conclusoes,
  };
}

export async function listarHabitos(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT id_habito AS id, nome, frequencia, meta, unidade
       FROM habito
      WHERE usuario_id = ? AND ativo = 1
      ORDER BY id_habito DESC`,
    [usuarioId],
  );
  if (!linhas.length) return [];

  const ids = linhas.map((linha) => linha.id);
  const marcadores = ids.map(() => '?').join(', ');
  const [registros] = await db.execute(
    `SELECT habito_id AS habitoId, data_conclusao AS data
       FROM habito_conclusao
      WHERE habito_id IN (${marcadores})
      ORDER BY data_conclusao`,
    ids,
  );
  const conclusoes = new Map();
  registros.forEach((registro) => {
    const lista = conclusoes.get(registro.habitoId) || [];
    lista.push(registro.data instanceof Date ? registro.data.toISOString().slice(0, 10) : String(registro.data).slice(0, 10));
    conclusoes.set(registro.habitoId, lista);
  });
  return linhas.map((linha) => mapearHabito(linha, conclusoes.get(linha.id) || []));
}

export async function criarHabito(usuarioId, dados) {
  const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
  const frequencia = typeof dados.frequencia === 'string' ? dados.frequencia.trim() : '';
  const unidade = typeof dados.unidade === 'string' ? dados.unidade.trim() : '';
  const meta = Number(dados.meta);
  if (!nome || nome.length > 120 || !frequencia || frequencia.length > 80 ||
      !unidade || unidade.length > 40 || !Number.isInteger(meta) || meta < 1) {
    const erro = new Error('Confira os dados do hábito.');
    erro.statusCode = 400;
    throw erro;
  }

  const [resultado] = await db.execute(
    `INSERT INTO habito (usuario_id, nome, frequencia, meta, unidade)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, nome, frequencia, meta, unidade],
  );
  return listarHabitos(usuarioId).then((habitos) =>
    habitos.find((habito) => habito.id === String(resultado.insertId)));
}

export async function alternarConclusaoHabito(usuarioId, habitoId, data) {
  const [habitos] = await db.execute(
    'SELECT id_habito FROM habito WHERE id_habito = ? AND usuario_id = ? AND ativo = 1',
    [habitoId, usuarioId],
  );
  if (!habitos.length) return null;

  const [existente] = await db.execute(
    'SELECT habito_id FROM habito_conclusao WHERE habito_id = ? AND data_conclusao = ?',
    [habitoId, data],
  );
  if (existente.length) {
    await db.execute(
      'DELETE FROM habito_conclusao WHERE habito_id = ? AND data_conclusao = ?',
      [habitoId, data],
    );
  } else {
    await db.execute(
      'INSERT INTO habito_conclusao (habito_id, data_conclusao) VALUES (?, ?)',
      [habitoId, data],
    );
  }
  return listarHabitos(usuarioId);
}
