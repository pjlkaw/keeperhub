// Consultas SQL das consultas veterinárias: listar, cadastrar, lembrete e histórico do usuário autenticado.
import db from '../../db.js';

// Códigos usados pela tela de consultas. Outros textos são especialidades personalizadas ("outra").
export const CODIGOS_ESPECIALIDADE = [
  'clinico_geral', 'dermatologista', 'cardiologista',
  'oftalmologista', 'ortopedista', 'odontologista',
];

function pad(numero) {
  return String(numero).padStart(2, '0');
}

// O mysql2 cria datas no fuso local do servidor; por isso usamos os getters locais.
function partesDataHora(valor) {
  if (!valor) return { data: '', horario: '' };
  if (valor instanceof Date) {
    return {
      data: `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`,
      horario: `${pad(valor.getHours())}:${pad(valor.getMinutes())}`,
    };
  }
  const texto = String(valor);
  return { data: texto.slice(0, 10), horario: texto.slice(11, 16) };
}

function dataHoraISO(valor) {
  if (!valor) return '';
  return valor instanceof Date ? valor.toISOString() : String(valor);
}

// Converte a linha do banco para o formato que consultas.js já usa.
export function mapearConsulta(linha) {
  const { data, horario } = partesDataHora(linha.dataHora);
  const codigo = CODIGOS_ESPECIALIDADE.includes(linha.especialidade);
  const realizadaEm = dataHoraISO(linha.realizadaEm);
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    medico: linha.veterinario || '',
    especialidade: codigo ? linha.especialidade : 'outra',
    especialidadePersonalizada: codigo ? '' : (linha.especialidade || ''),
    clinica: linha.clinica || '',
    data,
    horario,
    lembrar: Boolean(linha.lembrete),
    status: linha.status === 'realizada' ? 'realizada' : 'agendada',
    resumo: linha.observacoes || '',
    ...(realizadaEm ? { realizadaEm } : {}),
  };
}

const SELECT_CONSULTA = `
  SELECT c.id_consulta AS id, c.pet_id AS petId, c.data AS dataHora, c.status,
         c.realizada_em AS realizadaEm, c.veterinario, c.especialidade,
         c.clinica, c.lembrete_ativo AS lembrete, c.observacoes
    FROM consulta c
    JOIN pet p ON p.id_pet = c.pet_id
`;

// Consultas de todos os pets ativos do usuário, agrupadas pelo id do pet.
export async function listarConsultasPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `${SELECT_CONSULTA} WHERE p.usuario_id = ? AND p.ativo = 1 ORDER BY c.data, c.id_consulta`,
    [usuarioId]
  );

  const porPet = new Map();
  for (const linha of linhas) {
    const consulta = mapearConsulta(linha);
    const lista = porPet.get(consulta.petId) || [];
    lista.push(consulta);
    porPet.set(consulta.petId, lista);
  }
  return porPet;
}

async function buscarConsulta(idConsulta, usuarioId) {
  const [linhas] = await db.execute(
    `${SELECT_CONSULTA} WHERE c.id_consulta = ? AND p.usuario_id = ? AND p.ativo = 1 LIMIT 1`,
    [idConsulta, usuarioId]
  );
  return linhas[0] ? mapearConsulta(linhas[0]) : null;
}

// Grava a mesma consulta para um ou vários pets numa transação.
// Retorna null se algum pet não pertencer ao usuário.
export async function cadastrarConsulta(usuarioId, petIds, dados) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    const marcadores = petIds.map(() => '?').join(', ');
    const [pets] = await conexao.execute(
      `SELECT id_pet FROM pet
        WHERE usuario_id = ? AND ativo = 1 AND id_pet IN (${marcadores})`,
      [usuarioId, ...petIds]
    );
    if (pets.length !== petIds.length) {
      await conexao.rollback();
      return null;
    }

    const criados = [];
    for (const petId of petIds) {
      const [resultado] = await conexao.execute(
        `INSERT INTO consulta
          (pet_id, data, status, realizada_em, veterinario, especialidade, clinica, lembrete_ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          petId, `${dados.data} ${dados.horario}:00`, dados.status,
          dados.status === 'realizada' ? new Date() : null,
          dados.medico, dados.especialidade, dados.clinica, dados.lembrar ? 1 : 0,
        ]
      );
      criados.push(String(resultado.insertId));
    }

    const consultasPorPet = await listarConsultasPorPet(usuarioId, conexao);
    await conexao.commit();
    return { consultasPorPet, criados };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// Liga ou desliga o lembrete de uma consulta do usuário.
export async function alterarLembreteConsulta(idConsulta, usuarioId, lembrar) {
  await db.execute(
    `UPDATE consulta c
       JOIN pet p ON p.id_pet = c.pet_id
        SET c.lembrete_ativo = ?
      WHERE c.id_consulta = ? AND p.usuario_id = ? AND p.ativo = 1`,
    [lembrar ? 1 : 0, idConsulta, usuarioId]
  );
  // A busca também filtra pelo dono: consulta de outro usuário volta null.
  return buscarConsulta(idConsulta, usuarioId);
}

// Move a consulta para o histórico, guardando o resumo do atendimento.
export async function registrarConsultaRealizada(idConsulta, usuarioId, resumo) {
  await db.execute(
    `UPDATE consulta c
       JOIN pet p ON p.id_pet = c.pet_id
        SET c.status = 'realizada', c.realizada_em = NOW(), c.observacoes = ?
      WHERE c.id_consulta = ? AND p.usuario_id = ? AND p.ativo = 1`,
    [resumo || null, idConsulta, usuarioId]
  );
  // A busca também filtra pelo dono: consulta de outro usuário volta null.
  return buscarConsulta(idConsulta, usuarioId);
}

// Conclui os registros do card juntos, depois de verificar todos os IDs.
export async function registrarConsultasRealizadas(ids, usuarioId, resumo) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const marcadores = ids.map(() => '?').join(', ');
    const filtro = `p.usuario_id = ? AND p.ativo = 1 AND c.id_consulta IN (${marcadores})`;
    const parametros = [usuarioId, ...ids];
    const [consultas] = await conexao.execute(
      `SELECT c.id_consulta FROM consulta c
         JOIN pet p ON p.id_pet = c.pet_id
        WHERE ${filtro}
        FOR UPDATE`,
      parametros
    );
    if (consultas.length !== ids.length) {
      await conexao.rollback();
      return null;
    }

    await conexao.execute(
      `UPDATE consulta c
         JOIN pet p ON p.id_pet = c.pet_id
          SET c.status = 'realizada', c.realizada_em = NOW(), c.observacoes = ?
        WHERE ${filtro}`,
      [resumo || null, ...parametros]
    );
    const consultasPorPet = await listarConsultasPorPet(usuarioId, conexao);
    await conexao.commit();
    return consultasPorPet;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
