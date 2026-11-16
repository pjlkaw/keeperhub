import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import db from '../../server/db.js';
import { usuarioDaSessao } from '../../server/auth-session.js';
import { usuarioTemAcesso } from '../../server/repositories/modulos.js';

// Compatibilidade com anexos antigos; novos arquivos usam URLs públicas diretas do Blob.
const TIPOS_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

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

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return res.status(401).json({ erro: 'Entre na sua conta para acessar o arquivo.' });
  if (!(await usuarioTemAcesso(usuarioId, 'pets'))) {
    return res.status(403).json({ erro: 'O módulo Pets não está ativo para esta conta.' });
  }

  const idArquivo = Number(req.query?.id);
  if (!Number.isSafeInteger(idArquivo) || idArquivo <= 0) {
    return res.status(400).json({ erro: 'Informe um arquivo válido.' });
  }

  try {
    const [arquivos] = await db.execute(
      `SELECT nome_original AS nome, mime_type AS tipo, url
         FROM arquivo
        WHERE id_arquivo = ? AND usuario_id = ?
          AND entidade_tipo IN ('exame', 'pet_receita')
        LIMIT 1`,
      [idArquivo, usuarioId]
    );
    const arquivo = arquivos[0];
    if (!arquivo || !TIPOS_PERMITIDOS.has(arquivo.tipo)) {
      return res.status(404).json({ erro: 'Arquivo não encontrado.' });
    }

    let stream;
    if (urlPublicaLegada(arquivo.url)) {
      const resposta = await fetch(arquivo.url, { redirect: 'error' });
      if (!resposta.ok || !resposta.body) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
      stream = resposta.body;
    } else {
      const token = process.env.PETS_BLOB_READ_WRITE_TOKEN;
      if (!token) return res.status(503).json({ erro: 'O acesso a este arquivo privado antigo não está configurado.' });
      const blob = await get(arquivo.url, { access: 'private', token });
      if (!blob || blob.statusCode !== 200) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
      stream = blob.stream;
    }

    const nomeSeguro = encodeURIComponent(String(arquivo.nome || 'documento').replace(/[\r\n]/g, ''));
    res.setHeader('Content-Type', arquivo.tipo);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${nomeSeguro}`);
    res.status(200);
    Readable.fromWeb(stream).on('error', erro => {
      console.error('Não foi possível transmitir o anexo do pet:', erro);
      res.destroy(erro);
    }).pipe(res);
  } catch (erro) {
    console.error('Não foi possível acessar o anexo do pet:', erro);
    return res.status(500).json({ erro: 'Não foi possível abrir o arquivo agora.' });
  }
}
