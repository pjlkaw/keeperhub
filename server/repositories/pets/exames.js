// Consultas SQL dos exames e laudos dos pets (tabela pet_exame). Os anexos ficam no
// Vercel Blob e na tabela arquivo (entidade_tipo = 'exame'), pelo módulo anexos.js.
import db from '../../db.js';
import { emTransacao } from './transacao.js';
import {
  LIMITES_ANEXOS,
  apagarDoBlob,
  conferirLimitesAnexos,
  enviarAnexos,
  excluirAnexosDoRegistro,
  gravarAnexos,
  listarAnexosPorRegistro,
  substituirAnexos,
  validarAnexo,
} from './anexos.js';

const ENTIDADE = 'exame';

export const LIMITES_EXAME = {
  nome: 150,
  resultado: 5000,
  observacao: 2000,
  anexos: LIMITES_ANEXOS.quantidade,
  bytesTotais: LIMITES_ANEXOS.bytesTotais,
};
export { validarAnexo as validarAnexoExame };

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

export function mapearExame(linha, anexos = []) {
  return {
    id: String(linha.id),
    petId: String(linha.petId),
    nome: linha.nome,
    data: dataParaTexto(linha.dataExame),
    resultado: linha.resultado || '',
    observacao: linha.observacao || '',
    anexos,
  };
}

// Exames de todos os pets ativos do usuário (mais recentes primeiro), com os anexos.
export async function listarExamesPorPet(usuarioId, executor = db) {
  const [[exames], anexosPorExame] = await Promise.all([
    executor.execute(
      `SELECT e.id_exame AS id, e.pet_id AS petId, e.nome, e.data_exame AS dataExame,
              e.resultado, e.observacao
         FROM pet_exame e
         JOIN pet p ON p.id_pet = e.pet_id
        WHERE p.usuario_id = ? AND p.ativo = 1
        ORDER BY e.data_exame IS NULL, e.data_exame DESC, e.id_exame DESC`,
      [usuarioId]
    ),
    listarAnexosPorRegistro(executor, usuarioId, ENTIDADE),
  ]);

  const porPet = new Map();
  for (const linha of exames) {
    const exame = mapearExame(linha, anexosPorExame.get(String(linha.id)) || []);
    const lista = porPet.get(exame.petId) || [];
    lista.push(exame);
    porPet.set(exame.petId, lista);
  }
  return porPet;
}

function valoresExame(dados) {
  return [dados.nome, dados.data || null, dados.resultado || null, dados.observacao || null];
}

// Cadastra o exame de um pet com seus anexos. Retorna null se o pet não for do usuário.
export async function cadastrarExame(usuarioId, petId, dados, anexos = []) {
  conferirLimitesAnexos(anexos.length, anexos.reduce((soma, anexo) => soma + anexo.buffer.length, 0));
  const enviados = await enviarAnexos(usuarioId, 'exames', anexos);
  try {
    const resultado = await emTransacao(async conexao => {
      const [pets] = await conexao.execute(
        'SELECT id_pet FROM pet WHERE id_pet = ? AND usuario_id = ? AND ativo = 1 FOR UPDATE',
        [petId, usuarioId]
      );
      if (!pets.length) return null;
      const [inserido] = await conexao.execute(
        `INSERT INTO pet_exame (pet_id, nome, data_exame, resultado, observacao)
         VALUES (?, ?, ?, ?, ?)`,
        [petId, ...valoresExame(dados)]
      );
      await gravarAnexos(conexao, usuarioId, ENTIDADE, inserido.insertId, enviados);
      const examesPorPet = await listarExamesPorPet(usuarioId, conexao);
      return { examesPorPet, criado: String(inserido.insertId) };
    });
    if (!resultado) await apagarDoBlob(enviados.map(anexo => anexo.url));
    return resultado;
  } catch (erro) {
    await apagarDoBlob(enviados.map(anexo => anexo.url));
    throw erro;
  }
}

// Busca e trava o exame, só se for de um pet ativo do usuário.
async function exameDoUsuario(conexao, usuarioId, id) {
  const [linhas] = await conexao.execute(
    `SELECT e.id_exame AS id
       FROM pet_exame e
       JOIN pet p ON p.id_pet = e.pet_id
      WHERE e.id_exame = ? AND p.usuario_id = ? AND p.ativo = 1
      FOR UPDATE`,
    [id, usuarioId]
  );
  return linhas.length === 1;
}

// Edita os dados do exame, acrescenta anexos novos e remove os anexos indicados.
export async function atualizarExame(id, usuarioId, dados, novosAnexos = [], idsAnexosRemover = []) {
  // Confere os anexos novos antes do envio; o total com os já salvos é conferido na transação.
  conferirLimitesAnexos(novosAnexos.length, novosAnexos.reduce((soma, anexo) => soma + anexo.buffer.length, 0));
  const enviados = await enviarAnexos(usuarioId, 'exames', novosAnexos);
  let urlsRemovidas = [];
  try {
    const resultado = await emTransacao(async conexao => {
      if (!(await exameDoUsuario(conexao, usuarioId, id))) return null;
      await conexao.execute(
        `UPDATE pet_exame SET nome = ?, data_exame = ?, resultado = ?, observacao = ?
          WHERE id_exame = ?`,
        [...valoresExame(dados), id]
      );
      urlsRemovidas = await substituirAnexos(conexao, usuarioId, ENTIDADE, id, enviados, idsAnexosRemover);
      return listarExamesPorPet(usuarioId, conexao);
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

// Exclui o exame e os anexos (banco e Blob).
export async function excluirExame(id, usuarioId) {
  let urls = [];
  const resultado = await emTransacao(async conexao => {
    if (!(await exameDoUsuario(conexao, usuarioId, id))) return null;
    urls = await excluirAnexosDoRegistro(conexao, usuarioId, ENTIDADE, id);
    await conexao.execute('DELETE FROM pet_exame WHERE id_exame = ?', [id]);
    return listarExamesPorPet(usuarioId, conexao);
  });
  if (resultado) await apagarDoBlob(urls);
  return resultado;
}
