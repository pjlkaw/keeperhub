// Orçamento mensal das despesas de cada pet (tabela pet_orcamento: um valor por pet e mês)
// e meta conjunta de todos os pets do usuário (tabela pet_orcamento_geral).
import db from '../../db.js';
import { emTransacao } from './transacao.js';

export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ORCAMENTO_MAXIMO_CENTAVOS = 9999999999; // DECIMAL(10,2): até 99.999.999,99

// Orçamentos dos pets ativos do usuário: Map idDoPet -> { 'AAAA-MM': centavos }.
export async function listarOrcamentosPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `SELECT o.pet_id AS petId, o.mes, ROUND(o.valor * 100) AS centavos
       FROM pet_orcamento o
       JOIN pet p ON p.id_pet = o.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1`,
    [usuarioId]
  );
  const porPet = new Map();
  for (const linha of linhas) {
    const chave = String(linha.petId);
    const meses = porPet.get(chave) || {};
    meses[linha.mes] = Number(linha.centavos);
    porPet.set(chave, meses);
  }
  return porPet;
}

// Grava (ou troca) o orçamento do pet no mês. Retorna null se o pet não for do usuário.
export function salvarOrcamento(usuarioId, petId, mes, valorCentavos) {
  return emTransacao(async conexao => {
    const [pets] = await conexao.execute(
      'SELECT id_pet FROM pet WHERE id_pet = ? AND usuario_id = ? AND ativo = 1 FOR UPDATE',
      [petId, usuarioId]
    );
    if (!pets.length) return null;
    await conexao.execute(
      `INSERT INTO pet_orcamento (pet_id, mes, valor) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [petId, mes, (valorCentavos / 100).toFixed(2)]
    );
    return listarOrcamentosPorPet(usuarioId, conexao);
  });
}

// Meta mensal que vale para todos os pets do usuário em conjunto (tabela pet_orcamento_geral).
// Retorna { 'AAAA-MM': centavos }.
export async function listarOrcamentoGeral(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `SELECT mes, ROUND(valor * 100) AS centavos
       FROM pet_orcamento_geral
      WHERE usuario_id = ?`,
    [usuarioId]
  );
  return Object.fromEntries(linhas.map(linha => [linha.mes, Number(linha.centavos)]));
}

// Grava (ou troca) a meta conjunta do usuário no mês.
export async function salvarOrcamentoGeral(usuarioId, mes, valorCentavos) {
  await db.execute(
    `INSERT INTO pet_orcamento_geral (usuario_id, mes, valor) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
    [usuarioId, mes, (valorCentavos / 100).toFixed(2)]
  );
  return listarOrcamentoGeral(usuarioId);
}
