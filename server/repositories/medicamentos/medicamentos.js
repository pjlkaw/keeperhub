import db from '../../db.js';

const COLUNAS = `
  m.id_medicamento AS id,
  i.id_item AS itemId,
  i.nome,
  i.ativo,
  m.concentracao,
  m.unidade_estoque AS unidade,
  m.tipo_uso AS tipoUso,
  r.id_rotina AS rotinaId,
  r.descricao_dose AS dose,
  r.tipo_frequencia AS tipoFrequencia,
  r.intervalo_horas AS intervaloHorasBanco,
  r.data_inicio AS dataInicio,
  r.data_fim AS dataFim,
  (SELECT COALESCE(SUM(l.quantidade), 0) FROM lote l WHERE l.item_id = i.id_item) AS quantidade,
  (SELECT COUNT(*) FROM lote l WHERE l.item_id = i.id_item) AS lotesCadastrados,
  (SELECT COALESCE(
      MIN(CASE WHEN l.validade >= CURRENT_DATE THEN l.validade END),
      MAX(l.validade)
    ) FROM lote l WHERE l.item_id = i.id_item) AS validade
`;

const RELACOES = `
  FROM medicamento m
  JOIN item i ON i.id_item = m.item_id
  LEFT JOIN rotina r ON r.id_rotina = (
    SELECT MAX(r2.id_rotina) FROM rotina r2 WHERE r2.medicamento_id = m.id_medicamento
  )
`;

const DIAS_PARA_BANCO = { dom: 1, seg: 2, ter: 3, qua: 4, qui: 5, sex: 6, sab: 7 };
const DIAS_DO_BANCO = Object.fromEntries(Object.entries(DIAS_PARA_BANCO).map(([dia, numero]) => [numero, dia]));

