// Consultas SQL das receitas dos pets (tabela pet_receita). Os anexos ficam no Vercel
// Blob e na tabela arquivo (entidade_tipo = 'pet_receita'), pelo módulo anexos.js.
import db from '../../db.js';
import { emTransacao } from './transacao.js';
import {
  apagarDoBlob,
  conferirLimitesAnexos,
  enviarAnexos,
  excluirAnexosDoRegistro,
  gravarAnexos,
  listarAnexosPorRegistro,
  substituirAnexos,
} from './anexos.js';

const ENTIDADE = 'pet_receita';

export const LIMITES_RECEITA = { nome: 150, veterinario: 150, observacao: 2000 };

// As datas voltam como texto ('AAAA-MM-DD') para não depender do fuso do servidor.
const SELECT_RECEITA = `
  SELECT r.id_receita AS id, r.pet_id AS petId, r.nome, r.veterinario,
         DATE_FORMAT(r.data_emissao, '%Y-%m-%d') AS dataEmissao,
         DATE_FORMAT(r.data_validade, '%Y-%m-%d') AS dataValidade,
         DATE_FORMAT(r.concluida_em, '%Y-%m-%d') AS concluidaEm,
         r.observacao
    FROM pet_receita r
    JOIN pet p ON p.id_pet = r.pet_id`;

export function mapearReceita(linha, anexos = []) {
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    nome: linha.nome,
    veterinario: linha.veterinario || '',
    dataEmissao: linha.dataEmissao || '',
    dataValidade: linha.dataValidade || '',
    concluidaEm: linha.concluidaEm || '',
    observacao: linha.observacao || '',
    anexos,
  };
}

// Receitas de todos os pets ativos do usuário (mais recentes primeiro), com os anexos.
export async function listarReceitasPorPet(usuarioId, executor = db) {
  const [[receitas], anexosPorReceita] = await Promise.all([
    executor.execute(
      `${SELECT_RECEITA}
        WHERE p.usuario_id = ? AND p.ativo = 1
        ORDER BY r.data_emissao IS NULL, r.data_emissao DESC, r.id_receita DESC`,
      [usuarioId]
    ),
    listarAnexosPorRegistro(executor, usuarioId, ENTIDADE),
  ]);
  const porPet = new Map();
  for (const linha of receitas) {
    const receita = mapearReceita(linha, anexosPorReceita.get(String(linha.id)) || []);
    const lista = porPet.get(receita.petId) || [];
    lista.push(receita);
    porPet.set(receita.petId, lista);
  }
  return porPet;
}

function valoresReceita(dados) {
  return [
    dados.nome, dados.veterinario || null, dados.dataEmissao || null,
    dados.dataValidade || null, dados.observacao || null,
  ];
}

// Busca e trava a receita, só se for de um pet ativo do usuário.
async function receitaDoUsuario(conexao, usuarioId, id) {
  const [linhas] = await conexao.execute(
    `SELECT r.id_receita AS id
       FROM pet_receita r
       JOIN pet p ON p.id_pet = r.pet_id
      WHERE r.id_receita = ? AND p.usuario_id = ? AND p.ativo = 1
      FOR UPDATE`,
    [id, usuarioId]
  );
  return linhas.length === 1;
}

// Cadastra a receita de um pet com seus anexos. Retorna null se o pet não for do usuário.
export async function cadastrarReceita(usuarioId, petId, dados, anexos = []) {
  conferirLimitesAnexos(anexos.length, anexos.reduce((soma, anexo) => soma + anexo.buffer.length, 0));
  const enviados = await enviarAnexos(usuarioId, 'receitas-pets', anexos);
  try {
    const resultado = await emTransacao(async conexao => {
      const [pets] = await conexao.execute(
        'SELECT id_pet FROM pet WHERE id_pet = ? AND usuario_id = ? AND ativo = 1 FOR UPDATE',
        [petId, usuarioId]
      );
      if (!pets.length) return null;
      const [inserido] = await conexao.execute(
        `INSERT INTO pet_receita (pet_id, nome, veterinario, data_emissao, data_validade, observacao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [petId, ...valoresReceita(dados)]
      );
      await gravarAnexos(conexao, usuarioId, ENTIDADE, inserido.insertId, enviados);
      const receitasPorPet = await listarReceitasPorPet(usuarioId, conexao);
      return { receitasPorPet, criado: String(inserido.insertId) };
    });
    if (!resultado) await apagarDoBlob(enviados.map(anexo => anexo.url));
    return resultado;
  } catch (erro) {
    await apagarDoBlob(enviados.map(anexo => anexo.url));
    throw erro;
  }
}

// Edita os dados da receita, acrescenta anexos novos e remove os anexos indicados.
export async function atualizarReceita(id, usuarioId, dados, novosAnexos = [], idsAnexosRemover = []) {
  // Confere os anexos novos antes do envio; o total com os já salvos é conferido na transação.
  conferirLimitesAnexos(novosAnexos.length, novosAnexos.reduce((soma, anexo) => soma + anexo.buffer.length, 0));
  const enviados = await enviarAnexos(usuarioId, 'receitas-pets', novosAnexos);
  let urlsRemovidas = [];
  try {
    const resultado = await emTransacao(async conexao => {
      if (!(await receitaDoUsuario(conexao, usuarioId, id))) return null;
      await conexao.execute(
        `UPDATE pet_receita
            SET nome = ?, veterinario = ?, data_emissao = ?, data_validade = ?, observacao = ?
          WHERE id_receita = ?`,
        [...valoresReceita(dados), id]
      );
      urlsRemovidas = await substituirAnexos(conexao, usuarioId, ENTIDADE, id, enviados, idsAnexosRemover);
      return listarReceitasPorPet(usuarioId, conexao);
    });
    if (!resultado) {
      await apagarDoBlob(enviados.map(anexo => anexo.url));
      return null;
    }
    await apagarDoBlob(urlsRemovidas);
    return resultado;
  } catch (erro) {
    await apagarDoBlob(enviados.map(anexo => anexo.url));
    throw erro;
  }
}

// Marca a receita como concluída na data informada (ou reabre, com null).
export function concluirReceita(id, usuarioId, data) {
  return emTransacao(async conexao => {
    if (!(await receitaDoUsuario(conexao, usuarioId, id))) return null;
    await conexao.execute('UPDATE pet_receita SET concluida_em = ? WHERE id_receita = ?', [data, id]);
    return listarReceitasPorPet(usuarioId, conexao);
  });
}

// Exclui a receita e os anexos (banco e Blob).
export async function excluirReceita(id, usuarioId) {
  let urls = [];
  const resultado = await emTransacao(async conexao => {
    if (!(await receitaDoUsuario(conexao, usuarioId, id))) return null;
    urls = await excluirAnexosDoRegistro(conexao, usuarioId, ENTIDADE, id);
    await conexao.execute('DELETE FROM pet_receita WHERE id_receita = ?', [id]);
    return listarReceitasPorPet(usuarioId, conexao);
  });
  if (resultado) await apagarDoBlob(urls);
  return resultado;
}
