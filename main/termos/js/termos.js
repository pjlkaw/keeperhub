/**
 * ==================================================
 * KEEPERHUB — TERMOS DE USO JAVASCRIPT
 * Padrão Arquitetural Oficial: /main/termos/js/termos.js
 * Responsabilidade: Comportamento exclusivo e inicialização da página Termos de Uso
 * ==================================================
 */

function setupTermosPage() {
  // Prevenção de links nulos ou âncoras placeholder não implementadas
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTermosPage);
} else {
  setupTermosPage();
}
