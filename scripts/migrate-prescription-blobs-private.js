import { del, get, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import db from '../server/db.js';

const EXTENSOES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_ANEXO_BYTES = 1024 * 1024;
const TAMANHO_LOTE = 100;

function urlPublicaLegada(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

async function streamParaBuffer(stream) {
  const reader = stream.getReader();
  const partes = [];
  let tamanho = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    tamanho += value.byteLength;
    if (tamanho > MAX_ANEXO_BYTES) {
      await reader.cancel();
      throw new Error('O anexo excede o limite esperado.');
    }
    partes.push(Buffer.from(value));
  }

  return Buffer.concat(partes);
}

async function migrarAnexo(arquivo) {
  if (!urlPublicaLegada(arquivo.url) || !EXTENSOES[arquivo.tipo]) {
    throw new Error('O anexo não é um blob público de receita compatível.');
  }

  let novaUrl = '';
  let bancoApontaParaNovaUrl = false;
  try {
    const blob = await get(arquivo.url, { access: 'public' });
    if (!blob || blob.statusCode !== 200) throw new Error('Não foi possível ler o blob público.');

    const conteudo = await streamParaBuffer(blob.stream);
    if (!conteudo.length) throw new Error('O anexo está vazio.');

    novaUrl = (await put(
      `usuarios/${arquivo.usuarioId}/receitas/${randomUUID()}.${EXTENSOES[arquivo.tipo]}`,
      conteudo,
      { access: 'private', contentType: arquivo.tipo },
    )).url;

    const [resultado] = await db.execute(
      `UPDATE arquivo SET url = ?
        WHERE id_arquivo = ? AND usuario_id = ?
          AND entidade_tipo = 'receita' AND url = ?`,
      [novaUrl, arquivo.id, arquivo.usuarioId, arquivo.url],
    );
    if (resultado.affectedRows !== 1) {
      throw new Error('O registro do anexo mudou durante a migração.');
    }
    bancoApontaParaNovaUrl = true;

    await del(arquivo.url);
    return true;
  } catch (erro) {
    if (novaUrl && !bancoApontaParaNovaUrl) {
      try {
        const [registros] = await db.execute(
          `SELECT url FROM arquivo
            WHERE id_arquivo = ? AND usuario_id = ?
              AND entidade_tipo = 'receita'`,
          [arquivo.id, arquivo.usuarioId],
        );
        bancoApontaParaNovaUrl = registros[0]?.url === novaUrl;
      } catch {
        bancoApontaParaNovaUrl = true;
      }
    }

    if (bancoApontaParaNovaUrl) {
      try {
        const [resultado] = await db.execute(
          `UPDATE arquivo SET url = ?
            WHERE id_arquivo = ? AND usuario_id = ?
              AND entidade_tipo = 'receita' AND url = ?`,
          [arquivo.url, arquivo.id, arquivo.usuarioId, novaUrl],
        );
        bancoApontaParaNovaUrl = resultado.affectedRows !== 1;
      } catch {
        bancoApontaParaNovaUrl = true;
      }
    }

    if (bancoApontaParaNovaUrl) {
      console.error(`ATENÇÃO: não foi possível restaurar o registro do anexo ${arquivo.id}; verifique se o blob público antigo foi removido.`);
    }

    if (novaUrl && !bancoApontaParaNovaUrl) {
      try {
        await del(novaUrl);
      } catch {
        console.error(`Não foi possível remover o blob privado temporário do anexo ${arquivo.id}.`);
      }
    }
    throw erro;
  }
}

async function main() {
  const aplicar = process.argv.includes('--apply');
  let cursor = 0;
  let encontrados = 0;
  let migrados = 0;
  let falhas = 0;

  while (true) {
    const [linhas] = await db.execute(
      `SELECT id_arquivo AS id, usuario_id AS usuarioId, mime_type AS tipo, url
         FROM arquivo
        WHERE entidade_tipo = 'receita' AND id_arquivo > ?
        ORDER BY id_arquivo
        LIMIT ?`,
      [cursor, TAMANHO_LOTE],
    );
    if (!linhas.length) break;
    cursor = Number(linhas[linhas.length - 1].id);

    const anexosPublicos = linhas.filter((arquivo) => urlPublicaLegada(arquivo.url));
    encontrados += anexosPublicos.length;
    if (!aplicar) continue;

    for (const arquivo of anexosPublicos) {
      try {
        await migrarAnexo(arquivo);
        migrados += 1;
        console.log(`Anexo ${arquivo.id} migrado para acesso privado.`);
      } catch (erro) {
        falhas += 1;
        console.error(`Falha ao migrar o anexo ${arquivo.id}: ${erro.code || erro.name || 'erro desconhecido'}`);
      }
    }
  }

  if (!aplicar) {
    console.log(`${encontrados} anexo(s) público(s) encontrado(s). Nenhuma alteração foi feita.`);
    console.log('Após implantar a versão com suporte a anexos privados, execute novamente com --apply.');
    return;
  }

  console.log(`Migração concluída: ${migrados} migrado(s), ${falhas} falha(s), ${encontrados} encontrado(s).`);
  if (falhas) process.exitCode = 1;
}

try {
  await main();
} finally {
  await db.end();
}
