import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

// A pasta padrão continua "usuarios"; outros módulos (ex.: pets) podem informar a sua.
export async function armazenarFoto({ buffer, contentType }, pasta = 'usuarios') {
  const arquivo = await put(`${pasta}/${randomUUID()}.webp`, buffer, {
    access: 'public',
    contentType
  });
  return arquivo.url;
}
