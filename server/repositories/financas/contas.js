import db from '../../db.js';

const TIPOS = new Set(['corrente', 'carteira', 'credito', 'investimento']);

export function normalizarTipoConta(tipo) {
    const valor = String(tipo || '').trim().toLowerCase();
    const tipoBanco = {
        'conta corrente': 'corrente',
        'poupança': 'investimento',
        'cartão': 'credito'
    }[valor] || valor;
    return TIPOS.has(tipoBanco) ? tipoBanco : null;
}

export function idValido(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export async function listarContas(usuarioId) {
    const [contas] = await db.query(
        `SELECT id_conta AS id, nome, tipo
         FROM conta
         WHERE usuario_id = ? AND ativo = 1
         ORDER BY nome ASC, id_conta ASC`,
        [usuarioId]
    );
    return contas.map((conta) => ({
        ...conta,
        tipo: { corrente: 'Conta corrente', carteira: 'Carteira', credito: 'Cartão', investimento: 'Poupança' }[conta.tipo]
    }));
}

export async function criarConta(usuarioId, dados) {
    const [resultado] = await db.query(
        `INSERT INTO conta (usuario_id, nome, tipo) VALUES (?, ?, ?)`,
        [usuarioId, dados.nome, dados.tipo]
    );
    return { id: resultado.insertId };
}

export async function atualizarConta(usuarioId, contaId, dados) {
    const [resultado] = await db.query(
        `UPDATE conta SET nome = ?, tipo = ?
         WHERE id_conta = ? AND usuario_id = ? AND ativo = 1`,
        [dados.nome, dados.tipo, contaId, usuarioId]
    );
    return resultado;
}

export async function excluirConta(usuarioId, contaId) {
    const [resultado] = await db.query(
        `UPDATE conta SET ativo = 0
         WHERE id_conta = ? AND usuario_id = ? AND ativo = 1
           AND NOT EXISTS (
               SELECT 1
               FROM lancamento
               WHERE conta_id = conta.id_conta
           )`,
        [contaId, usuarioId]
    );
    if (resultado.affectedRows) return resultado;

    const [contas] = await db.query(
        `SELECT id_conta
         FROM conta
         WHERE id_conta = ? AND usuario_id = ? AND ativo = 1
         LIMIT 1`,
        [contaId, usuarioId]
    );
    if (contas[0]) {
        const exception = new Error('Esta conta possui transações vinculadas e não pode ser excluída.');
        exception.code = 'ACCOUNT_HAS_TRANSACTIONS';
        throw exception;
    }
    return resultado;
}
