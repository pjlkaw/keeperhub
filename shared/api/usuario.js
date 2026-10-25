export const AUTH_STORAGE_KEY = 'keeperhub-auth-session';

// O localStorage guarda somente dados de apresentacao. A autenticacao usa o cookie
// HttpOnly emitido pelo servidor, que nao pode ser lido nem fabricado pelo JavaScript.
function criarSessao(usuario) {
    const sessao = {
        name: usuario.nome_usuario,
        email: usuario.email_usuario,
        phone: usuario.numero_usuario || '',
        dt_nascimento: usuario.dt_nascimento_usuario || '',
        gender: usuario.genero_usuario || '',
        foto_usuario: usuario.foto_usuario || ''
    };

    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessao));
    } catch {
        // A sessao segura continua funcionando mesmo se o armazenamento local falhar.
    }
    return sessao;
}

export function lerSessaoUsuario() {
    try {
        const sessao = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
        return sessao && typeof sessao.email === 'string' ? sessao : null;
    } catch {
        return null;
    }
}

async function requisitarJson(url, options = {}) {
    const resposta = await fetch(url, {
        credentials: 'same-origin',
        ...options
    });
    let dados = {};
    try {
        dados = await resposta.json();
    } catch {
        if (resposta.ok) {
            throw new Error('O servidor retornou uma resposta invalida.');
        }
    }

    if (!resposta.ok) {
        if (resposta.status === 401) {
            try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* cache opcional */ }
        }
        const erro = new Error(dados.erro || `A requisicao falhou (HTTP ${resposta.status}).`);
        erro.status = resposta.status;
        throw erro;
    }
    return dados;
}

export async function loginUsuario(email, senha) {
    const dados = await requisitarJson('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
    });

    criarSessao(dados.usuario);
    return dados;
}

export async function criarUsuario(usuario) {
    const dados = await requisitarJson('/api/usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
    });

    criarSessao(dados.usuario);
    return dados;
}

export async function carregarUsuarioAtual() {
    const dados = await requisitarJson('/api/usuario');
    criarSessao(dados.usuario);
    return dados.usuario;
}

export async function atualizarUsuarioAtual(usuario) {
    const dados = await requisitarJson('/api/usuario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
    });

    criarSessao(dados.usuario);
    return dados.usuario;
}

export async function encerrarSessaoUsuario() {
    try {
        await requisitarJson('/api/logout', { method: 'POST' });
    } finally {
        try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* cache opcional */ }
    }
}
