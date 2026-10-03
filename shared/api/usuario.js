export const AUTH_STORAGE_KEY = 'keeperhub-auth-session';

function criarSessao(usuario) {
    let sessaoAtual = {};
    try {
        sessaoAtual = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    } catch {
        sessaoAtual = {};
    }

    const sessao = {
        ...sessaoAtual,
        id_usuario: usuario.id_usuario,
        name: usuario.nome_usuario,
        email: usuario.email_usuario,
        phone: usuario.numero_usuario || '',
        gender: usuario.genero_usuario || ''
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessao));
    return sessao;
}

export function lerSessaoUsuario() {
    try {
        const sessao = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
        return sessao && Number.isInteger(Number(sessao.id_usuario)) ? sessao : null;
    } catch {
        return null;
    }
}

async function requisitarJson(url, options) {
    const resposta = await fetch(url, options);
    let dados;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error('O servidor retornou uma resposta inválida.');
    }

    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível concluir a operação.');
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
    const sessao = lerSessaoUsuario();
    if (!sessao) {
        throw new Error('Entre na sua conta para carregar o perfil.');
    }

    const dados = await requisitarJson(`/api/usuario?id=${encodeURIComponent(sessao.id_usuario)}`);
    criarSessao(dados.usuario);
    return dados.usuario;
}

export async function atualizarUsuarioAtual(usuario) {
    const sessao = lerSessaoUsuario();
    if (!sessao) {
        throw new Error('Entre na sua conta para editar o perfil.');
    }

    const dados = await requisitarJson(`/api/usuario?id=${encodeURIComponent(sessao.id_usuario)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
    });

    criarSessao(dados.usuario);
    return dados.usuario;
}
