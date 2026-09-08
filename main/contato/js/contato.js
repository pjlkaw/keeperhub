/**
 * ==================================================
 * KEEPERHUB — CONTATO JAVASCRIPT
 * Padrão Arquitetural Oficial: /main/contato/js/contato.js
 * Responsabilidade: Interações exclusivas da página /contato/
 * ==================================================
 */

function setupContatoPage() {
  // Prevenção de links nulos ou âncoras placeholder não implementadas
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupContatoPage);
} else {
  setupContatoPage();
}
