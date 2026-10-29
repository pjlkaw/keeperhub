import { lerSessaoUsuario } from '../../../shared/api/usuario.js';

function obterUsuarioId() {
    return lerSessaoUsuario()?.id_usuario || null;
}

async function requisitar(url, options = {}) {
    const resposta = await fetch(url, options);
    let dados = null;
    try {
        dados = resposta.status === 204 ? null : await resposta.json();
    } catch {
        dados = null;
    }
    if (!resposta.ok) {
        throw new Error(dados?.erro || 'Não foi possível acessar a API de Finanças.');
    }
    return dados;
}

function urlContas(id) {
    const usuarioId = obterUsuarioId();
    if (!usuarioId) return null;
    const parametros = new URLSearchParams({ usuario_id: String(usuarioId) });
    if (id) parametros.set('id', String(id));
    return `/api/financas/contas?${parametros}`;
}

function urlTransacoes(id) {
    const usuarioId = obterUsuarioId();
    if (!usuarioId) return null;
    const parametros = new URLSearchParams({ usuario_id: String(usuarioId) });
    if (id) parametros.set('id', String(id));
    return `/api/financas/transacoes?${parametros}`;
}

export function apiDisponivel() {
    return Boolean(obterUsuarioId());
}

export async function listarContasApi() {
    const url = urlContas();
    if (!url) throw new Error('Usuário não autenticado.');
    const dados = await requisitar(url);
    return Array.isArray(dados?.contas) ? dados.contas : [];
}

export async function criarContaApi(conta) {
    const url = urlContas();
    if (!url) throw new Error('Usuário não autenticado.');
    const dados = await requisitar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: conta.nome, tipo: conta.tipo })
    });
    return dados;
}

export async function atualizarContaApi(id, conta) {
    const url = urlContas(id);
    if (!url) throw new Error('Usuário não autenticado.');
    return requisitar(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: conta.nome, tipo: conta.tipo })
    });
}

export async function excluirContaApi(id) {
    const url = urlContas(id);
    if (!url) throw new Error('Usuário não autenticado.');
    return requisitar(url, { method: 'DELETE' });
}

export async function listarTransacoesApi() {
    const url = urlTransacoes();
    if (!url) throw new Error('Usuário não autenticado.');
    const dados = await requisitar(url);
    return Array.isArray(dados?.transacoes) ? dados.transacoes : [];
}

function corpoTransacao(transacao) {
    return {
        conta_id: Number(transacao.conta_id),
        tipo: transacao.tipo,
        valor: Number(transacao.valor),
        descricao: transacao.descricao,
        categoria: transacao.categoria,
        data: transacao.data,
        vencimento: transacao.vencimento || null,
        status: transacao.status || 'pending',
        observacoes: transacao.observacoes || null
    };
}

export async function criarTransacaoApi(transacao) {
    const url = urlTransacoes();
    if (!url) throw new Error('Usuário não autenticado.');
    return requisitar(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoTransacao(transacao))
    });
}

export async function atualizarTransacaoApi(id, transacao) {
    const url = urlTransacoes(id);
    if (!url) throw new Error('Usuário não autenticado.');
    return requisitar(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoTransacao(transacao))
    });
}

export async function excluirTransacaoApi(id) {
    const url = urlTransacoes(id);
    if (!url) throw new Error('Usuário não autenticado.');
    return requisitar(url, { method: 'DELETE' });
}
