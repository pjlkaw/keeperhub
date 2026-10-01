// Consulta de usuário no banco de dados
import db from '../db.js';

export async function buscarUsuario() {
    const [usuarios] = await db.query('SELECT * FROM usuario');
    return usuarios;
}