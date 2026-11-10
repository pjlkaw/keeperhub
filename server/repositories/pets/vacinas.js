// Consultas SQL de vacinação dos pets: listar e cadastrar vacinas do usuário autenticado.
import db from '../../db.js';

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
export async function listarVacinasPorPet(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT v.id_vacina AS id, v.pet_id AS petId, v.nome, v.status,
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

    for (const petId of petIds) {
      await conexao.execute(
        `INSERT INTO vacina
          (pet_id, nome, status, data_aplicacao, frequencia,
           data_proxima_dose, clinica, horario, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          petId, dados.nome, dados.status, dados.data, dados.frequencia,
          dados.proximaDose || null, dados.clinica || null,
          dados.horario || null, dados.observacao || null,
        ]
      );
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return listarVacinasPorPet(usuarioId);
}
