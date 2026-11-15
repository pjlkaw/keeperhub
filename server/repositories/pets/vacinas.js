// Consultas SQL de vacinação dos pets: listar e cadastrar vacinas do usuário autenticado.
import { randomUUID } from 'node:crypto';
import db from '../../db.js';
import { emTransacao } from './transacao.js';

// Códigos usados pela tela de vacinas. Outros nomes são vacinas personalizadas ("outra").
export const CODIGOS_VACINA = [
  'v8', 'v10', 'antirrabica', 'influenza', 'giardia', 'tetano', 'v3', 'v4', 'v5',
  'encefalomielite', 'garrotilho', 'rinopneumonite', 'erisipela_suina', 'leptospirose',
];

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

// Converte a linha do banco para o formato que vacinacoes.js já usa.
export function mapearVacina(linha) {
  const data = dataParaTexto(linha.dataAplicacao);
  const agendada = linha.status === 'agendada';
  const codigo = CODIGOS_VACINA.includes(linha.nome);
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    ...(linha.grupoId ? { grupoId: String(linha.grupoId) } : {}),
    nome: codigo ? linha.nome : 'outra',
    nomePersonalizado: codigo ? '' : linha.nome,
    status: agendada ? 'agendada' : 'aplicada',
    dataAplicacao: agendada ? '' : data,
    dataAgendada: agendada ? data : '',
    frequencia: linha.frequencia,
    proximaDose: dataParaTexto(linha.dataProximaDose),
    clinica: linha.clinica || '',
    horario: linha.horario ? String(linha.horario).slice(0, 5) : '',
    observacao: linha.observacao || '',
  };
}

// Vacinas de todos os pets ativos do usuário, agrupadas pelo id do pet.
export async function listarVacinasPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `SELECT v.id_vacina AS id, v.pet_id AS petId, v.grupo_id AS grupoId, v.nome, v.status,
            v.data_aplicacao AS dataAplicacao, v.frequencia,
            v.data_proxima_dose AS dataProximaDose, v.clinica,
            v.horario, v.observacao
       FROM vacina v
       JOIN pet p ON p.id_pet = v.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1
      ORDER BY v.data_aplicacao, v.id_vacina`,
    [usuarioId]
  );

  const porPet = new Map();
  for (const linha of linhas) {
    const vacina = mapearVacina(linha);
    const lista = porPet.get(vacina.petId) || [];
    lista.push(vacina);
    porPet.set(vacina.petId, lista);
  }
  return porPet;
}

// Grava a mesma vacina para um ou vários pets numa transação.
// Retorna null se algum pet não pertencer ao usuário.
export async function cadastrarVacina(usuarioId, petIds, dados) {
  return emTransacao(async conexao => {

    const marcadores = petIds.map(() => '?').join(', ');
    const [pets] = await conexao.execute(
      `SELECT id_pet FROM pet
        WHERE usuario_id = ? AND ativo = 1 AND id_pet IN (${marcadores})`,
      [usuarioId, ...petIds]
    );
    if (pets.length !== petIds.length) {
      return null;
    }

    const criados = [];
    const grupoId = petIds.length > 1 ? randomUUID() : null;
    for (const petId of petIds) {
      const [resultado] = await conexao.execute(
        `INSERT INTO vacina
          (pet_id, grupo_id, nome, status, data_aplicacao, frequencia,
           data_proxima_dose, clinica, horario, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          petId, grupoId, dados.nome, dados.status, dados.data, dados.frequencia,
          dados.proximaDose || null, dados.clinica || null,
          dados.horario || null, dados.observacao || null,
        ]
      );
      criados.push(String(resultado.insertId));
    }

    const vacinasPorPet = await listarVacinasPorPet(usuarioId, conexao);
    return { vacinasPorPet, criados };
  });
}

// Atualiza uma vacina e seus pets associados dentro de uma transação.
export async function atualizarVacinas(ids, petIdsOrigem, petIdsDestino, usuarioId, dados) {
  return emTransacao(async conexao => {
    const marcadores = ids.map(() => '?').join(', ');
    const [registros] = await conexao.execute(
      `SELECT v.id_vacina AS id, v.pet_id AS petId, v.grupo_id AS grupoId
         FROM vacina v
         JOIN pet p ON p.id_pet = v.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})
        FOR UPDATE`,
      [usuarioId, ...ids]
    );
    const petsPorId = new Map(registros.map(registro => [String(registro.id), String(registro.petId)]));
    if (registros.length !== ids.length || ids.some((id, indice) => petsPorId.get(String(id)) !== String(petIdsOrigem[indice]))) {
      return null;
    }

    const marcadoresDestino = petIdsDestino.map(() => '?').join(', ');
    const [petsDestino] = await conexao.execute(
      `SELECT id_pet FROM pet
        WHERE usuario_id = ? AND ativo = 1 AND id_pet IN (${marcadoresDestino})
        FOR UPDATE`,
      [usuarioId, ...petIdsDestino]
    );
    if (petsDestino.length !== petIdsDestino.length) {
      return null;
    }

    const registrosPorPet = new Map(registros.map(registro => [String(registro.petId), registro]));
    const petIdsDestinoSet = new Set(petIdsDestino.map(String));
    const grupoIds = [];
    const grupoId = petIdsDestino.length > 1 ? randomUUID() : null;
    for (const petId of petIdsDestino) {
      const existente = registrosPorPet.get(String(petId));
      if (!existente) {
        const [resultado] = await conexao.execute(
          `INSERT INTO vacina
            (pet_id, grupo_id, nome, status, data_aplicacao, frequencia,
             data_proxima_dose, clinica, horario, observacao)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            petId, grupoId, dados.nome, dados.status, dados.data, dados.frequencia,
            dados.proximaDose || null, dados.clinica || null,
            dados.horario || null, dados.observacao || null,
          ]
        );
        grupoIds.push(String(resultado.insertId));
        continue;
      }

      await conexao.execute(
        `UPDATE vacina v
           JOIN pet p ON p.id_pet = v.pet_id
            SET v.grupo_id = ?, v.nome = ?, v.status = ?, v.data_aplicacao = ?, v.frequencia = ?,
                v.data_proxima_dose = ?, v.clinica = ?, v.horario = ?, v.observacao = ?
          WHERE v.id_vacina = ? AND p.usuario_id = ? AND p.ativo = 1`,
        [
          grupoId, dados.nome, dados.status, dados.data, dados.frequencia,
          dados.proximaDose || null, dados.clinica || null,
          dados.horario || null, dados.observacao || null, existente.id, usuarioId,
        ]
      );
      grupoIds.push(String(existente.id));
    }

    for (const registro of registros) {
      if (!petIdsDestinoSet.has(String(registro.petId))) {
        await conexao.execute(
          `DELETE v FROM vacina v
             JOIN pet p ON p.id_pet = v.pet_id
            WHERE v.id_vacina = ? AND p.usuario_id = ? AND p.ativo = 1`,
          [registro.id, usuarioId]
        );
      }
    }

    const vacinasPorPet = await listarVacinasPorPet(usuarioId, conexao);
    return { vacinasPorPet, grupoIds };
  });
}

