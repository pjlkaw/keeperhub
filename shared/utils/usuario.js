// Busca de usuário no banco de dados
const db = require('../services/db');

async function buscarUsuario() {
    const [usuarios] = await db.query('SELECT * FROM usuario');
    return usuarios;
}

module.exports = { buscarUsuario };