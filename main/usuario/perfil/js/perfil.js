/**
 * KEEPERHUB — PERFIL DO USUÁRIO
 * Carrega os dados do usuário pela API.
 */

import { carregarUsuarioAtual, encerrarSessaoUsuario } from '../../../../shared/services/usuario.js';
import { alertShared } from '../../../../shared/services/interface.js';

// O botão voltar do perfil retorna para a tela de onde a pessoa abriu o perfil
// (Hub, Home, página de um módulo...). Telas do próprio perfil (ex.: Editar) e de
// login não contam como origem. Sem origem conhecida, volta para o Hub.
const CHAVE_ORIGEM_PERFIL = 'keeperhub-perfil-origem';
const DESTINO_PADRAO = '/main/hub/index.html';

function registrarOrigemDoPerfil() {
  try {
    if (!document.referrer) return;
    const anterior = new URL(document.referrer);
    const ignorar = ['/main/usuario/', '/main/entrar/', '/main/criar-conta/'];
    if (anterior.origin !== window.location.origin) return;
    if (ignorar.some((caminho) => anterior.pathname.startsWith(caminho))) return;
    sessionStorage.setItem(CHAVE_ORIGEM_PERFIL, anterior.pathname + anterior.search + anterior.hash);
  } catch {
    // Sem sessionStorage o voltar usa o Hub.
  }
}

function destinoDoVoltar() {
  try {
    return sessionStorage.getItem(CHAVE_ORIGEM_PERFIL) || DESTINO_PADRAO;
  } catch {
    return DESTINO_PADRAO;
  }
}

registrarOrigemDoPerfil();

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
    if (imageElement) imageElement.removeAttribute('src');
    const foto = typeof user.foto_usuario === 'string' ? user.foto_usuario.trim() : '';
    if (avatarElement && foto) {
      const avatarImage = document.createElement('img');
      avatarImage.referrerPolicy = 'no-referrer';
      avatarImage.alt = `Foto de perfil de ${displayName}`;
      avatarImage.addEventListener('error', () => {
        const fallback = document.createElement('i');
        fallback.className = 'fa-regular fa-user';
        avatarElement.replaceChildren(fallback);
      }, { once: true });
      avatarElement.replaceChildren(avatarImage);
      avatarImage.src = foto;
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

  if (target.closest('#btn-back-header')) {
    event.preventDefault();
    window.location.href = destinoDoVoltar();
    return;
  }

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
