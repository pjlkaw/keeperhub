// user.js
// Responsabilidade: carregar e padronizar os dados do usuário atual.
// Deve fornecer informações como perfil, nome, permissões e dados básicos do usuário,
// para que módulos diferentes compartilhem a mesma fonte de dados do usuário.

// Exibe usuarios no console.log()
export async function carregarUsuario() {
    const resposta = await fetch('/api/usuario');
    const usuarios = await resposta.json();
    return usuarios;
}

// Login básico do usuário, usando email e senha para autenticação.
export async function loginUsuario(email, senha) {
    const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || 'Falha ao realizar login.');
    }

    return dados;
}
