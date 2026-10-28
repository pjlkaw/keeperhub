/**
 * KEEPERHUB — PERFIL DO USUÁRIO
 * Carrega os dados do usuário pela API.
 */

import { carregarUsuarioAtual, encerrarSessaoUsuario } from '../../../../shared/api/usuario.js';
import { alertShared } from '../../../../shared/services/interface.js';

async function renderProfile() {
  try {
    const user = await carregarUsuarioAtual();
    const displayName = String(user.nome_usuario || '').trim();
    const displayEmail = String(user.email_usuario || '').trim();
    const nameElement = document.getElementById('nome-usuario');
    const emailElement = document.getElementById('email-usuario');
    const imageElement = document.getElementById('foto-usuario');
    const avatarElement = document.querySelector('.perfil-avatar');

    if (nameElement) nameElement.textContent = displayName;
    if (emailElement) emailElement.textContent = displayEmail || 'Email não disponível';
    if (imageElement) imageElement.src = user.foto_usuario || '';
    if (avatarElement && user.foto_usuario) {
      const avatarImage = document.createElement('img');
      avatarImage.src = user.foto_usuario;
      avatarImage.alt = `Foto de perfil de ${displayName}`;
      avatarElement.replaceChildren(avatarImage);
    }
    alertShared('Foto de perfil carregada com sucesso.');
    document.title = 'KeeperHub — Perfil de ' + displayName;
  } catch (error) {
    console.error('[Perfil] Não foi possível carregar o usuário:', error);
    if (error.status === 401) {
      window.location.replace('../../entrar/index.html');
      return;
    }
    alertShared('Não foi possível carregar o perfil do usuário.');
  }
}

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (target.closest('#sair-perfil')) {
    event.preventDefault();
    const modal = document.getElementById('confirmation-modal');
    const mensagem = document.getElementById('confirmation-message');
    if (!modal || !mensagem) return;

    mensagem.textContent = 'Deseja realmente sair da sua conta?';
    modal.style.display = 'flex';
    return;
  }

  if (target.closest('#cancel-btn')) {
    document.getElementById('confirmation-modal').style.display = 'none';
    return;
  }

  if (target.closest('#confirm-btn')) {
    encerrarSessaoUsuario()
      .then(() => { window.location.href = '../../entrar/index.html'; })
      .catch((error) => {
        console.error('[Perfil] Nao foi possivel encerrar a sessao:', error);
        alertShared('Nao foi possivel concluir a saida. Tente novamente.');
      });
  }
});

renderProfile();
