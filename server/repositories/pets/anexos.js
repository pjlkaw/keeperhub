// Anexos dos registros de pets (exames e receitas): arquivos no Vercel Blob e registro na
// tabela "arquivo" (entidade_tipo = 'exame' ou 'pet_receita'), como nas receitas de Medicamentos.
import { del, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export const LIMITES_ANEXOS = {
  quantidade: 10,
  bytesTotais: 1024 * 1024, // 1 MB somando todos os anexos do registro
};
export const TIPOS_ANEXO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ENTIDADES = new Set(['exame', 'pet_receita']);
const tokenPrivado = () => process.env.PETS_BLOB_READ_WRITE_TOKEN;
const ASSINATURAS_ANEXO = {
  'application/pdf': buffer => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  'image/jpeg': buffer => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': buffer => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': buffer => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
};

function entidadeValida(entidade) {
  if (!ENTIDADES.has(entidade)) throw new Error(`Tipo de anexo desconhecido: ${entidade}`);
  return entidade;
}

export function erroDeEntrada(mensagem) {
  const erro = new Error(mensagem);
  erro.statusCode = 400;
  return erro;
}

// Converte um anexo { nome, tipo, conteudo (base64 ou data URL) } em buffer.
export function validarAnexo(anexo) {
  if (!anexo || typeof anexo.nome !== 'string' || !anexo.nome.trim() ||
      typeof anexo.tipo !== 'string' || typeof anexo.conteudo !== 'string' ||
      !TIPOS_ANEXO.includes(anexo.tipo)) {
    throw erroDeEntrada('Envie o arquivo em PDF, JPG, PNG ou WEBP.');
  }
  const separador = anexo.conteudo.indexOf(',');
  const base64 = separador >= 0 ? anexo.conteudo.slice(separador + 1) : anexo.conteudo;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > LIMITES_ANEXOS.bytesTotais) {
    throw erroDeEntrada('Os anexos precisam ter até 1 MB no total.');
  }
  if (!ASSINATURAS_ANEXO[anexo.tipo](buffer)) {
    throw erroDeEntrada('O conteúdo do arquivo não corresponde ao formato informado.');
  }
  return { nome: anexo.nome.trim().slice(0, 255), tipo: anexo.tipo, buffer };
}

export function conferirLimitesAnexos(quantidade, bytes) {
  if (quantidade > LIMITES_ANEXOS.quantidade) {
    throw erroDeEntrada(`Cada registro pode ter até ${LIMITES_ANEXOS.quantidade} anexos.`);
  }
  if (bytes > LIMITES_ANEXOS.bytesTotais) {
    throw erroDeEntrada('Os anexos precisam ter até 1 MB no total.');
  }
}

export async function apagarDoBlob(urls) {
  for (const url of urls) {
    try {
      const privado = String(url).includes('.private.blob.vercel-storage.com');
      const token = privado ? tokenPrivado() : process.env.BLOB_READ_WRITE_TOKEN;
      if (token) await del(url, { token });
      else if (!privado) await del(url);
    } catch (erro) {
      console.error('Não foi possível apagar o anexo no Blob:', erro);
    }
  }
}

// Nome seguro para o caminho no Blob: sem acentos, barras ou símbolos, com no máximo 80 caracteres.
function nomeParaCaminho(nome) {
  const limpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return (limpo || 'arquivo').slice(-80);
}

// Envia os arquivos ao Blob antes da transação; se algum falhar, apaga os já enviados.
export async function enviarAnexos(usuarioId, pasta, anexos) {
  if (!anexos.length) return [];
  const enviados = [];
  try {
    for (const anexo of anexos) {
      const { url } = await put(`usuarios/${usuarioId}/${pasta}/${randomUUID()}-${nomeParaCaminho(anexo.nome)}`, anexo.buffer, {
        access: 'public',
        contentType: anexo.tipo,
      });
      enviados.push({ ...anexo, url });
    }
    return enviados;
  } catch (erro) {
    await apagarDoBlob(enviados.map(anexo => anexo.url));
    throw erro;
  }
}

