/**
 * ==================================================
 * KEEPERHUB — AUTH SERVICE (Base Estrutural)
 * Padrão Arquitetural Oficial: keeperhub-main / shared/services/
 * Responsabilidade: Gerenciamento compartilhado de estado de autenticação e sessão.
 * 
 * ==================================================
 * TEMPORARY DEVELOPMENT AUTH
 * REMOVE WHEN REAL AUTHENTICATION IS IMPLEMENTED
 * ==================================================
 * ATENÇÃO: Esta é uma base provisória de desenvolvimento.
 * Não utilizar para produção, nem armazenar senhas em plain-text.
 * ==================================================
 */

const AUTH_STORAGE_KEY = 'keeperhub-auth-session';

// Credenciais do modo de desenvolvimento (autenticação temporária)
// Fonte única estrutural para futuras migrações de autenticação durante o desenvolvimento
export const DEV_TEST_CREDENTIALS = {
  email: 'teste@keeperhub.local',
  password: 'KeeperHub123!'
};

/**
 * Verifica se existe uma sessão ativa
 * @returns {boolean}
 */
export function isAuthenticated() {
  try {
    const session = localStorage.getItem(AUTH_STORAGE_KEY);
    return Boolean(session);
  } catch {
    return false;
  }
}

/**
 * Retorna os dados do usuário autenticado no momento
 * @returns {{ email: string, name?: string } | null}
 */
export function getCurrentUser() {
  try {
    const session = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!session) return null;
    return JSON.parse(session);
  } catch {
    return null;
  }
}

/**
 * Efetua login temporário de desenvolvimento ou valida credenciais
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function login(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedPassword = password || '';

  // Modo de teste temporário de desenvolvimento
  if (
    normalizedEmail === DEV_TEST_CREDENTIALS.email.toLowerCase() &&
    normalizedPassword === DEV_TEST_CREDENTIALS.password
  ) {
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          email: DEV_TEST_CREDENTIALS.email,
          name: 'Usuário Teste',
          loggedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.warn('[KeeperHub Auth] Erro ao salvar sessão no localStorage:', e);
    }
    return { success: true };
  }

  return { success: false, message: 'E-mail ou senha inválidos.' };
}

/**
 * Encerra a sessão ativa
 */
export function logout() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.warn('[KeeperHub Auth] Erro ao remover sessão do localStorage:', e);
  }
}

// Expõe no escopo global para compatibilidade com chamadas inline durante transição
if (typeof window !== 'undefined') {
  window.KeeperHubAuth = {
    DEV_TEST_CREDENTIALS,
    isAuthenticated,
    getCurrentUser,
    login,
    logout
  };
}
