async function requisitar(url, options = {}) {
    const resposta = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
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

function urlRecurso(recurso, id) {
    const parametros = new URLSearchParams({ recurso });
    if (id) parametros.set('id', String(id));
    return `/api/modulos/financas-api?${parametros}`;
}

export async function listarContasApi() {
    const dados = await requisitar(urlRecurso('contas'));
    return Array.isArray(dados?.contas) ? dados.contas : [];
}

export async function criarContaApi(conta) {
    const dados = await requisitar(urlRecurso('contas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: conta.nome, tipo: conta.tipo })
    });
    return dados;
}

export async function atualizarContaApi(id, conta) {
    return requisitar(urlRecurso('contas', id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: conta.nome, tipo: conta.tipo })
    });
}

export async function excluirContaApi(id) {
    return requisitar(urlRecurso('contas', id), { method: 'DELETE' });
}

export async function listarTransacoesApi() {
    const dados = await requisitar(urlRecurso('transacoes'));
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
    return requisitar(urlRecurso('transacoes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoTransacao(transacao))
    });
}

export async function atualizarTransacaoApi(id, transacao) {
    return requisitar(urlRecurso('transacoes', id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoTransacao(transacao))
    });
}

export async function excluirTransacaoApi(id) {
    return requisitar(urlRecurso('transacoes', id), { method: 'DELETE' });
}
