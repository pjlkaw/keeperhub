/**
 * KEEPERHUB — PERFIL DO USUÁRIO
 * Carrega os dados do usuário pela API.
 */

import { carregarUsuarioAtual } from '../../../../shared/api/usuario.js';

async function renderProfile() {
  try {
    const user = await carregarUsuarioAtual();
    const displayName = String(user.nome_usuario || '').trim();
    const displayEmail = String(user.email_usuario || '').trim();
    const nameElement = document.getElementById('nome-usuario');
    const emailElement = document.getElementById('email-usuario');

    if (nameElement) nameElement.textContent = displayName;
    if (emailElement) emailElement.textContent = displayEmail || 'Email não disponível';
    document.title = 'KeeperHub — Perfil de ' + displayName;
  } catch (error) {
    console.error('[Perfil] Não foi possível carregar o usuário:', error);
  }
}

renderProfile();
