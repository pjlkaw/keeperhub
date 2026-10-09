/**
 * ==================================================
 * KEEPERHUB — HOME SCRIPT
 * Padrão Arquitetural Oficial: /main/home/js/home.js
 * Responsabilidade: Comportamento exclusivo da página Home
 * ==================================================
 */

function setupHomeInteractions() {
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

