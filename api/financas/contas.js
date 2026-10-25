import {
    atualizarConta,
    criarConta,
    excluirConta,
    idValido,
    listarContas
} from '../../server/repositories/financas.js';

function dadosConta(body) {
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : '';
    return nome && tipo ? { nome, tipo } : null;
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
            return res.status(200).json({ contas: await listarContas(usuario) });
        }

        const contaId = idValido(req.query?.id);
        if (req.method === 'POST') {
            const dados = dadosConta(req.body);
            if (!dados) return res.status(400).json({ erro: 'Informe nome e tipo da conta.' });
            const resultado = await criarConta(usuario, dados);
            return res.status(201).json({ id: resultado.insertId, ...dados });
        }

        if (!contaId) return res.status(400).json({ erro: 'Informe uma conta válida.' });
        if (req.method === 'PUT') {
            const dados = dadosConta(req.body);
            if (!dados) return res.status(400).json({ erro: 'Informe nome e tipo da conta.' });
            const resultado = await atualizarConta(usuario, contaId, dados);
            return resultado.affectedRows
                ? res.status(200).json({ id: contaId, ...dados })
                : res.status(404).json({ erro: 'Conta não encontrada.' });
        }

        if (req.method === 'DELETE') {
            const resultado = await excluirConta(usuario, contaId);
            return resultado.affectedRows
                ? res.status(204).end()
                : res.status(404).json({ erro: 'Conta não encontrada.' });
        }

        return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (erro) {
        console.error('Erro na API de contas financeiras:', erro);
        return res.status(500).json({ erro: 'Erro ao acessar contas financeiras.' });
    }
}
