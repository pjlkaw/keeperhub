/**
 * ==================================================
 * KEEPERHUB — FAQ JAVASCRIPT
 * Padrão Arquitetural Oficial: /main/faq/js/faq.js
 * Responsabilidade: Filtros por categoria, busca textual em tempo real e controle de accordion na página FAQ
 * (O gerenciamento de tema é provido de forma autônoma por shared/services/theme.js)
 * ==================================================
 */

/**
 * Normaliza strings para busca insensível a maiúsculas, minúsculas e acentos diacríticos
 * @param {string} str
 * @returns {string}
 */
function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function setupFaqPage() {
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

  // 2. Função central de filtragem e busca
  function applyFilters() {
    let totalVisible = 0;
    const normalizedTerm = normalizeText(searchTerm.trim());

    faqGroups.forEach((group) => {
      const groupCategory = group.getAttribute('data-group-category');
      const itemsInGroup = group.querySelectorAll('.faq-item');
      let groupVisibleCount = 0;

      // Se a categoria ativa não for 'all' e não for igual à do grupo, avalia
      const matchesCategory = (activeCategory === 'all' || activeCategory === groupCategory);

      itemsInGroup.forEach((item) => {
        const itemCategory = item.getAttribute('data-category') || groupCategory;
        const itemMatchesCat = (activeCategory === 'all' || activeCategory === itemCategory);

        const questionText = item.querySelector('.faq-question-title')?.textContent || '';
        const answerText = item.querySelector('.faq-answer-text')?.textContent || '';

        const normalizedQuestion = normalizeText(questionText);
        const normalizedAnswer = normalizeText(answerText);

        const matchesSearch = !normalizedTerm ||
          normalizedQuestion.includes(normalizedTerm) ||
          normalizedAnswer.includes(normalizedTerm);

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

  // 3. Filtros de Categoria (Chips / Botões)
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  // 4. Campo de Busca com debounce/input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'inline-flex' : 'none';
      }
      applyFilters();
    });
  }

  // 5. Botão de Limpar Busca
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

  // Prevenção de links nulos ou âncoras placeholder não implementadas
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupFaqPage);
} else {
  setupFaqPage();
}
