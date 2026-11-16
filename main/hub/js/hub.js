/**
 * ==================================================
 * KEEPERHUB — MAIN HUB SCRIPT
 * Padrão Arquitetural Oficial: /main/hub/js/hub.js
 * Responsabilidade: Lógica exclusiva do Hub Interno Principal pós-login
 * ==================================================
 */

import { carregarUsuarioAtual, listarModulosUsuario } from '../../../shared/services/usuario.js';

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

// INTERFACE DE USUÁRIO (UI) E INTERAÇÕES
const TALL_CARD_HEIGHT = 220;
document.addEventListener('DOMContentLoaded', () => {
  observeModuleCardSizes();
  initializeChatbot();
  initializeChatbotMessaging();

  // A API valida o cookie no servidor; o cache local nao concede acesso.
  carregarUsuarioAtual()
    .then(async (usuario) => {
      userLoadContent({ name: usuario.nome_usuario, foto_usuario: usuario.foto_usuario });
      const modulos = await listarModulosUsuario();
      const modulosAtivos = new Set(modulos.map((modulo) => modulo.codigo));
      aplicarAcessosModulos(modulosAtivos);
      carregarResumoModulos(modulosAtivos);
    })
    .catch((error) => {
      if (error.status === 401) {
        window.location.replace('../entrar/index.html');
      } else {
        console.error('[Hub] Nao foi possivel validar a sessao:', error);
      }
    });

    function aplicarAcessosModulos(modulosAtivos) {
      document.querySelectorAll('[id^="hub-card-"]').forEach((card) => {
        const codigo = card.id.replace('hub-card-', '');
        const ativo = modulosAtivos.has(codigo);
        card.toggleAttribute('aria-disabled', !ativo);
        card.classList.toggle('module-card-locked', !ativo);
        if (!ativo) {
          card.addEventListener('click', (event) => {
            event.preventDefault();
            window.location.href = '../compra/index.html';
          });
        }
      });
    }
});

async function requisitarResumo(url) {
  const resposta = await fetch(url, { credentials: 'same-origin' });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

function carregarResumoModulos(modulosAtivos) {
  if (modulosAtivos.has('financas')) {
    requisitarResumo('/api/modulos/financas-api?recurso=contas')
      .then((dados) => {
        const contas = Array.isArray(dados?.contas) ? dados.contas : [];
        const card = document.getElementById('hub-card-financas');
        if (!card) return;
        const valor = card.querySelector('.module-card-val-title');
        const legenda = card.querySelector('.module-card-sublabel');
        const saldo = contas.reduce((total, conta) => total + (Number(conta.saldo_atual) || 0), 0);
        valor.textContent = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(saldo);
        legenda.textContent = contas.length
          ? `${contas.length} ${contas.length === 1 ? 'conta ativa' : 'contas ativas'}`
          : 'Sem contas cadastradas';
      })
      .catch((erro) => console.error('[Hub] Não foi possível carregar o resumo financeiro:', erro));
  }

  if (modulosAtivos.has('pets')) {
    requisitarResumo('/api/modulos/pets-api')
      .then((dados) => {
        const pets = Array.isArray(dados?.pets) ? dados.pets : [];
        const card = document.getElementById('hub-card-pets');
        if (!card) return;
        card.querySelector('.module-pets-name').textContent =
          pets.length ? pets[0].nome || `${pets.length} pets` : 'Nenhum pet';
        card.querySelector('.module-card-sublabel').textContent =
          `${pets.length} ${pets.length === 1 ? 'pet cadastrado' : 'pets cadastrados'}`;
      })
      .catch((erro) => console.error('[Hub] Não foi possível carregar o resumo de pets:', erro));
  }

  if (modulosAtivos.has('medicamentos')) {
    requisitarResumo('/api/modulos/medicamentos-api')
      .then((dados) => {
        const medicamentos = Array.isArray(dados?.medicamentos) ? dados.medicamentos : [];
        const card = document.getElementById('hub-card-medicamentos');
        if (!card) return;
        card.querySelector('.meds-name-text').textContent =
          medicamentos.length ? medicamentos[0].nome || `${medicamentos.length} medicamentos` : 'Nenhum medicamento';
        card.querySelector('.module-card-sublabel').textContent =
          `${medicamentos.length} ${medicamentos.length === 1 ? 'medicamento ativo' : 'medicamentos ativos'}`;
      })
      .catch((erro) => console.error('[Hub] Não foi possível carregar o resumo de medicamentos:', erro));
  }

  if (modulosAtivos.has('despensa')) {
    requisitarResumo('/api/modulos/despensa-api')
      .then((dados) => {
        const produtos = Array.isArray(dados?.produtos) ? dados.produtos : [];
        const card = document.getElementById('hub-card-despensa');
        if (!card) return;
        const valor = card.querySelector('.module-card-val-title');
        const legenda = card.querySelector('.module-card-sublabel');
        if (!valor || !legenda) return;
        valor.textContent = produtos.length.toLocaleString('pt-BR');
        if (produtos.length === 1) {
          legenda.textContent = 'produto cadastrado';
        } else if (produtos.length > 1) {
          legenda.textContent = 'produtos cadastrados';
        } else {
          legenda.textContent = 'Sem produtos cadastrados';
        }
      })
      .catch((erro) => console.error('[Hub] Não foi possível carregar o resumo da despensa:', erro));
  }
}

function userLoadContent(user) {
  if (!user) return;

  const pageName = document.getElementById('pageNameH1');
  const userImage = document.getElementById('userImage');
  // Aguarda o header compartilhado terminar de ser carregado.
  if (!pageName) {
    setTimeout(() => userLoadContent(user), 50);
    return;
  }

  if (userImage) {
    userImage.hidden = true;
    userImage.removeAttribute('src');
    userImage.onerror = null;
    userImage.style.display = 'none';
  }

  const userIcon = document.getElementById('userIcon');
  if (userIcon) {
    userIcon.style.display = '';
  }

  if (pageName && user.name) {
    const firstName = user.name.split(' ')[0]; // Extrai o primeiro nome do usuário
    pageName.textContent = `Olá, ${firstName}`; // Atualiza o conteúdo do elemento <h1> com o nome
  }

  const foto = typeof user.foto_usuario === 'string' ? user.foto_usuario.trim() : '';
  if (userImage && foto) {
    userImage.referrerPolicy = 'no-referrer';
    userImage.onerror = () => {
      userImage.hidden = true;
      userImage.removeAttribute('src');
      userImage.style.display = 'none';
      if (userIcon) userIcon.style.display = '';
    };
    if (userIcon) userIcon.style.display = 'none';
    userImage.src = foto;
    userImage.hidden = false;
    userImage.style.display = '';
  }

}

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
