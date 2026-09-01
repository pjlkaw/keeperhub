/**
 * ==================================================
 * KEEPERHUB — FAQ JAVASCRIPT
 * Padrão Arquitetural: /main/js/faq.js
 * Responsabilidade: Filtros por categoria, busca textual em tempo real e controle de accordion na página FAQ
 * ==================================================
 */

import { initTheme } from '/shared/services/theme.js';

// Inicialização imediata do sistema de tema unificado
initTheme();

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('faq-search-input');
  const clearBtn = document.getElementById('faq-search-clear');
  const filterBtns = document.querySelectorAll('.faq-filter-btn');
  const faqItems = document.querySelectorAll('.faq-item');
  const faqGroups = document.querySelectorAll('.faq-group-section');
  const emptyState = document.getElementById('faq-empty-state');

  let activeCategory = 'all';
  let searchTerm = '';

  // 1. Alternância de Accordion (Abrir / Fechar perguntas)
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

  // Função central de filtragem e busca
  function applyFilters() {
    let totalVisible = 0;
    const term = searchTerm.trim().toLowerCase();

    faqGroups.forEach((group) => {
      const groupCategory = group.getAttribute('data-group-category');
      const itemsInGroup = group.querySelectorAll('.faq-item');
      let groupVisibleCount = 0;

      // Se a categoria ativa não for 'all' e não for igual à do grupo, esconde o grupo
      const matchesCategory = (activeCategory === 'all' || activeCategory === groupCategory);

      itemsInGroup.forEach((item) => {
        const itemCategory = item.getAttribute('data-category') || groupCategory;
        const itemMatchesCat = (activeCategory === 'all' || activeCategory === itemCategory);

        const questionText = item.querySelector('.faq-question-title')?.textContent?.toLowerCase() || '';
        const answerText = item.querySelector('.faq-answer-text')?.textContent?.toLowerCase() || '';
        const matchesSearch = !term || questionText.includes(term) || answerText.includes(term);

        if (itemMatchesCat && matchesSearch) {
          item.style.display = '';
          groupVisibleCount++;
          totalVisible++;
        } else {
          item.style.display = 'none';
        }
      });

      // Esconder título do grupo se nenhuma pergunta estiver visível nele
      if (groupVisibleCount > 0 && matchesCategory) {
        group.style.display = '';
      } else {
        group.style.display = 'none';
      }
    });

    // Exibir estado vazio se nada for encontrado
    if (emptyState) {
      if (totalVisible === 0) {
        emptyState.style.display = 'flex';
      } else {
        emptyState.style.display = 'none';
      }
    }
  }

  // 2. Filtros de Categoria (Chips / Botões)
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  // 3. Campo de Busca com debounce leve
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'inline-flex' : 'none';
      }
      applyFilters();
    });
  }

  // 4. Botão de Limpar Busca
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        searchInput.focus();
      }
      clearBtn.style.display = 'none';
      applyFilters();
    });
  }
});