export async function gravarAnexos(conexao, usuarioId, entidade, entidadeId, enviados) {
  for (const anexo of enviados) {
    await conexao.execute(
      `INSERT INTO arquivo
        (usuario_id, entidade_tipo, entidade_id, nome_original, mime_type, tamanho_bytes, url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, entidadeValida(entidade), entidadeId, anexo.nome, anexo.tipo, anexo.buffer.length, anexo.url]
    );
  }
}

// Anexos de um registro, travados para edição ou exclusão.
export async function anexosDoRegistro(conexao, usuarioId, entidade, entidadeId) {
  const [linhas] = await conexao.execute(
    `SELECT id_arquivo AS id, tamanho_bytes AS tamanho, url
       FROM arquivo
      WHERE usuario_id = ? AND entidade_tipo = ? AND entidade_id = ?
      FOR UPDATE`,
    [usuarioId, entidadeValida(entidade), entidadeId]
  );
  return linhas;
}

// Todos os anexos de um tipo do usuário: Map idDoRegistro -> [{ id, nome, tipo, tamanho, url }].
export async function listarAnexosPorRegistro(executor, usuarioId, entidade) {
  const [arquivos] = await executor.execute(
    `SELECT id_arquivo AS id, entidade_id AS registroId, nome_original AS nome,
            mime_type AS tipo, tamanho_bytes AS tamanho, url
       FROM arquivo
      WHERE usuario_id = ? AND entidade_tipo = ?
      ORDER BY id_arquivo`,
    [usuarioId, entidadeValida(entidade)]
  );
  const porRegistro = new Map();
  for (const arquivo of arquivos) {
    const chave = String(arquivo.registroId);
    const lista = porRegistro.get(chave) || [];
    let urlPublica = false;
    try {
      const url = new URL(arquivo.url);
      urlPublica = url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
    } catch {
      // URLs antigas inválidas continuam passando pela rota autenticada, que as rejeita.
    }
    lista.push({
      id: String(arquivo.id),
      nome: arquivo.nome,
      tipo: arquivo.tipo,
      tamanho: Number(arquivo.tamanho || 0),
      url: urlPublica
        ? arquivo.url
        : `/api/modulos/pets-arquivo?id=${encodeURIComponent(arquivo.id)}`,
    });
    porRegistro.set(chave, lista);
  }
  return porRegistro;
}

// Na edição: separa anexos mantidos e removidos, confere limites e apaga os removidos do banco.
// Devolve as URLs removidas, para apagar do Blob só depois do commit.
export async function substituirAnexos(conexao, usuarioId, entidade, entidadeId, enviados, idsRemover) {
  const atuais = await anexosDoRegistro(conexao, usuarioId, entidade, entidadeId);
  const remover = new Set(idsRemover.map(String));
  const removidos = atuais.filter(anexo => remover.has(String(anexo.id)));
  const mantidos = atuais.filter(anexo => !remover.has(String(anexo.id)));
  conferirLimitesAnexos(
    mantidos.length + enviados.length,
    mantidos.reduce((soma, anexo) => soma + Number(anexo.tamanho || 0), 0) +
      enviados.reduce((soma, anexo) => soma + anexo.buffer.length, 0)
  );
  for (const anexo of removidos) {
    await conexao.execute('DELETE FROM arquivo WHERE id_arquivo = ?', [anexo.id]);
  }
  await gravarAnexos(conexao, usuarioId, entidade, entidadeId, enviados);
  return removidos.map(anexo => anexo.url).filter(Boolean);
}

// Na exclusão do registro: apaga as linhas de "arquivo" e devolve as URLs para o Blob.
export async function excluirAnexosDoRegistro(conexao, usuarioId, entidade, entidadeId) {
  const anexos = await anexosDoRegistro(conexao, usuarioId, entidade, entidadeId);
  await conexao.execute(
    'DELETE FROM arquivo WHERE usuario_id = ? AND entidade_tipo = ? AND entidade_id = ?',
    [usuarioId, entidadeValida(entidade), entidadeId]
  );
  return anexos.map(anexo => anexo.url).filter(Boolean);
}
