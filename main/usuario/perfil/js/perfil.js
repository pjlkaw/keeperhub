/**
 * KEEPERHUB — PERFIL DO USUÁRIO
 * Carrega o nome disponível na sessão.
 * PROVISÓRIO: o fallback abaixo existe somente enquanto o perfil ainda não
 * estiver integrado ao usuário retornado pelo banco de dados/backend.
 */

(function () {
  'use strict';

  const AUTH_STORAGE_KEY = 'keeperhub-auth-session';
  const fallbackProfile = {
    name: 'Gabriel Santos',
  };

  function readCurrentUser() {
    try {
      const session = localStorage.getItem(AUTH_STORAGE_KEY);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      return null;
    }
  }

  function renderProfile() {
    const user = readCurrentUser();
    const nameElement = document.getElementById('nome-usuario');

    const displayName = user && typeof user.name === 'string' && user.name.trim()
      ? user.name.trim()
      : fallbackProfile.name;

    if (nameElement) nameElement.textContent = displayName;
    document.title = 'KeeperHub — Perfil de ' + displayName;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderProfile);
  } else {
    renderProfile();
  }
})();
