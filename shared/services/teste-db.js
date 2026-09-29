const db = require('./db');

async function testarBanco() {
    const [usuarios] = await db.query('SELECT * FROM usuario');
    console.log(usuarios);
}

testarBanco();