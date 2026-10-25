import {
    atualizarTransacao,
    criarTransacao,
    excluirTransacao,
    idValido,
    listarTransacoes
} from '../../server/repositories/financas.js';

const TIPOS = new Set(['receita', 'despesa']);
const STATUS = new Set(['pending', 'pendente', 'pago']);

function dadosTransacao(body) {
    const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : '';
    const valor = Number(body?.valor);
    const contaId = idValido(body?.conta_id);
    const descricao = typeof body?.descricao === 'string' ? body.descricao.trim() : '';
    const categoria = typeof body?.categoria === 'string' ? body.categoria.trim() : '';
    const data = typeof body?.data === 'string' ? body.data.trim() : '';
    const status = typeof body?.status === 'string' ? body.status.trim() : 'pending';
    const vencimento = body?.vencimento ? String(body.vencimento).trim() : null;
    const observacoes = body?.observacoes ? String(body.observacoes).trim() : null;

    if (!TIPOS.has(tipo) || !Number.isFinite(valor) || valor <= 0 || !contaId
        || !descricao || !categoria || !/^\d{4}-\d{2}-\d{2}$/.test(data)
        || !STATUS.has(status)) {
        return null;
    }
    if (vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) return null;
    return { tipo, valor, conta_id: contaId, descricao, categoria, data, status, vencimento, observacoes };
}

function usuarioId(req) {
    return idValido(req.query?.usuario_id);
}

export default async function handler(req, res) {
    try {
        const usuario = usuarioId(req);
        if (!usuario) {
            return res.status(400).json({ erro: 'Informe um usuário válido.' });
        }

        if (req.method === 'GET') {
            return res.status(200).json({ transacoes: await listarTransacoes(usuario) });
        }

        const transacaoId = idValido(req.query?.id);
        if (req.method === 'POST') {
            const dados = dadosTransacao(req.body);
            if (!dados) return res.status(400).json({ erro: 'Dados da transação inválidos.' });
            const resultado = await criarTransacao(usuario, dados);
            return res.status(201).json({ id: resultado.insertId, ...dados });
        }

        if (!transacaoId) return res.status(400).json({ erro: 'Informe uma transação válida.' });
        if (req.method === 'PUT') {
            const dados = dadosTransacao(req.body);
            if (!dados) return res.status(400).json({ erro: 'Dados da transação inválidos.' });
            const resultado = await atualizarTransacao(usuario, transacaoId, dados);
            return resultado.affectedRows
                ? res.status(200).json({ id: transacaoId, ...dados })
                : res.status(404).json({ erro: 'Transação não encontrada.' });
        }

        if (req.method === 'DELETE') {
            const resultado = await excluirTransacao(usuario, transacaoId);
            return resultado.affectedRows
                ? res.status(204).end()
                : res.status(404).json({ erro: 'Transação não encontrada.' });
        }

        return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (erro) {
        console.error('Erro na API de transações financeiras:', erro);
        return res.status(500).json({ erro: 'Erro ao acessar transações financeiras.' });
    }
}
