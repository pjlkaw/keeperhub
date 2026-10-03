import { carregarUsuarioAtual, lerSessaoUsuario } from '../../../../shared/api/usuario.js';

async function renderProfile() {
  const session = lerSessaoUsuario();
  if (!session) {
    window.location.href = '../../entrar/index.html';
    return;
  }

  const nameElement = document.getElementById('nome-usuario');
  const emailElement = document.getElementById('email-usuario');
  const statusElement = document.getElementById('perfil-status');

  try {
    const user = await carregarUsuarioAtual();
    if (nameElement) nameElement.textContent = user.nome_usuario;
    if (emailElement) emailElement.textContent = user.email_usuario;
    document.title = `KeeperHub — Perfil de ${user.nome_usuario}`;
  } catch (error) {
    if (statusElement) statusElement.textContent = error.message;
  }
}

renderProfile();
