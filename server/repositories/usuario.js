// CRUD DE USUÁRIO
// consultas e operações SQL — criar, listar, buscar por ID, atualizar e excluir.

// Consulta de todos os usuários no banco de dados
import db from '../db.js';

export async function buscarUsuario() {
    const [usuarios] = await db.query('SELECT * FROM usuario');
    return usuarios;
}

export async function buscarUsuarioPorId(id) {
    const [usuario] = await db.query('SELECT * FROM usuario WHERE id_usuario = ?', [id]);
    return usuario[0];
}

export async function buscarUsuarioPorEmail(email) {
    const [usuarios] = await db.query('SELECT * FROM usuario WHERE email_usuario = ? LIMIT 1', [email]);
    return usuarios[0];
}

export async function criarUsuario(usuario) {
    const [result] = await db.query('INSERT INTO usuario SET ?', [usuario]);
    return result;
}

export async function atualizarUsuario(id, usuario) {
    const [result] = await db.query('UPDATE usuario SET ? WHERE id_usuario = ?', [usuario, id]);
    return result;
}

export async function excluirUsuario(id) {
    const [result] = await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
    return result;
}