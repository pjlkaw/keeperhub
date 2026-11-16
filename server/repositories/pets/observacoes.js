// Consultas SQL das notas de comportamento dos pets (tabela pet_observacao).
import db from '../../db.js';
import { emTransacao } from './transacao.js';

export const TAMANHO_MAXIMO_OBSERVACAO = 1000;

// A data volta como texto ('AAAA-MM-DDTHH:MM') para não depender do fuso do servidor.
const SELECT_OBSERVACAO = `
  SELECT o.id_observacao AS id, o.pet_id AS petId,
         DATE_FORMAT(o.data, '%Y-%m-%dT%H:%i') AS data, o.texto
    FROM pet_observacao o
    JOIN pet p ON p.id_pet = o.pet_id`;

export function mapearObservacao(linha) {
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    data: linha.data,
    texto: linha.texto,
  };
}

// Notas de todos os pets ativos do usuário, da mais nova para a mais antiga.
export async function listarObservacoesPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `${SELECT_OBSERVACAO}
      WHERE p.usuario_id = ? AND p.ativo = 1
      ORDER BY o.data DESC, o.id_observacao DESC`,
    [usuarioId]
  );
  const porPet = new Map();
  for (const linha of linhas) {
    const observacao = mapearObservacao(linha);
    const lista = porPet.get(observacao.petId) || [];
    lista.push(observacao);
    porPet.set(observacao.petId, lista);
  }
  return porPet;
}

// Confere, dentro da transação, que o pet é ativo e do usuário.
async function petDoUsuario(conexao, usuarioId, petId) {
  const [pets] = await conexao.execute(
    'SELECT id_pet FROM pet WHERE id_pet = ? AND usuario_id = ? AND ativo = 1 FOR UPDATE',
    [petId, usuarioId]
  );
  return pets.length === 1;
}

// Busca e trava a nota, só se ela for de um pet ativo do usuário.
async function observacaoDoUsuario(conexao, usuarioId, id) {
  const [linhas] = await conexao.execute(
    `SELECT o.id_observacao AS id
       FROM pet_observacao o
       JOIN pet p ON p.id_pet = o.pet_id
      WHERE o.id_observacao = ? AND p.usuario_id = ? AND p.ativo = 1
      FOR UPDATE`,
    [id, usuarioId]
  );
  return linhas.length === 1;
}

// Grava a nota com a data e hora informadas (horário de Brasília, 'AAAA-MM-DD HH:MM:SS').
export function cadastrarObservacao(usuarioId, petId, texto, dataHora) {
  return emTransacao(async conexao => {
    if (!(await petDoUsuario(conexao, usuarioId, petId))) return null;
    const [resultado] = await conexao.execute(
      'INSERT INTO pet_observacao (pet_id, data, texto) VALUES (?, ?, ?)',
      [petId, dataHora, texto]
    );
    const observacoesPorPet = await listarObservacoesPorPet(usuarioId, conexao);
    return { observacoesPorPet, criado: String(resultado.insertId) };
  });
}

// Troca só o texto; a data e a hora continuam as do cadastro.
export function atualizarObservacao(id, usuarioId, texto) {
  return emTransacao(async conexao => {
    if (!(await observacaoDoUsuario(conexao, usuarioId, id))) return null;
    await conexao.execute('UPDATE pet_observacao SET texto = ? WHERE id_observacao = ?', [texto, id]);
    return listarObservacoesPorPet(usuarioId, conexao);
  });
}

export function excluirObservacao(id, usuarioId) {
  return emTransacao(async conexao => {
    if (!(await observacaoDoUsuario(conexao, usuarioId, id))) return null;
    await conexao.execute('DELETE FROM pet_observacao WHERE id_observacao = ?', [id]);
    return listarObservacoesPorPet(usuarioId, conexao);
  });
}
