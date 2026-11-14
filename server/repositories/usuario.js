// CRUD DE USUÁRIO
// consultas e operações SQL — criar, listar, buscar por ID, atualizar e excluir.

import db from '../db.js';

export async function buscarUsuario(id, executor = db) {
    const [usuarios] = await executor.query(
        `SELECT id_usuario, nome_usuario, email_usuario, telefone AS numero_usuario,
            genero_usuario, foto_usuario
        FROM usuario WHERE id_usuario = ? LIMIT 1`,
        [id]
    );
    return usuarios[0] ?? null;
}

export async function buscarUsuarioPorEmail(email) {
    const [usuarios] = await db.query(
        `SELECT id_usuario, nome_usuario, email_usuario, senha_usuario,
            telefone AS numero_usuario, genero_usuario, foto_usuario
        FROM usuario WHERE email_usuario = ? LIMIT 1`,
        [email]
    );
    return usuarios[0] ?? null;
}

export async function buscarUsuarioLoginSocial(provedor, identificadorExterno) {
    const [logins] = await db.query(
        `SELECT usuario_id FROM usuario_login_social
         WHERE provedor = ? AND identificador_externo = ? LIMIT 1`,
        [provedor, identificadorExterno]
    );
    return logins[0] ?? null;
}

export async function criarUsuarioLoginSocial({
    usuarioId, provedor, identificadorExterno, emailProvedor
}) {
    const [result] = await db.query(
        `INSERT INTO usuario_login_social
            (usuario_id, provedor, identificador_externo, email_provedor)
         VALUES (?, ?, ?, ?)`,
        [usuarioId, provedor, identificadorExterno, emailProvedor]
    );
    return result;
}

export async function buscarSenhaUsuario(id) {
    const [usuarios] = await db.query(
        'SELECT id_usuario, senha_usuario FROM usuario WHERE id_usuario = ? LIMIT 1',
        [id]
    );
    return usuarios[0] ?? null;
}

export async function criarUsuario(usuario, executor = db) {
    const {
        numero_usuario,
        foto_usuario,
        ...dados
    } = usuario;

    const [result] = await executor.query('INSERT INTO usuario SET ?', [{
        ...dados,
        telefone: numero_usuario,
        foto_usuario
    }]);
    return result;
}

export async function atualizarUsuario(id, usuario) {
    const dados = { ...usuario };

    if (Object.prototype.hasOwnProperty.call(dados, 'numero_usuario')) {
        dados.telefone = dados.numero_usuario;
        delete dados.numero_usuario;
    }

    const [result] = await db.query(
        'UPDATE usuario SET ? WHERE id_usuario = ?',
        [dados, id]
    );
    return result;
}

export async function excluirUsuario(id) {
    const [result] = await db.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
    return result;
}
