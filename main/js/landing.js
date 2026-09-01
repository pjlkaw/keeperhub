/**
 * ==================================================
 * KEEPERHUB — MAIN LANDING & INSTITUTIONAL SCRIPT
 * Padrão Arquitetural: /main/js/landing.js
 * Responsabilidade: Interações das páginas públicas e institucionais
 * ==================================================
 */

import { initTheme } from '/shared/services/theme.js';

// Inicialização imediata do sistema oficial de temas
initTheme();

document.addEventListener('DOMContentLoaded', () => {
  // Prevenção de links nulos ou âncoras placeholder não implementadas
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // Controle do Accordion de Perguntas Frequentes (FAQ na Home)
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-question-btn');
    const panel = item.querySelector('.faq-answer-panel');
    const icon = item.querySelector('.faq-toggle-icon');

    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      if (isOpen) {
        item.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('hidden', '');
        if (icon) icon.textContent = '+';
      } else {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        panel.removeAttribute('hidden');
        if (icon) icon.textContent = '−';
      }
    });
  });
});
