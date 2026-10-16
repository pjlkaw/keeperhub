/**
 * ==================================================
 * KEEPERHUB — MAIN HUB SCRIPT
 * Padrão Arquitetural Oficial: /main/hub/js/hub.js
 * Responsabilidade: Lógica exclusiva do Hub Interno Principal pós-login
 * ==================================================
 */

const AUTH_STORAGE_KEY = 'keeperhub-auth-session';
const TALL_CARD_HEIGHT = 220;

function observeModuleCardSizes() {
  const cards = document.querySelectorAll('.module-card');
  if (!cards.length || typeof ResizeObserver === 'undefined') return;

  const observer = new ResizeObserver((entries) => {
    entries.forEach(({ target }) => {
      target.classList.toggle(
        'module-card-tall',
        target.getBoundingClientRect().height > TALL_CARD_HEIGHT
      );
    });
  });

  cards.forEach((card) => observer.observe(card));
}

function initializeChatbot() {
  const chatbotContainer = document.getElementById('chatbot-container');
  const toggleButton = document.getElementById('chatbot-toggle-button');
  const chatbotWindow = document.getElementById('chatbot-window');
  const closeButton = document.getElementById('chatbot-close-button');
  const toggleIcon = toggleButton?.querySelector('i');

  if (!chatbotContainer || !toggleButton || !chatbotWindow) return;

  const toggleChatbot = (isOpen) => {
    chatbotContainer.classList.toggle('is-open', isOpen);
    chatbotWindow.setAttribute('aria-hidden', String(!isOpen));
    toggleButton.setAttribute('aria-label', isOpen ? 'Fechar Chatbot' : 'Abrir Chatbot');
    toggleIcon?.classList.toggle('fa-robot', !isOpen);
    toggleIcon?.classList.toggle('fa-xmark', isOpen);
  };

  toggleChatbot(false);

  toggleButton.addEventListener('click', () => {
    toggleChatbot(!chatbotContainer.classList.contains('is-open'));
  });

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      toggleChatbot(false);
    });
  }
}

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
  observeModuleCardSizes();
  initializeChatbot();

  const user = getCurrentUser();
  if (user && user.name) {
    const greetingEl = document.getElementById('greeting-title');
    if (greetingEl) {
      const firstName = user.name.split(' ')[0];
      greetingEl.textContent = `Olá, ${firstName}`;
    }
  }
});
