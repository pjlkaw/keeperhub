// Consultas SQL das rotinas dos pets: higiene e lazer (pet_rotina) e alimentar (pet_refeicao).
import { randomUUID } from 'node:crypto';
import db from '../../db.js';
import { emTransacao } from './transacao.js';

export const TIPOS_ROTINA = ['higiene', 'lazer', 'alimentar'];

// Tabela e colunas de cada tipo. Nomes fixos, nunca vindos da requisição.
const TABELAS = {
  rotina: {
    tabela: 'pet_rotina',
    id: 'id_pet_rotina',
    colunas: ['tipo', 'atividade', 'nome', 'frequencia', 'dias_semana', 'data_inicio',
      'horario', 'duracao_min', 'observacao'],
  },
  refeicao: {
    tabela: 'pet_refeicao',
    id: 'id_refeicao',
    colunas: ['nome', 'horario', 'observacao'],
  },
};

function tabelaDo(tipo) {
  return tipo === 'alimentar' ? TABELAS.refeicao : TABELAS.rotina;
}

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

function horarioParaTexto(valor) {
  return valor ? String(valor).slice(0, 5) : '';
}

// Converte a linha de pet_rotina para o formato que rotinas.js (front) já usa.
// Campos opcionais só aparecem quando têm valor, como no armazenamento local.
export function mapearRotina(linha) {
  const rotina = {
    id: String(linha.id),
    petId: String(linha.petId),
    ...(linha.grupoId ? { grupoId: String(linha.grupoId) } : {}),
    atividade: linha.atividade || '',
    frequencia: linha.frequencia || '',
    horario: horarioParaTexto(linha.horario),
  };
  const data = dataParaTexto(linha.dataInicio);
  if (data) rotina.data = data;
  if (linha.diasSemana) {
    const dias = String(linha.diasSemana).split(',').map(Number)
      .filter(dia => Number.isInteger(dia) && dia >= 0 && dia <= 6);
    if (dias.length) rotina.diasSemana = dias;
  }
  if (linha.duracaoMin != null) rotina.duracaoMin = Number(linha.duracaoMin);
  if (linha.observacao) rotina.observacao = linha.observacao;
  if (rotina.atividade === 'outro' && linha.nome) rotina.atividadeOutra = linha.nome;
  return rotina;
}

// Converte a linha de pet_refeicao para uma refeição da rotina alimentar.
export function mapearRefeicao(linha) {
  const refeicao = {
    id: String(linha.id),
    petId: String(linha.petId),
    ...(linha.grupoId ? { grupoId: String(linha.grupoId) } : {}),
    nome: linha.nome,
    horario: horarioParaTexto(linha.horario),
  };
  if (linha.observacao) refeicao.observacao = linha.observacao;
  return refeicao;
}

// Rotinas de todos os pets ativos do usuário: Map idDoPet -> { higiene, lazer, refeicoes }.
export async function listarRotinasPorPet(usuarioId, executor = db) {
  const [[rotinas], [refeicoes]] = await Promise.all([
    executor.execute(
      `SELECT r.id_pet_rotina AS id, r.pet_id AS petId, r.grupo_id AS grupoId,
              r.tipo, r.atividade, r.nome,
              r.frequencia, r.dias_semana AS diasSemana, r.data_inicio AS dataInicio,
              r.horario, r.duracao_min AS duracaoMin, r.observacao
         FROM pet_rotina r
         JOIN pet p ON p.id_pet = r.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND r.ativo = 1 AND r.tipo IN ('higiene', 'lazer')
        ORDER BY r.horario, r.id_pet_rotina`,
      [usuarioId]
    ),
    executor.execute(
      `SELECT f.id_refeicao AS id, f.pet_id AS petId, f.grupo_id AS grupoId,
              f.nome, f.horario, f.observacao
         FROM pet_refeicao f
         JOIN pet p ON p.id_pet = f.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1 AND f.ativo = 1
        ORDER BY f.horario, f.id_refeicao`,
      [usuarioId]
    ),
  ]);

  const porPet = new Map();
  const doPet = petId => {
    const chave = String(petId);
    if (!porPet.has(chave)) porPet.set(chave, { higiene: [], lazer: [], refeicoes: [] });
    return porPet.get(chave);
  };
  for (const linha of rotinas) doPet(linha.petId)[linha.tipo].push(mapearRotina(linha));
  for (const linha of refeicoes) doPet(linha.petId).refeicoes.push(mapearRefeicao(linha));
  return porPet;
}

// Valores na ordem de TABELAS[...].colunas.
function valoresRotina(tipo, dados) {
  if (tipo === 'alimentar') {
    return [dados.nome, dados.horario || null, dados.observacao || null];
  }
  return [
    tipo, dados.atividade, dados.nome, dados.frequencia,
    Array.isArray(dados.diasSemana) && dados.diasSemana.length ? dados.diasSemana.join(',') : null,
    dados.data || null, dados.horario || null, dados.duracaoMin ?? null, dados.observacao || null,
  ];
}

