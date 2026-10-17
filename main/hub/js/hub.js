/**
 * ==================================================
 * KEEPERHUB — MAIN HUB SCRIPT
 * Padrão Arquitetural Oficial: /main/hub/js/hub.js
 * Responsabilidade: Lógica exclusiva do Hub Interno Principal pós-login
 * ==================================================
 */

const AUTH_STORAGE_KEY = 'keeperhub-auth-session';

// CHATBOT
function initializeChatbot() {
  const chatbotContainer = document.getElementById('chatbot-container');
  const toggleButton = document.getElementById('chatbot-toggle-button');
  const chatbotWindow = document.getElementById('chatbot-window');
  const closeButton = document.getElementById('chatbot-close-button');
  const toggleIcon = toggleButton?.querySelector('i');
  const header = document.querySelector('.app-header');


  if (!chatbotContainer || !toggleButton || !chatbotWindow) return;

  const toggleChatbot = (isOpen) => {
    chatbotContainer.classList.toggle('is-open', isOpen);
    document.documentElement.classList.toggle('chatbot-open', isOpen);
    document.body.classList.toggle('chatbot-open', isOpen);
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

  document.addEventListener('click', (event) => {
    if (
      chatbotContainer.classList.contains('is-open') &&
      event.target instanceof Node &&
      !chatbotWindow.contains(event.target) &&
      !toggleButton.contains(event.target) &&
      (!header || !header.contains(event.target))
    ) {
      toggleChatbot(false);
    }
  });
}
function initializeChatbotMessaging() {
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('chatbot-input');
  const messages = document.getElementById('chatbot-messages');
  const placeholder = document.getElementById('chatbot-placeholder');

  if (!form || !input || !messages) return;

  form.addEventListener('submit', async (event) => {
    placeholder.style.display = 'none';
    event.preventDefault();

    const mensagem = input.value.trim();
    if (!mensagem) return;

    const mensagemUsuario = document.createElement('p');
    mensagemUsuario.className = 'chatbot-message user-message';
    mensagemUsuario.textContent = mensagem;
    messages.appendChild(mensagemUsuario);
    input.value = '';
    input.disabled = true;

    // conexão com a API
    try {
      const resposta = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem })
      });
      const tipoResposta = resposta.headers.get('content-type') || '';
      const dados = tipoResposta.includes('application/json')
        ? await resposta.json()
        : null;

      if (!resposta.ok) {
        throw new Error(
          dados?.erro || 'A API do chatbot não está disponível neste ambiente.'
        );
      }

      if (!dados || typeof dados.resposta !== 'string') {
        throw new Error('A API do chatbot retornou uma resposta inválida.');
      }

      const mensagemBot = document.createElement('p');
      mensagemBot.className = 'chatbot-message bot-message';
      mensagemBot.textContent = dados.resposta;
      messages.appendChild(mensagemBot);
    } catch (erro) {
      const mensagemErro = document.createElement('p');
      mensagemErro.className = 'chatbot-message bot-message';
      mensagemErro.textContent = erro.message;
      messages.appendChild(mensagemErro);
    } finally {
      input.disabled = false;
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });
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

function userLoadContent(user) {
  if (!user) return;

  const pageName = document.getElementById('pageNameH1');
  // Aguarda o header compartilhado terminar de ser carregado.
  if (!pageName) {
    setTimeout(() => userLoadContent(user), 50);
    return;
  }

  if (pageName && user.name) {
    const firstName = user.name.split(' ')[0];
    pageName.textContent = `Olá, ${firstName}`;
  }
}

// INTERFACE DE USUÁRIO (UI) E INTERAÇÕES
const TALL_CARD_HEIGHT = 220;
document.addEventListener('DOMContentLoaded', () => {
  observeModuleCardSizes();
  initializeChatbot();
  initializeChatbotMessaging();

  const user = getCurrentUser();
  console.log('Usuário atual:', user);
  userLoadContent(user);
});

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