import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import db from '../server/db.js';

try {
  const [usuarios] = await db.query(
    "SELECT id_usuario, foto_usuario FROM usuario WHERE foto_usuario LIKE 'data:%'"
  );

  for (const usuario of usuarios) {
    const separador = usuario.foto_usuario.indexOf(',');
    if (separador === -1) {
      throw new Error(`Foto inválida para o usuário ${usuario.id_usuario}.`);
    }

    const imagem = await sharp(
      Buffer.from(usuario.foto_usuario.slice(separador + 1), 'base64')
    ).webp({ quality: 82 }).toBuffer();

    const arquivo = await put(`usuarios/${randomUUID()}.webp`, imagem, {
      access: 'public',
      contentType: 'image/webp'
    });

    await db.query(
      'UPDATE usuario SET foto_usuario = ? WHERE id_usuario = ?',
      [arquivo.url, usuario.id_usuario]
    );
    console.log(`Foto do usuário ${usuario.id_usuario} migrada.`);
  }

  console.log(`Migração concluída: ${usuarios.length} foto(s).`);
} finally {
  await db.end();
}
