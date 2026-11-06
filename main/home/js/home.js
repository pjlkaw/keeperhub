/**
 * ==================================================
 * KEEPERHUB — HOME SCRIPT
 * Padrão Arquitetural Oficial: /main/home/js/home.js
 * Responsabilidade: Comportamento exclusivo da página Home
 * ==================================================
 */

function prepararFormularioTeste() {
  const formulario = document.querySelector('.formulario-teste');
  const campoEmail = document.getElementById('trial-email');
  const mensagemErro = document.getElementById('erro-email-teste');
  if (!formulario || !campoEmail || !mensagemErro) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  formulario.addEventListener('submit', (evento) => {
    const email = campoEmail.value.trim();
    if (!email || !emailRegex.test(email)) {
      evento.preventDefault();
      mensagemErro.classList.add('is-visible');
      campoEmail.classList.add('has-error');
      campoEmail.setAttribute('aria-invalid', 'true');
      campoEmail.focus();
      return;
    }
    campoEmail.value = email;
  });

  campoEmail.addEventListener('input', () => {
    if (mensagemErro.classList.contains('is-visible')) {
      mensagemErro.classList.remove('is-visible');
      campoEmail.classList.remove('has-error');
      campoEmail.setAttribute('aria-invalid', 'false');
    }
  });

  // Mantém a validação nativa quando o JavaScript não está disponível.
  formulario.noValidate = true;
}

function setupHomeInteractions() {
  prepararFormularioTeste();
  const themeToggle = document.getElementById('theme-toggle');

  function atualizarBotaoTema() {
    if (!themeToggle) return;
    const temaClaro = document.documentElement.getAttribute('data-theme') === 'light';
    const descricao = temaClaro ? 'Ativar tema escuro' : 'Ativar tema claro';
    themeToggle.setAttribute('aria-label', descricao);
    themeToggle.setAttribute('title', descricao);
    themeToggle.setAttribute('aria-pressed', String(temaClaro));
  }

  atualizarBotaoTema();
  new MutationObserver(atualizarBotaoTema).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  // Prevenção de navegação para links nulos ou âncoras placeholder
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHomeInteractions);
} else {
  setupHomeInteractions();
}

