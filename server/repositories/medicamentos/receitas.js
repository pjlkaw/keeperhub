import db from '../../db.js';
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const MAX_ANEXO_BYTES = 1024 * 1024;
const TIPOS_ANEXO = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function dataTexto(valor) {
  if (!valor) return '';
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

function mapearReceita(linha, anexos = []) {
  return {
    id: String(linha.id),
    titulo: linha.titulo,
    profissional: linha.medico_nome || '',
    especialidade: linha.especialidade || '',
    data: dataTexto(linha.data_receita),
    validade: dataTexto(linha.data_validade),
    status: linha.status,
    medicamentoId: linha.medicamento_id == null ? '' : String(linha.medicamento_id),
    medicamento: linha.medicamento || '',
    anexos,
  };
}

export async function listarReceitas(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT r.id_receita AS id, r.titulo, r.medico_nome, r.especialidade,
            r.data_receita, r.data_validade, r.status,
            rm.medicamento_id, CONCAT(i.nome, IF(m.concentracao IS NULL OR m.concentracao = '', '',
              CONCAT(' ', m.concentracao))) AS medicamento
       FROM receita r
       LEFT JOIN receita_medicamento rm ON rm.receita_id = r.id_receita
       LEFT JOIN medicamento m ON m.id_medicamento = rm.medicamento_id
       LEFT JOIN item i ON i.id_item = m.item_id
      WHERE r.usuario_id = ?
      ORDER BY r.data_receita DESC, r.id_receita DESC`,
    [usuarioId],
  );
  return Promise.all(linhas.map(async (linha) => mapearReceita(linha, await listarAnexos(linha.id))));
}

export async function buscarReceita(idReceita, usuarioId) {
  const receitas = await listarReceitas(usuarioId);
  return receitas.find((receita) => receita.id === String(idReceita)) || null;
}

async function listarAnexos(receitaId) {
  const [linhas] = await db.execute(
    `SELECT id_arquivo AS id, nome_original AS nome, mime_type AS tipo, tamanho_bytes AS tamanho, url
       FROM arquivo
      WHERE entidade_tipo = 'receita' AND entidade_id = ?
      ORDER BY id_arquivo`,
    [receitaId],
  );
  return linhas.map((linha) => ({ ...linha, id: String(linha.id), tamanho: Number(linha.tamanho || 0) }));
}

function validarAnexo(anexo) {
  if (!anexo || typeof anexo.nome !== 'string' || typeof anexo.tipo !== 'string' ||
      typeof anexo.conteudo !== 'string' || !TIPOS_ANEXO.has(anexo.tipo)) {
    const erro = new Error('Anexo de receita inválido.');
    erro.statusCode = 400;
    throw erro;
  }
  const separador = anexo.conteudo.indexOf(',');
  const base64 = separador >= 0 ? anexo.conteudo.slice(separador + 1) : anexo.conteudo;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_ANEXO_BYTES) {
    const erro = new Error('Cada anexo deve ter até 1 MB.');
    erro.statusCode = 400;
    throw erro;
  }
  return { ...anexo, buffer };
}

export async function criarReceita(usuarioId, dados) {
  const titulo = typeof dados.titulo === 'string' ? dados.titulo.trim() : '';
  const profissional = typeof dados.profissional === 'string' ? dados.profissional.trim() : '';
  const especialidade = typeof dados.especialidade === 'string' ? dados.especialidade.trim() : '';
  const data = typeof dados.data === 'string' && dados.data ? dados.data : null;
  const medicamentoId = dados.medicamentoId ? Number(dados.medicamentoId) : null;
  const anexos = Array.isArray(dados.anexos) ? dados.anexos.map(validarAnexo) : [];

  if (!titulo || titulo.length > 150 || !profissional || profissional.length > 150 ||
      especialidade.length > 120 || anexos.length > 10) {
    const erro = new Error('Confira os dados da receita.');
    erro.statusCode = 400;
    throw erro;
  }
  if (anexos.reduce((total, anexo) => total + anexo.buffer.length, 0) > MAX_ANEXO_BYTES) {
    const erro = new Error('Os anexos precisam ter até 1 MB no total.');
    erro.statusCode = 400;
    throw erro;
  }

  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    if (medicamentoId) {
      const [medicamentos] = await conexao.execute(
        `SELECT m.id_medicamento FROM medicamento m
          JOIN item i ON i.id_item = m.item_id
         WHERE m.id_medicamento = ? AND i.usuario_id = ? AND i.tipo_item = 'medicamento'`,
        [medicamentoId, usuarioId],
      );
      if (!medicamentos.length) throw new Error('Medicamento não encontrado.');
    }
    const [resultado] = await conexao.execute(
      `INSERT INTO receita (usuario_id, titulo, medico_nome, especialidade, data_receita)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, titulo, profissional, especialidade || null, data],
    );
    if (medicamentoId) {
      await conexao.execute(
        'INSERT INTO receita_medicamento (receita_id, medicamento_id) VALUES (?, ?)',
        [resultado.insertId, medicamentoId],
      );
    }
    for (const anexo of anexos) {
      const url = (await put(`usuarios/${usuarioId}/receitas/${randomUUID()}-${anexo.nome}`, anexo.buffer, {
        access: 'public',
        contentType: anexo.tipo,
      })).url;
      await conexao.execute(
        `INSERT INTO arquivo
          (usuario_id, entidade_tipo, entidade_id, nome_original, mime_type, tamanho_bytes, url)
         VALUES (?, 'receita', ?, ?, ?, ?, ?)`,
        [usuarioId, resultado.insertId, anexo.nome.slice(0, 255), anexo.tipo, anexo.buffer.length, url],
      );
    }
    await conexao.commit();
    return buscarReceita(resultado.insertId, usuarioId);
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
