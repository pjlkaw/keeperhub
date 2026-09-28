/**
 * KEEPERHUB — PERFIL DO USUÁRIO
 * Carrega os dados disponíveis na sessão e mantém os valores demonstrativos
 * da referência quando ainda não houver integração com o backend.
 */

(function () {
  'use strict';

  const AUTH_STORAGE_KEY = 'keeperhub-auth-session';
  const fallbackProfile = {
    name: 'Gabriel Santos',
    username: 'gabriel.keeper',
  };

  function readCurrentUser() {
    try {
      const session = localStorage.getItem(AUTH_STORAGE_KEY);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeUsername(user) {
    const directUsername = user && (user.username || user.userName || user.handle);
    const emailPrefix = user && typeof user.email === 'string'
      ? user.email.split('@')[0]
      : '';
    const nameBase = user && typeof user.name === 'string'
      ? user.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : '';

    const rawValue = directUsername || emailPrefix || nameBase || fallbackProfile.username;

    return rawValue
      .toString()
      .trim()
      .replace(/^@+/, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase() || fallbackProfile.username;
  }

  function renderProfile() {
    const user = readCurrentUser();
    const nameElement = document.getElementById('nome-usuario');
    const usernameElement = document.getElementById('usuario-perfil');

    const displayName = user && typeof user.name === 'string' && user.name.trim()
      ? user.name.trim()
      : fallbackProfile.name;

    if (nameElement) nameElement.textContent = displayName;
    if (usernameElement) usernameElement.textContent = '@' + normalizeUsername(user);

    document.title = 'KeeperHub — Perfil de ' + displayName;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderProfile);
  } else {
    renderProfile();
  }
})();

