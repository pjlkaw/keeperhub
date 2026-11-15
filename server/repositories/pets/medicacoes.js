// Consultas SQL das medicações dos pets: listar, cadastrar, editar, concluir e excluir.
import db from '../../db.js';
import { emTransacao } from './transacao.js';

export const TIPOS_USO = ['continuo', 'temporario', 'eventual'];

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

// Converte a linha do banco para o formato que medicacoes.js já usa.
export function mapearMedicacao(linha) {
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    nome: linha.nome,
    tipoUso: linha.tipoUso,
    dosagem: linha.dosagem || '',
    horarioDose: linha.horarioDose ? String(linha.horarioDose).slice(0, 5) : '',
    frequencia: linha.frequencia || '',
    dataFim: dataParaTexto(linha.dataFim),
    quantidadeEstoque: linha.quantidadeEstoque == null ? null : Number(linha.quantidadeEstoque),
    observacao: linha.observacao || '',
    ...(linha.concluidaEm ? { concluidaEm: dataParaTexto(linha.concluidaEm) } : {}),
  };
}

// Medicações de todos os pets ativos do usuário, agrupadas pelo id do pet.
export async function listarMedicacoesPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `SELECT m.id_pet_medicacao AS id, m.pet_id AS petId, m.nome, m.tipo_uso AS tipoUso,
            m.dosagem, m.horario_dose AS horarioDose, m.frequencia, m.data_fim AS dataFim,
            m.concluida_em AS concluidaEm, m.quantidade_estoque AS quantidadeEstoque,
            m.observacao
       FROM pet_medicacao m
       JOIN pet p ON p.id_pet = m.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1 AND m.ativo = 1
      ORDER BY m.id_pet_medicacao`,
    [usuarioId]
  );

  const porPet = new Map();
  for (const linha of linhas) {
    const medicacao = mapearMedicacao(linha);
    const lista = porPet.get(medicacao.petId) || [];
    lista.push(medicacao);
    porPet.set(medicacao.petId, lista);
  }
  return porPet;
}

function valoresMedicacao(dados) {
  return [
    dados.nome, dados.tipoUso, dados.dosagem,
    dados.horarioDose || null, dados.frequencia || null, dados.dataFim || null,
    dados.quantidadeEstoque, dados.observacao || null,
  ];
}

const INSERT_MEDICACAO = `
  INSERT INTO pet_medicacao
    (pet_id, nome, tipo_uso, dosagem, horario_dose, frequencia, data_fim,
     quantidade_estoque, observacao)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// Confere, dentro da transação, que todos os pets são ativos e do usuário.
async function petsDoUsuario(conexao, usuarioId, petIds) {
  const marcadores = petIds.map(() => '?').join(', ');
  const [pets] = await conexao.execute(
    `SELECT id_pet FROM pet
      WHERE usuario_id = ? AND ativo = 1 AND id_pet IN (${marcadores})
      FOR UPDATE`,
    [usuarioId, ...petIds]
  );
  return pets.length === petIds.length;
}

// Busca e trava as medicações informadas, só se todas forem do usuário.
async function medicacoesDoUsuario(conexao, usuarioId, ids) {
  const marcadores = ids.map(() => '?').join(', ');
  const [registros] = await conexao.execute(
    `SELECT m.id_pet_medicacao AS id, m.pet_id AS petId
       FROM pet_medicacao m
       JOIN pet p ON p.id_pet = m.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1 AND m.ativo = 1
        AND m.id_pet_medicacao IN (${marcadores})
      FOR UPDATE`,
    [usuarioId, ...ids]
  );
  return registros.length === ids.length ? registros : null;
}

// Grava a mesma medicação para um ou vários pets. Retorna null se algum pet não for do usuário.
export function cadastrarMedicacao(usuarioId, petIds, dados) {
  return emTransacao(async conexao => {
    if (!(await petsDoUsuario(conexao, usuarioId, petIds))) return null;
    const criados = [];
    for (const petId of petIds) {
      const [resultado] = await conexao.execute(INSERT_MEDICACAO, [petId, ...valoresMedicacao(dados)]);
      criados.push(String(resultado.insertId));
    }
    const medicacoesPorPet = await listarMedicacoesPorPet(usuarioId, conexao);
    return { medicacoesPorPet, criados };
  });
}

// Edita uma medicação (de um ou vários pets) e permite trocar os pets associados.
// petIdsOrigem[i] é o pet da medicação ids[i]; pets que saem perdem o registro, pets que entram ganham um.
export function atualizarMedicacoes(ids, petIdsOrigem, petIdsDestino, usuarioId, dados) {
  return emTransacao(async conexao => {
    const registros = await medicacoesDoUsuario(conexao, usuarioId, ids);
    if (!registros) return null;
    const petPorId = new Map(registros.map(registro => [String(registro.id), String(registro.petId)]));
    if (ids.some((id, indice) => petPorId.get(String(id)) !== String(petIdsOrigem[indice]))) return null;
    if (!(await petsDoUsuario(conexao, usuarioId, petIdsDestino))) return null;

    const registroPorPet = new Map(registros.map(registro => [String(registro.petId), registro]));
    const destinos = new Set(petIdsDestino.map(String));
    const grupoIds = [];

    for (const petId of petIdsDestino) {
      const existente = registroPorPet.get(String(petId));
      if (existente) {
        await conexao.execute(
          `UPDATE pet_medicacao
              SET nome = ?, tipo_uso = ?, dosagem = ?, horario_dose = ?, frequencia = ?,
                  data_fim = ?, quantidade_estoque = ?, observacao = ?
            WHERE id_pet_medicacao = ?`,
          [...valoresMedicacao(dados), existente.id]
        );
        grupoIds.push(String(existente.id));
      } else {
        const [resultado] = await conexao.execute(INSERT_MEDICACAO, [petId, ...valoresMedicacao(dados)]);
        grupoIds.push(String(resultado.insertId));
      }
    }

    for (const registro of registros) {
      if (!destinos.has(String(registro.petId))) {
        await conexao.execute('DELETE FROM pet_medicacao WHERE id_pet_medicacao = ?', [registro.id]);
      }
    }

    const medicacoesPorPet = await listarMedicacoesPorPet(usuarioId, conexao);
    return { medicacoesPorPet, grupoIds };
  });
}

// Move as medicações para o histórico com a data de hoje.
export function concluirMedicacoes(ids, usuarioId) {
  return emTransacao(async conexao => {
    if (!(await medicacoesDoUsuario(conexao, usuarioId, ids))) return null;
    const marcadores = ids.map(() => '?').join(', ');
    await conexao.execute(
      `UPDATE pet_medicacao SET concluida_em = CURDATE() WHERE id_pet_medicacao IN (${marcadores})`,
      ids
    );
    return listarMedicacoesPorPet(usuarioId, conexao);
  });
}

// Exclui as medicações depois de conferir que todas pertencem à conta.
export function excluirMedicacoes(ids, usuarioId) {
  return emTransacao(async conexao => {
    if (!(await medicacoesDoUsuario(conexao, usuarioId, ids))) return null;
    const marcadores = ids.map(() => '?').join(', ');
    await conexao.execute(
      `DELETE FROM pet_medicacao WHERE id_pet_medicacao IN (${marcadores})`,
      ids
    );
    return listarMedicacoesPorPet(usuarioId, conexao);
  });
}
