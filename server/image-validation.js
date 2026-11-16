import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
// Permite fotos recentes de celular (inclusive 48 MP), sem aceitar imagens enormes.
const MAX_IMAGE_DIMENSION = 10000;
const MAX_IMAGE_PIXELS = 50_000_000;
const NSFW_THRESHOLD = 0.75;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

let modelPromise;

function carregarModelo() {
  modelPromise ||= nsfwjs.load();
  return modelPromise;
}

export async function validarFoto(dataUrl) {
  if (typeof dataUrl !== 'string') {
    return { erro: 'A imagem do perfil é inválida.' };
  }

  const separador = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:image/') || separador === -1) {
    return { erro: 'Use uma imagem JPG, PNG ou WebP.' };
  }

  const buffer = Buffer.from(dataUrl.slice(separador + 1), 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
    return { erro: 'A imagem deve ter no máximo 5 MB.' };
  }

  let metadados;
  try {
    metadados = await sharp(buffer).metadata();
  } catch {
    return { erro: 'A imagem do perfil é inválida.' };
  }

  if (!ALLOWED_FORMATS.has(metadados.format)) {
    return { erro: 'Use uma imagem JPG, PNG ou WebP.' };
  }
  if (
    !metadados.width
    || !metadados.height
    || metadados.width > MAX_IMAGE_DIMENSION
    || metadados.height > MAX_IMAGE_DIMENSION
    || metadados.width * metadados.height > MAX_IMAGE_PIXELS
  ) {
    return { erro: 'A imagem deve ter até 10.000 pixels por lado e no máximo 50 megapixels.' };
  }

  const modelo = await carregarModelo();
  // Reduz apenas a cópia usada na classificação; a foto armazenada mantém o enquadramento original.
  const pixels = await sharp(buffer)
    .rotate()
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const imagem = tf.tensor3d(
    new Uint8Array(pixels.data),
    [pixels.info.height, pixels.info.width, pixels.info.channels]
  );
  try {
    const classificacoes = await modelo.classify(imagem);
    const conteudoBloqueado = classificacoes.some(
      ({ className, probability }) =>
        (className === 'Porn' || className === 'Hentai') && probability >= NSFW_THRESHOLD
    );

    return conteudoBloqueado
      ? { erro: 'A imagem contém conteúdo impróprio para foto de perfil.' }
      : { buffer: await sharp(buffer).rotate().webp({ quality: 82 }).toBuffer(), contentType: 'image/webp' };
  } finally {
    imagem.dispose();
  }
}
