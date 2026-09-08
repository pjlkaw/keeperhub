/**
 * ==================================================
 * KEEPERHUB — MAIN HUB SCRIPT
 * Padrão Arquitetural Oficial: /main/hub/js/hub.js
 * Responsabilidade: Lógica exclusiva do Hub Interno Principal pós-login
 * ==================================================
 */

const AUTH_STORAGE_KEY = 'keeperhub-auth-session';

/**
 * Retorna os dados da sessão do usuário autenticado no momento (se houver)
 * @returns {{ email?: string, name?: string } | null}
 */
function getCurrentUser() {
  try {
    if (typeof window !== 'undefined' && window.KeeperHubAuth && typeof window.KeeperHubAuth.getCurrentUser === 'function') {
      return window.KeeperHubAuth.getCurrentUser();
    }
    const session = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!session) return null;
    return JSON.parse(session);
  } catch {
    return null;
  }
}

// Carregamento amigável de sessão do usuário (se autenticado)
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user && user.name) {
    const greetingEl = document.getElementById('greeting-title');
    if (greetingEl) {
      const firstName = user.name.split(' ')[0];
      greetingEl.textContent = `Olá, ${firstName}`;
    }
  }
});
