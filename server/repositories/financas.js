import db from '../db.js';

function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function listarContas(usuarioId) {
    const [contas] = await db.query(
        `SELECT id_conta AS id, nome, tipo
         FROM conta_financeira
         WHERE id_usuario = ?
         ORDER BY nome ASC, id_conta ASC`,
        [usuarioId]
    );
    return contas;
}

export async function criarConta(usuarioId, dados) {
    const [resultado] = await db.query(
        `INSERT INTO conta_financeira (id_usuario, nome, tipo)
         VALUES (?, ?, ?)`,
        [usuarioId, dados.nome, dados.tipo]
    );
    return resultado;
}

export async function atualizarConta(usuarioId, contaId, dados) {
    const [resultado] = await db.query(
        `UPDATE conta_financeira
         SET nome = ?, tipo = ?, atualizada_em = CURRENT_TIMESTAMP
         WHERE id_conta = ? AND id_usuario = ?`,
        [dados.nome, dados.tipo, contaId, usuarioId]
    );
    return resultado;
}

export async function excluirConta(usuarioId, contaId) {
    const [resultado] = await db.query(
        `DELETE FROM conta_financeira
         WHERE id_conta = ? AND id_usuario = ?`,
        [contaId, usuarioId]
    );
    return resultado;
}

export async function listarTransacoes(usuarioId) {
    const [transacoes] = await db.query(
        `SELECT t.id_transacao AS id,
                t.tipo,
                t.valor,
                t.descricao,
                t.categoria,
                t.id_conta AS conta_id,
                c.nome AS conta_nome,
                t.data_transacao AS data,
                t.data_vencimento AS vencimento,
                t.status,
                t.observacoes
         FROM transacao_financeira t
         LEFT JOIN conta_financeira c
           ON c.id_conta = t.id_conta AND c.id_usuario = t.id_usuario
         WHERE t.id_usuario = ?
         ORDER BY t.data_transacao DESC, t.id_transacao DESC`,
        [usuarioId]
    );
    return transacoes;
}

export async function criarTransacao(usuarioId, dados) {
    const [resultado] = await db.query(
        `INSERT INTO transacao_financeira
            (id_usuario, id_conta, tipo, valor, descricao, categoria,
             data_transacao, data_vencimento, status, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            usuarioId,
            dados.conta_id,
            dados.tipo,
            dados.valor,
            dados.descricao,
            dados.categoria,
            dados.data,
            dados.vencimento || null,
            dados.status,
            dados.observacoes || null
        ]
    );
    return resultado;
}

export async function atualizarTransacao(usuarioId, transacaoId, dados) {
    const [resultado] = await db.query(
        `UPDATE transacao_financeira
         SET id_conta = ?, tipo = ?, valor = ?, descricao = ?, categoria = ?,
             data_transacao = ?, data_vencimento = ?, status = ?, observacoes = ?,
             atualizada_em = CURRENT_TIMESTAMP
         WHERE id_transacao = ? AND id_usuario = ?`,
        [
            dados.conta_id,
            dados.tipo,
            dados.valor,
            dados.descricao,
            dados.categoria,
            dados.data,
            dados.vencimento || null,
            dados.status,
            dados.observacoes || null,
            transacaoId,
            usuarioId
        ]
    );
    return resultado;
}

export async function excluirTransacao(usuarioId, transacaoId) {
    const [resultado] = await db.query(
        `DELETE FROM transacao_financeira
         WHERE id_transacao = ? AND id_usuario = ?`,
        [transacaoId, usuarioId]
    );
    return resultado;
}

export { idValido };