function dataParaTexto(valor) {
  if (!valor) return '';
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

function mapearMedicamento(linha, dias = [], horarios = []) {
  const frequencia = {
    diaria: 'diario',
    dias_semana: 'especifico',
    intervalo_horas: 'intervalo',
    eventual: 'diario',
  }[linha.tipoFrequencia] || 'diario';

  const dataFim = dataParaTexto(linha.dataFim);
  const tratamentoEncerrado = Boolean(dataFim && dataFim <= new Date().toISOString().slice(0, 10));

  return {
    id: String(linha.id),
    itemId: Number(linha.itemId),
    nome: linha.nome,
    concentracao: linha.concentracao || '',
    unidade: linha.unidade,
    tipoUso: linha.tipoUso,
    status: linha.ativo && !tratamentoEncerrado ? 'ativo' : 'encerrado',
    dose: linha.dose || '',
    frequencia,
    intervaloHoras: linha.intervaloHorasBanco == null ? '' : String(linha.intervaloHorasBanco),
    dataInicio: dataParaTexto(linha.dataInicio),
    dataFim,
    dias,
    horarios,
    quantidade: Number(linha.quantidade || 0),
    estoqueCadastrado: Number(linha.lotesCadastrados || 0) > 0,
    validade: dataParaTexto(linha.validade),
  };
}

async function completarRotinas(linhas, executar = db.execute.bind(db)) {
  const rotinaIds = linhas.map((linha) => linha.rotinaId).filter(Boolean);
  if (!rotinaIds.length) return linhas.map((linha) => mapearMedicamento(linha));

  const marcadores = rotinaIds.map(() => '?').join(', ');
  const [horarios] = await executar(
    `SELECT rotina_id AS rotinaId, TIME_FORMAT(hora, '%H:%i') AS hora
       FROM horario WHERE rotina_id IN (${marcadores}) ORDER BY hora`,
    rotinaIds
  );
  const [dias] = await executar(
    `SELECT rotina_id AS rotinaId, dia_semana AS dia
       FROM rotina_dia_semana WHERE rotina_id IN (${marcadores}) ORDER BY dia_semana`,
    rotinaIds
  );

  const horariosPorRotina = new Map();
  for (const registro of horarios) {
    const lista = horariosPorRotina.get(registro.rotinaId) || [];
    lista.push(registro.hora);
    horariosPorRotina.set(registro.rotinaId, lista);
  }
  const diasPorRotina = new Map();
  for (const registro of dias) {
    const lista = diasPorRotina.get(registro.rotinaId) || [];
    const dia = DIAS_DO_BANCO[Number(registro.dia)];
    if (dia) lista.push(dia);
    diasPorRotina.set(registro.rotinaId, lista);
  }

  return linhas.map((linha) => mapearMedicamento(
    linha,
    diasPorRotina.get(linha.rotinaId) || [],
    horariosPorRotina.get(linha.rotinaId) || []
  ));
}

async function consultarMedicamentos(condicao, valores) {
  const [linhas] = await db.execute(
    `SELECT ${COLUNAS} ${RELACOES} WHERE ${condicao} ORDER BY i.nome`,
    valores
  );
  return completarRotinas(linhas);
}

export async function listarMedicamentos(usuarioId) {
  return consultarMedicamentos(
    "i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1",
    [usuarioId]
  );
}

export async function buscarMedicamento(idMedicamento, usuarioId) {
  const medicamentos = await consultarMedicamentos(
    "m.id_medicamento = ? AND i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1",
    [idMedicamento, usuarioId]
  );
  return medicamentos[0] ?? null;
}

function tipoFrequenciaBanco(dados) {
  if (dados.tipoUso === 'eventual') return 'eventual';
  if (dados.frequencia === 'intervalo') return 'intervalo_horas';
  if (dados.frequencia === 'especifico') return 'dias_semana';
  return 'diaria';
}

async function salvarRotina(conexao, idMedicamento, dados) {
  const tipoFrequencia = tipoFrequenciaBanco(dados);
  const intervalo = tipoFrequencia === 'intervalo_horas' ? Number(dados.intervaloHoras) : null;
  const [existentes] = await conexao.execute(
    `SELECT id_rotina FROM rotina WHERE medicamento_id = ? ORDER BY id_rotina DESC LIMIT 1 FOR UPDATE`,
    [idMedicamento]
  );
  let rotinaId = existentes[0]?.id_rotina;

  if (rotinaId) {
    await conexao.execute(
      `UPDATE rotina
          SET descricao_dose = ?, tipo_frequencia = ?, intervalo_horas = ?,
              data_inicio = ?, data_fim = ?
        WHERE id_rotina = ?`,
      [dados.dose || null, tipoFrequencia, intervalo, dados.dataInicio || null,
        dados.dataFim || null, rotinaId]
    );
  } else {
    const [resultado] = await conexao.execute(
      `INSERT INTO rotina
        (medicamento_id, descricao_dose, tipo_frequencia, intervalo_horas,
         data_inicio, data_fim)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idMedicamento, dados.dose || null, tipoFrequencia, intervalo,
        dados.dataInicio || null, dados.dataFim || null]
    );
    rotinaId = resultado.insertId;
  }

  await conexao.execute('DELETE FROM rotina_dia_semana WHERE rotina_id = ?', [rotinaId]);
  await conexao.execute('DELETE FROM horario WHERE rotina_id = ?', [rotinaId]);

  if (tipoFrequencia === 'dias_semana') {
    for (const dia of dados.dias) {
      await conexao.execute(
        'INSERT INTO rotina_dia_semana (rotina_id, dia_semana) VALUES (?, ?)',
        [rotinaId, DIAS_PARA_BANCO[dia]]
      );
    }
  }
  if (tipoFrequencia !== 'eventual') {
    for (const horario of dados.horarios) {
      await conexao.execute('INSERT INTO horario (rotina_id, hora) VALUES (?, ?)', [rotinaId, horario]);
    }
  }
}

async function salvarEstoqueInicial(conexao, itemId, dados) {
  const quantidade = Number(dados.quantidadeInicial || 0);
  const validade = dados.validade || null;
  if (quantidade <= 0 && !validade) return;

  const [lote] = await conexao.execute(
    'INSERT INTO lote (item_id, quantidade, validade) VALUES (?, ?, ?)',
    [itemId, quantidade, validade]
  );
  if (quantidade > 0) {
    await conexao.execute(
      "INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao) VALUES (?, 'entrada', ?, ?)",
      [lote.insertId, quantidade, 'Estoque inicial']
    );
  }
}

export async function criarMedicamento(usuarioId, dados) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const [item] = await conexao.execute(
      `INSERT INTO item (usuario_id, nome, tipo_item, ativo)
       VALUES (?, ?, 'medicamento', 1)`,
      [usuarioId, dados.nome]
    );
    const [medicamento] = await conexao.execute(
      `INSERT INTO medicamento (item_id, unidade_estoque, concentracao, tipo_uso)
       VALUES (?, ?, ?, ?)`,
      [item.insertId, dados.unidade, dados.concentracao || null, dados.tipoUso]
    );
    await salvarRotina(conexao, medicamento.insertId, dados);
    await salvarEstoqueInicial(conexao, item.insertId, dados);
    await conexao.commit();
    return buscarMedicamento(medicamento.insertId, usuarioId);
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function atualizarMedicamento(idMedicamento, usuarioId, dados) {
  const existente = await buscarMedicamento(idMedicamento, usuarioId);
  if (!existente) return null;

  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    await conexao.execute(
      `UPDATE item SET nome = ?
        WHERE id_item = ? AND usuario_id = ? AND tipo_item = 'medicamento' AND ativo = 1`,
      [dados.nome, existente.itemId, usuarioId]
    );
    await conexao.execute(
      `UPDATE medicamento SET unidade_estoque = ?, concentracao = ?, tipo_uso = ?
        WHERE id_medicamento = ?`,
      [dados.unidade, dados.concentracao || null, dados.tipoUso, idMedicamento]
    );
    await salvarRotina(conexao, Number(idMedicamento), dados);
    await conexao.commit();
    return buscarMedicamento(idMedicamento, usuarioId);
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function registrarEntradaEstoque(idMedicamento, usuarioId, quantidade, validade) {
  const medicamento = await buscarMedicamento(idMedicamento, usuarioId);
  if (!medicamento) return null;

  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const [lote] = await conexao.execute(
      'INSERT INTO lote (item_id, quantidade, validade) VALUES (?, ?, ?)',
      [medicamento.itemId, quantidade, validade || null]
    );
    await conexao.execute(
      "INSERT INTO movimentacao (lote_id, tipo, quantidade, observacao) VALUES (?, 'entrada', ?, ?)",
      [lote.insertId, quantidade, 'Reposição de estoque']
    );
    await conexao.commit();
    return buscarMedicamento(idMedicamento, usuarioId);
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

export async function encerrarTratamento(idMedicamento, usuarioId) {
  const medicamento = await buscarMedicamento(idMedicamento, usuarioId);
  if (!medicamento?.itemId || !medicamento.rotinaId) return null;

  await db.execute(
    'UPDATE rotina SET data_fim = CURRENT_DATE WHERE id_rotina = ?',
    [medicamento.rotinaId]
  );
  return buscarMedicamento(idMedicamento, usuarioId);
}

export async function listarMovimentacoesEstoque(idMedicamento, usuarioId) {
  const [linhas] = await db.execute(
    `SELECT mov.id_movimentacao AS id, mov.tipo, mov.quantidade, mov.data, mov.observacao,
            med.id_medicamento AS medicamentoId, i.nome, med.concentracao, med.unidade_estoque AS unidade
       FROM movimentacao mov
       JOIN lote l ON l.id_lote = mov.lote_id
       JOIN item i ON i.id_item = l.item_id
       JOIN medicamento med ON med.item_id = i.id_item
      WHERE med.id_medicamento = ? AND i.usuario_id = ?
        AND i.tipo_item = 'medicamento' AND i.ativo = 1
      ORDER BY mov.data DESC, mov.id_movimentacao DESC
      LIMIT 30`,
    [idMedicamento, usuarioId]
  );
  return linhas.map((linha) => ({
    ...linha,
    id: String(linha.id),
    medicamentoId: String(linha.medicamentoId),
    quantidade: Number(linha.quantidade),
    data: linha.data instanceof Date ? linha.data.toISOString() : String(linha.data),
    medicamento: [linha.nome, linha.concentracao].filter(Boolean).join(' '),
  }));
}

export async function listarHistoricoEstoque(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT mov.id_movimentacao AS id, mov.tipo, mov.quantidade, mov.data, mov.observacao,
            med.id_medicamento AS medicamentoId, i.nome, med.concentracao, med.unidade_estoque AS unidade
       FROM movimentacao mov
       JOIN lote l ON l.id_lote = mov.lote_id
       JOIN item i ON i.id_item = l.item_id
       JOIN medicamento med ON med.item_id = i.id_item
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1
      ORDER BY mov.data DESC, mov.id_movimentacao DESC
      LIMIT 100`,
    [usuarioId]
  );
  return linhas.map((linha) => ({
    ...linha,
    id: String(linha.id),
    medicamentoId: String(linha.medicamentoId),
    quantidade: Number(linha.quantidade),
    data: linha.data instanceof Date ? linha.data.toISOString() : String(linha.data),
    medicamento: [linha.nome, linha.concentracao].filter(Boolean).join(' '),
  }));
}

export async function listarRegistrosUso(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT u.id_registro AS id, u.medicamento_id AS medicamentoId,
            i.nome, m.concentracao, DATE_FORMAT(u.data, '%Y-%m-%d') AS data,
            TIME_FORMAT(u.horario_previsto, '%H:%i') AS horario,
            TIME_FORMAT(u.horario_realizado, '%H:%i') AS horarioRealizado,
            u.data_hora_realizada AS tomadaEm, u.dose_realizada AS dose,
            u.tipo_uso AS tipoUso, u.status, u.observacao
       FROM registro_uso u
       JOIN medicamento m ON m.id_medicamento = u.medicamento_id
       JOIN item i ON i.id_item = m.item_id
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento' AND i.ativo = 1
      ORDER BY u.data DESC, COALESCE(u.horario_previsto, u.horario_realizado) DESC, u.id_registro DESC
      LIMIT 500`,
    [usuarioId]
  );
  return linhas.map((linha) => ({
    ...linha,
    id: String(linha.id),
    medicamentoId: String(linha.medicamentoId),
    data: linha.data,
    tomadaEm: linha.tomadaEm instanceof Date ? linha.tomadaEm.toISOString() : linha.tomadaEm,
    medicamento: [linha.nome, linha.concentracao].filter(Boolean).join(' '),
  }));
}

export async function salvarRegistroUso(usuarioId, dados) {
  const medicamento = await buscarMedicamento(dados.medicamentoId, usuarioId);
  if (!medicamento) return null;

  const statusBanco = dados.status === 'tomada' ? 'tomado' : 'perdido';
  const horarioPrevisto = dados.tipoUso === 'rotina' ? dados.horario || null : null;
  const rotinaId = dados.tipoUso === 'rotina' ? medicamento.rotinaId || null : null;
  const horarioRealizado = dados.tipoUso === 'eventual' ? dados.horario || null : null;
  const dataHoraRealizada = dados.tipoUso === 'eventual' && dados.horario
    ? `${dados.data} ${dados.horario}:00`
    : null;
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    let registroId = null;
    if (dados.tipoUso === 'rotina') {
      const [registros] = await conexao.execute(
        `SELECT id_registro FROM registro_uso
          WHERE medicamento_id = ? AND data = ?
            AND horario_previsto <=> ? AND tipo_uso = 'rotina'
          ORDER BY id_registro DESC LIMIT 1 FOR UPDATE`,
        [dados.medicamentoId, dados.data, horarioPrevisto]
      );
      registroId = registros[0]?.id_registro ?? null;
    }

    if (registroId) {
      await conexao.execute(
        `UPDATE registro_uso
            SET rotina_id = ?, status = ?, dose_realizada = ?, observacao = ?,
                horario_realizado = IF(? = 'tomado', COALESCE(?, CURRENT_TIME()), NULL),
                data_hora_realizada = IF(? = 'tomado', COALESCE(?, CURRENT_TIMESTAMP()), NULL)
          WHERE id_registro = ?`,
        [rotinaId, statusBanco, dados.dose || null, dados.observacao || null,
        statusBanco, horarioRealizado, statusBanco, dataHoraRealizada, registroId]
      );
    } else {
      await conexao.execute(
        `INSERT INTO registro_uso
          (medicamento_id, rotina_id, data, horario_previsto, horario_realizado,
           data_hora_realizada, dose_realizada, tipo_uso, status, observacao)
         VALUES (?, ?, ?, ?, IF(? = 'tomado', COALESCE(?, CURRENT_TIME()), NULL),
                 IF(? = 'tomado', COALESCE(?, CURRENT_TIMESTAMP()), NULL), ?, ?, ?, ?)`,
        [dados.medicamentoId, rotinaId, dados.data, horarioPrevisto,
          statusBanco, horarioRealizado, statusBanco, dataHoraRealizada,
          dados.dose || null, dados.tipoUso,
          statusBanco, dados.observacao || null]
      );
    }
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }

  return listarRegistrosUso(usuarioId);
}

export async function excluirMedicamento(idMedicamento, usuarioId) {
  const medicamento = await buscarMedicamento(idMedicamento, usuarioId);
  if (!medicamento) return false;
  const [resultado] = await db.execute(
    `UPDATE item SET ativo = 0
      WHERE id_item = ? AND usuario_id = ? AND tipo_item = 'medicamento' AND ativo = 1`,
    [medicamento.itemId, usuarioId]
  );
  return resultado.affectedRows === 1;
}
