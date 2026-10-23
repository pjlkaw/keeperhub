import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

export async function armazenarFoto({ buffer, contentType }) {
  const arquivo = await put(`usuarios/${randomUUID()}.webp`, buffer, {
    access: 'public',
    contentType
  });
  return arquivo.url;
}
