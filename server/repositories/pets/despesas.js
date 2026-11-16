// Consultas SQL das despesas dos pets. Cada despesa é um lançamento de Finanças
// (valor, data, descrição) ligado a pet_despesa (pet, categoria, estabelecimento).
import { randomUUID } from 'node:crypto';
import db from '../../db.js';
import { emTransacao } from './transacao.js';

export const CATEGORIAS_DESPESA = ['alimentacao', 'saude', 'higiene', 'lazer'];

// Conta e categoria de Finanças usadas para as despesas dos pets.
const NOME_CONTA_PETS = 'Pets';
const NOME_CATEGORIA_PETS = 'Pets';

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

// Converte a linha do banco para o formato que despesas.js já usa (valor em centavos).
export function mapearDespesa(linha) {
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    ...(linha.grupoId ? { grupoId: String(linha.grupoId) } : {}),
    descricao: linha.descricao || '',
    categoria: linha.categoria,
    valorCentavos: Math.round(Number(linha.valor) * 100),
    data: dataParaTexto(linha.data),
    estabelecimento: linha.estabelecimento || '',
    observacoes: linha.observacoes || '',
  };
}

// Divide o total entre os pets; os centavos que sobram ficam com os primeiros.
export function dividirValor(totalCentavos, quantidade) {
  const base = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - base * quantidade;
  return Array.from({ length: quantidade }, (_, indice) => base + (indice < resto ? 1 : 0));
}

// Despesas de todos os pets ativos do usuário, agrupadas pelo id do pet.
export async function listarDespesasPorPet(usuarioId, executor = db) {
  const [linhas] = await executor.execute(
    `SELECT d.id_despesa AS id, d.pet_id AS petId, d.grupo_id AS grupoId,
            d.categoria, d.estabelecimento,
            l.descricao, l.valor, l.data, l.observacoes
       FROM pet_despesa d
       JOIN lancamento l ON l.id_lancamento = d.lancamento_id
       JOIN pet p ON p.id_pet = d.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1
      ORDER BY l.data, d.id_despesa`,
    [usuarioId]
  );

  const porPet = new Map();
  for (const linha of linhas) {
    const despesa = mapearDespesa(linha);
    const lista = porPet.get(despesa.petId) || [];
    lista.push(despesa);
    porPet.set(despesa.petId, lista);
  }
  return porPet;
}

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

// Usa a conta "Pets" do usuário em Finanças; cria uma carteira com esse nome na primeira vez.
async function contaPets(conexao, usuarioId) {
  const [contas] = await conexao.execute(
    `SELECT id_conta FROM conta
      WHERE usuario_id = ? AND nome = ? AND ativo = 1
      ORDER BY id_conta LIMIT 1`,
    [usuarioId, NOME_CONTA_PETS]
  );
  if (contas[0]) return contas[0].id_conta;
  const [resultado] = await conexao.execute(
    "INSERT INTO conta (usuario_id, nome, tipo) VALUES (?, ?, 'carteira')",
    [usuarioId, NOME_CONTA_PETS]
  );
  return resultado.insertId;
}

// Usa a categoria financeira "Pets" do usuário; cria na primeira vez.
async function categoriaPets(conexao, usuarioId) {
  const [categorias] = await conexao.execute(
    `SELECT id_categoria FROM categoria_financeira
      WHERE usuario_id = ? AND nome = ? AND tipo IN ('despesa', 'ambos') AND ativo = 1
      ORDER BY id_categoria LIMIT 1`,
    [usuarioId, NOME_CATEGORIA_PETS]
  );
  if (categorias[0]) return categorias[0].id_categoria;
  const [resultado] = await conexao.execute(
    "INSERT INTO categoria_financeira (usuario_id, nome, tipo) VALUES (?, ?, 'despesa')",
    [usuarioId, NOME_CATEGORIA_PETS]
  );
  return resultado.insertId;
}

// Cria o lançamento em Finanças e a ligação em pet_despesa para um pet.
async function inserirDespesa(conexao, usuarioId, petId, dados, valorCentavos, grupoId) {
  const contaId = await contaPets(conexao, usuarioId);
  const categoriaId = await categoriaPets(conexao, usuarioId);
  const [lancamento] = await conexao.execute(
    `INSERT INTO lancamento
      (conta_id, categoria_id, pet_id, valor, data, descricao, observacoes, tipo, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'despesa', 'pago')`,
    [contaId, categoriaId, petId, valorCentavos / 100, dados.data, dados.descricao, dados.observacoes || null]
  );
  const [despesa] = await conexao.execute(
    `INSERT INTO pet_despesa (pet_id, lancamento_id, categoria, estabelecimento, grupo_id)
     VALUES (?, ?, ?, ?, ?)`,
    [petId, lancamento.insertId, dados.categoria, dados.estabelecimento || null, grupoId]
  );
  return String(despesa.insertId);
}