// Confirma em conjunto somente aplicações que ainda estão agendadas.
export async function marcarVacinasAplicadas(ids, usuarioId) {
  return emTransacao(async conexao => {
    const marcadores = ids.map(() => '?').join(', ');
    const [registros] = await conexao.execute(
      `SELECT v.id_vacina AS id, v.status
         FROM vacina v
         JOIN pet p ON p.id_pet = v.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})
        FOR UPDATE`,
      [usuarioId, ...ids]
    );
    if (registros.length !== ids.length || registros.some(registro => registro.status !== 'agendada')) {
      return null;
    }

    await conexao.execute(
      `UPDATE vacina v
         JOIN pet p ON p.id_pet = v.pet_id
          SET v.status = 'aplicada', v.data_aplicacao = CURDATE(),
              v.data_proxima_dose = CASE
                WHEN v.frequencia = 'reforco_anual' THEN DATE_ADD(CURDATE(), INTERVAL 1 YEAR)
                ELSE v.data_proxima_dose
              END
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})`,
      [usuarioId, ...ids]
    );
    const vacinasPorPet = await listarVacinasPorPet(usuarioId, conexao);
    return vacinasPorPet;
  });
}

// Restaura os dados de agendamento quando a pessoa desfaz a confirmação recente.
export async function desfazerVacinasAplicadas(ids, anteriores, usuarioId) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const marcadores = ids.map(() => '?').join(', ');
    const [registros] = await conexao.execute(
      `SELECT v.id_vacina AS id, v.status
         FROM vacina v
         JOIN pet p ON p.id_pet = v.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})
        FOR UPDATE`,
      [usuarioId, ...ids]
    );
    if (registros.length !== ids.length || registros.some(registro => registro.status !== 'aplicada')) {
      await conexao.rollback();
      return null;
    }

    for (const anterior of anteriores) {
      await conexao.execute(
        `UPDATE vacina v
           JOIN pet p ON p.id_pet = v.pet_id
            SET v.status = 'agendada', v.data_aplicacao = ?, v.data_proxima_dose = ?
          WHERE v.id_vacina = ? AND p.usuario_id = ? AND p.ativo = 1`,
        [anterior.dataAplicacao || null, anterior.proximaDose || null, anterior.id, usuarioId]
      );
    }

    const vacinasPorPet = await listarVacinasPorPet(usuarioId, conexao);
    await conexao.commit();
    return vacinasPorPet;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// Exclui registros selecionados depois de conferir que todos pertencem à conta.
export async function excluirVacinas(ids, usuarioId) {
  return emTransacao(async conexao => {
    const marcadores = ids.map(() => '?').join(', ');
    const [registros] = await conexao.execute(
      `SELECT v.id_vacina AS id
         FROM vacina v
         JOIN pet p ON p.id_pet = v.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})
        FOR UPDATE`,
      [usuarioId, ...ids]
    );
    if (registros.length !== ids.length) {
      return null;
    }

    await conexao.execute(
      `DELETE v FROM vacina v
         JOIN pet p ON p.id_pet = v.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND v.id_vacina IN (${marcadores})`,
      [usuarioId, ...ids]
    );
    const vacinasPorPet = await listarVacinasPorPet(usuarioId, conexao);
    return vacinasPorPet;
  });
}
