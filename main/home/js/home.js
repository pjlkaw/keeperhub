/**
 * ==================================================
 * KEEPERHUB — HOME SCRIPT
 * Padrão Arquitetural Oficial: /main/home/js/home.js
 * Responsabilidade: Comportamento exclusivo da página Home
 * ==================================================
 */

function setupHomeInteractions() {
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
