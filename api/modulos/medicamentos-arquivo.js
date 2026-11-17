import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import db from '../../server/db.js';
import { usuarioDaSessao } from '../../server/auth-session.js';
import { usuarioTemAcesso } from '../../server/repositories/modulos.js';

const TIPOS_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function urlPublicaLegada(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return res.status(401).json({ erro: 'Entre na sua conta para acessar o arquivo.' });

  try {
    if (!(await usuarioTemAcesso(usuarioId, 'medicamentos'))) {
      return res.status(403).json({ erro: 'O módulo Medicamentos não está ativo para esta conta.' });
    }

    const idArquivo = Number(req.query?.id);
    if (!Number.isSafeInteger(idArquivo) || idArquivo <= 0) {
      return res.status(400).json({ erro: 'Informe um arquivo válido.' });
    }

    const [arquivos] = await db.execute(
      `SELECT nome_original AS nome, mime_type AS tipo, url
         FROM arquivo
        WHERE id_arquivo = ? AND usuario_id = ?
          AND entidade_tipo = 'receita'
        LIMIT 1`,
      [idArquivo, usuarioId],
    );
    const arquivo = arquivos[0];
    if (!arquivo || !TIPOS_PERMITIDOS.has(arquivo.tipo)) {
      return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    }

    let stream;
    if (urlPublicaLegada(arquivo.url)) {
      const resposta = await fetch(arquivo.url, { redirect: 'error' });
      if (!resposta.ok || !resposta.body) {
        return res.status(404).json({ erro: 'Arquivo não encontrado.' });
      }
      stream = resposta.body;
    } else {
      const blob = await get(arquivo.url, { access: 'private' });
      if (!blob || blob.statusCode !== 200) {
        return res.status(404).json({ erro: 'Arquivo não encontrado.' });
      }
      stream = blob.stream;
    }

    const nomeSeguro = encodeURIComponent(String(arquivo.nome || 'documento').replace(/[\r\n]/g, ''));
    res.setHeader('Content-Type', arquivo.tipo);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${nomeSeguro}`);
    res.status(200);
    Readable.fromWeb(stream).on('error', (erro) => {
      console.error('Não foi possível transmitir o anexo da receita:', erro.code || 'erro');
      res.destroy(erro);
    }).pipe(res);
  } catch (erro) {
    console.error('Não foi possível acessar o anexo da receita:', erro.code || 'erro');
    return res.status(500).json({ erro: 'Não foi possível abrir o arquivo agora.' });
  }
}
