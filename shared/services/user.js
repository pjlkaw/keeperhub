// user.js
// Responsabilidade: carregar e padronizar os dados do usuário atual.
// Deve fornecer informações como perfil, nome, permissões e dados básicos do usuário,
// para que módulos diferentes compartilhem a mesma fonte de dados do usuário.

// TESTE ================
// Exibe usuario no console.log()
export async function carregarUsuario() {
    const resposta = await fetch('/api/usuario');
    const usuarios = await resposta.json();
    return usuarios.nome
}
// ========================