import db from '../../db.js';

const TIPOS = new Set(['receita', 'despesa']);
const STATUS = new Set(['pending', 'pago']);

function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

async function categoriaId(usuarioId, nome, tipo) {
    if (!nome) return null;
    const tipoCategoria = tipo === 'receita' ? 'receita' : 'despesa';
    const [existentes] = await db.query(
        `SELECT id_categoria
         FROM categoria_financeira
         WHERE usuario_id = ? AND nome = ? AND tipo IN (?, 'ambos') AND ativo = 1
         LIMIT 1`,
        [usuarioId, nome, tipoCategoria]
    );
    if (existentes[0]) return existentes[0].id_categoria;
    const [resultado] = await db.query(
        `INSERT INTO categoria_financeira (usuario_id, nome, tipo)
         VALUES (?, ?, ?)`,
        [usuarioId, nome, tipoCategoria]
    );
    return resultado.insertId;
}

function statusBanco(status) {
    return status === 'pago' ? 'pago' : 'pendente';
}

function statusFrontend(status) {
    return status === 'pago' ? 'pago' : 'pending';
}

export async function listarTransacoes(usuarioId) {
    const [transacoes] = await db.query(
        `SELECT l.id_lancamento AS id, l.tipo, l.valor, l.descricao,
                cf.nome AS categoria, l.conta_id, c.nome AS conta_nome,
                l.data, l.data_vencimento AS vencimento, l.status,
                l.observacoes
         FROM lancamento l
         INNER JOIN conta c ON c.id_conta = l.conta_id
         LEFT JOIN categoria_financeira cf ON cf.id_categoria = l.categoria_id
         WHERE c.usuario_id = ? AND c.ativo = 1
         ORDER BY l.data DESC, l.id_lancamento DESC`,
        [usuarioId]
    );
    return transacoes.map((transacao) => ({
        ...transacao,
        status: statusFrontend(transacao.status)
    }));
}

export async function criarTransacao(usuarioId, dados) {
    const categoriaIdRegistro = await categoriaId(usuarioId, dados.categoria, dados.tipo);
    const [resultado] = await db.query(
        `INSERT INTO lancamento
            (conta_id, categoria_id, valor, data, data_vencimento,
             descricao, observacoes, tipo, status)
         SELECT c.id_conta, ?, ?, ?, ?, ?, ?, ?, ?
         FROM conta c
         WHERE c.id_conta = ? AND c.usuario_id = ? AND c.ativo = 1`,
        [categoriaIdRegistro, dados.valor, dados.data, dados.vencimento,
            dados.descricao, dados.observacoes, dados.tipo, statusBanco(dados.status),
            dados.conta_id, usuarioId]
    );
    if (!resultado.affectedRows) {
        const erro = new Error('Conta financeira não encontrada.');
        erro.code = 'ACCOUNT_NOT_FOUND';
        throw erro;
    }
    return { id: resultado.insertId };
}

export async function atualizarTransacao(usuarioId, transacaoId, dados) {
    const categoriaIdRegistro = await categoriaId(usuarioId, dados.categoria, dados.tipo);
    const [resultado] = await db.query(
        `UPDATE lancamento l
         INNER JOIN conta c ON c.id_conta = ? AND c.usuario_id = ? AND c.ativo = 1
         SET l.conta_id = c.id_conta, l.categoria_id = ?, l.valor = ?,
             l.data = ?, l.data_vencimento = ?, l.descricao = ?,
             l.observacoes = ?, l.tipo = ?, l.status = ?
         WHERE l.id_lancamento = ? AND l.conta_id IN (
             SELECT id_conta FROM conta WHERE usuario_id = ?
         )`,
        [dados.conta_id, usuarioId, categoriaIdRegistro, dados.valor, dados.data,
            dados.vencimento, dados.descricao, dados.observacoes, dados.tipo,
            statusBanco(dados.status), transacaoId, usuarioId]
    );
    return resultado;
}

export async function excluirTransacao(usuarioId, transacaoId) {
    const [resultado] = await db.query(
        `DELETE l FROM lancamento l
         INNER JOIN conta c ON c.id_conta = l.conta_id
         WHERE l.id_lancamento = ? AND c.usuario_id = ?`,
        [transacaoId, usuarioId]
    );
    return resultado;
}

export { idValido, TIPOS, STATUS };