function sqlInsert(tipo) {
  const { tabela, colunas } = tabelaDo(tipo);
  const marcadores = ['?', '?', ...colunas.map(() => '?')].join(', ');
  return `INSERT INTO ${tabela} (pet_id, grupo_id, ${colunas.join(', ')}) VALUES (${marcadores})`;
}

function sqlUpdate(tipo) {
  const { tabela, id, colunas } = tabelaDo(tipo);
  return `UPDATE ${tabela} SET grupo_id = ?, ${colunas.map(coluna => `${coluna} = ?`).join(', ')} WHERE ${id} = ?`;
}

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

// Busca e trava as rotinas informadas, só se todas forem do usuário e do tipo pedido.
async function rotinasDoUsuario(conexao, usuarioId, tipo, ids) {
  const { tabela, id } = tabelaDo(tipo);
  const marcadores = ids.map(() => '?').join(', ');
  const filtroTipo = tipo === 'alimentar' ? '' : 'AND r.tipo = ?';
  const [registros] = await conexao.execute(
    `SELECT r.${id} AS id, r.pet_id AS petId
       FROM ${tabela} r
       JOIN pet p ON p.id_pet = r.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1 AND r.ativo = 1 ${filtroTipo}
        AND r.${id} IN (${marcadores})
      FOR UPDATE`,
    tipo === 'alimentar' ? [usuarioId, ...ids] : [usuarioId, tipo, ...ids]
  );
  return registros.length === ids.length ? registros : null;
}

// Grava a mesma rotina para um ou vários pets. Retorna null se algum pet não for do usuário.
export function cadastrarRotina(usuarioId, tipo, petIds, dados) {
  return emTransacao(async conexao => {
    if (!(await petsDoUsuario(conexao, usuarioId, petIds))) return null;
    const criados = [];
    const grupoId = petIds.length > 1 ? randomUUID() : null;
    for (const petId of petIds) {
      const [resultado] = await conexao.execute(sqlInsert(tipo), [petId, grupoId, ...valoresRotina(tipo, dados)]);
      criados.push(String(resultado.insertId));
    }
    const rotinasPorPet = await listarRotinasPorPet(usuarioId, conexao);
    return { rotinasPorPet, criados };
  });
}

// Edita uma rotina (de um ou vários pets) e permite trocar os pets associados.
// petIdsOrigem[i] é o pet da rotina ids[i]; pets que saem perdem o registro, pets que entram ganham um.
export function atualizarRotinas(tipo, ids, petIdsOrigem, petIdsDestino, usuarioId, dados) {
  return emTransacao(async conexao => {
    const registros = await rotinasDoUsuario(conexao, usuarioId, tipo, ids);
    if (!registros) return null;
    const petPorId = new Map(registros.map(registro => [String(registro.id), String(registro.petId)]));
    if (ids.some((id, indice) => petPorId.get(String(id)) !== String(petIdsOrigem[indice]))) return null;
    if (!(await petsDoUsuario(conexao, usuarioId, petIdsDestino))) return null;

    const { tabela, id } = tabelaDo(tipo);
    const registroPorPet = new Map(registros.map(registro => [String(registro.petId), registro]));
    const destinos = new Set(petIdsDestino.map(String));
    const grupoIds = [];
    const grupoId = petIdsDestino.length > 1 ? randomUUID() : null;

    for (const petId of petIdsDestino) {
      const existente = registroPorPet.get(String(petId));
      if (existente) {
        await conexao.execute(sqlUpdate(tipo), [grupoId, ...valoresRotina(tipo, dados), existente.id]);
        grupoIds.push(String(existente.id));
      } else {
        const [resultado] = await conexao.execute(sqlInsert(tipo), [petId, grupoId, ...valoresRotina(tipo, dados)]);
        grupoIds.push(String(resultado.insertId));
      }
    }

    for (const registro of registros) {
      if (!destinos.has(String(registro.petId))) {
        await conexao.execute(`DELETE FROM ${tabela} WHERE ${id} = ?`, [registro.id]);
      }
    }

    const rotinasPorPet = await listarRotinasPorPet(usuarioId, conexao);
    return { rotinasPorPet, grupoIds };
  });
}

// Exclui as rotinas depois de conferir que todas pertencem à conta.
export function excluirRotinas(tipo, ids, usuarioId) {
  return emTransacao(async conexao => {
    if (!(await rotinasDoUsuario(conexao, usuarioId, tipo, ids))) return null;
    const { tabela, id } = tabelaDo(tipo);
    const marcadores = ids.map(() => '?').join(', ');
    await conexao.execute(`DELETE FROM ${tabela} WHERE ${id} IN (${marcadores})`, ids);
    return listarRotinasPorPet(usuarioId, conexao);
  });
}