// Busca e trava as despesas informadas, só se todas forem do usuário.
async function despesasDoUsuario(conexao, usuarioId, ids) {
  const marcadores = ids.map(() => '?').join(', ');
  const [registros] = await conexao.execute(
    `SELECT d.id_despesa AS id, d.pet_id AS petId, d.lancamento_id AS lancamentoId
       FROM pet_despesa d
       JOIN pet p ON p.id_pet = d.pet_id
      WHERE p.usuario_id = ? AND p.ativo = 1 AND d.id_despesa IN (${marcadores})
      FOR UPDATE`,
    [usuarioId, ...ids]
  );
  return registros.length === ids.length ? registros : null;
}

async function apagarDespesa(conexao, registro) {
  await conexao.execute('DELETE FROM pet_despesa WHERE id_despesa = ?', [registro.id]);
  await conexao.execute('DELETE FROM lancamento WHERE id_lancamento = ?', [registro.lancamentoId]);
}

// Grava a despesa para um ou vários pets, dividindo o valor total entre eles.
export function cadastrarDespesa(usuarioId, petIds, dados) {
  return emTransacao(async conexao => {
    if (!(await petsDoUsuario(conexao, usuarioId, petIds))) return null;
    const valores = dividirValor(dados.valorCentavos, petIds.length);
    const criados = [];
    const grupoId = petIds.length > 1 ? randomUUID() : null;
    for (const [indice, petId] of petIds.entries()) {
      criados.push(await inserirDespesa(conexao, usuarioId, petId, dados, valores.at(indice), grupoId));
    }
    const despesasPorPet = await listarDespesasPorPet(usuarioId, conexao);
    return { despesasPorPet, criados };
  });
}

// Edita uma despesa e permite trocar os pets associados; o valor total é dividido de novo.
export function atualizarDespesas(ids, petIdsOrigem, petIdsDestino, usuarioId, dados) {
  return emTransacao(async conexao => {
    const registros = await despesasDoUsuario(conexao, usuarioId, ids);
    if (!registros) return null;
    const petPorId = new Map(registros.map(registro => [String(registro.id), String(registro.petId)]));
    if (ids.some((id, indice) => petPorId.get(String(id)) !== String(petIdsOrigem[indice]))) return null;
    if (!(await petsDoUsuario(conexao, usuarioId, petIdsDestino))) return null;

    const registroPorPet = new Map(registros.map(registro => [String(registro.petId), registro]));
    const destinos = new Set(petIdsDestino.map(String));
    const valores = dividirValor(dados.valorCentavos, petIdsDestino.length);
    const grupoIds = [];
    const grupoId = petIdsDestino.length > 1 ? randomUUID() : null;

    for (const [indice, petId] of petIdsDestino.entries()) {
      const existente = registroPorPet.get(String(petId));
      if (!existente) {
        grupoIds.push(await inserirDespesa(conexao, usuarioId, petId, dados, valores.at(indice), grupoId));
        continue;
      }
      await conexao.execute(
        `UPDATE lancamento SET valor = ?, data = ?, descricao = ?, observacoes = ?
          WHERE id_lancamento = ?`,
        [valores.at(indice) / 100, dados.data, dados.descricao, dados.observacoes || null, existente.lancamentoId]
      );
      await conexao.execute(
        'UPDATE pet_despesa SET categoria = ?, estabelecimento = ?, grupo_id = ? WHERE id_despesa = ?',
        [dados.categoria, dados.estabelecimento || null, grupoId, existente.id]
      );
      grupoIds.push(String(existente.id));
    }

    for (const registro of registros) {
      if (!destinos.has(String(registro.petId))) await apagarDespesa(conexao, registro);
    }

    const despesasPorPet = await listarDespesasPorPet(usuarioId, conexao);
    return { despesasPorPet, grupoIds };
  });
}

// Exclui as despesas e os lançamentos correspondentes em Finanças.
export function excluirDespesas(ids, usuarioId) {
  return emTransacao(async conexao => {
    const registros = await despesasDoUsuario(conexao, usuarioId, ids);
    if (!registros) return null;
    for (const registro of registros) await apagarDespesa(conexao, registro);
    return listarDespesasPorPet(usuarioId, conexao);
  });
}
