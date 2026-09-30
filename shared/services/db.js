// db.js
// Responsabilidade: encapsular o acesso ao banco de dados e às operações de persistência.
// Deve reunir consultas, gravações, atualizações e remoções compartilhadas por vários módulos,
// mantendo a camada de dados centralizada e reutilizável.

// Responsabilidade: encapsular o acesso ao banco de dados e às operações de persistência.
// Deve reunir consultas, gravações, atualizações e remoções compartilhadas por vários módulos,
// mantendo a camada de dados centralizada e reutilizável.

require('dotenv').config({ path: '../../.env' });

const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

module.exports = db;

