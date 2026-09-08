/**
 * ==================================================
 * KEEPERHUB — MÓDULO FINANÇAS SCRIPT (Landing Pública)
 * Padrão Arquitetural Oficial: /main/financas/js/financas.js
 * Responsabilidade: Interações, filtros, alternância de abas e mini-demo do módulo Finanças
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fin-demo-theme-btn').forEach((demoThemeBtn) => {
    demoThemeBtn.addEventListener('click', () => {
      const mainToggle = document.getElementById('theme-toggle');
      if (mainToggle) mainToggle.click();
    });
  });

  // Prevenção de links nulos ou âncoras vazias (exceto links internos para id)
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // Elementos centrais da demonstração
  const demoChips = document.querySelectorAll('.module-chip');
  const demoViews = document.querySelectorAll('.fin-demo-view');
  const scrollArea = document.getElementById('fin-demo-scroll-area');
  const viewAllLink = document.getElementById('fin-demo-view-all-link');
  const backButtons = document.querySelectorAll('.fin-demo-back-btn, .fin-form-cancel-btn');
  const fabBtn = document.getElementById('fin-demo-fab');

  // Mecanismo de Troca de Visualizações (Mini App)
  function switchDemoView(targetView) {
    // 1. Atualiza botões superiores da landing
    demoChips.forEach((chip) => {
      const target = chip.getAttribute('data-target-view');
      if (target === targetView) {
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
      } else {
        chip.classList.remove('active');
        chip.setAttribute('aria-selected', 'false');
      }
    });

    // 2. Alterna as views dentro do preview
    demoViews.forEach((view) => {
      const viewName = view.getAttribute('data-view-name');
      if (viewName === targetView) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // 3. Controle de visibilidade do FAB (Oculto em Relatórios e Nova Transação)
    if (fabBtn) {
      if (targetView === 'relatorios' || targetView === 'nova-transacao') {
        fabBtn.style.display = 'none';
      } else {
        fabBtn.style.display = 'flex';
      }
    }

    // 4. Scroll suave ao topo da área interna
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Listener nos chips superiores da landing
  demoChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const target = chip.getAttribute('data-target-view');
      if (target === 'visao-geral' || target === 'transacoes' || target === 'relatorios' || target === 'nova-transacao') {
        switchDemoView(target);
      }
    });
  });

  // Conexão: "Ver todas >" na Visão Geral abre Transações
  if (viewAllLink) {
    viewAllLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('transacoes');
    });
  }

  // Listeners nos botões de retorno (Back buttons e Cancelar)
  backButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-back-to') || 'visao-geral';
      switchDemoView(target);
    });
  });

  // FAB existente em Visão Geral e Transações abre "Nova transação"
  if (fabBtn) {
    fabBtn.addEventListener('click', (e) => {
      e.preventDefault();
      fabBtn.style.transform = 'scale(0.92)';
      setTimeout(() => {
        fabBtn.style.transform = '';
        switchDemoView('nova-transacao');
      }, 120);
    });
  }

  // ==========================================
  // LÓGICA DO FORMULÁRIO "NOVA TRANSAÇÃO"
  // ==========================================
  const btnExpense = document.getElementById('fin-btn-type-expense');
  const btnIncome = document.getElementById('fin-btn-type-income');
  const amountInput = document.getElementById('fin-input-amount');
  const descInput = document.getElementById('fin-input-desc');
  const dateInput = document.getElementById('fin-input-date');
  const categorySelect = document.getElementById('fin-select-category');
  const accountSelect = document.getElementById('fin-select-account');

  const summaryBadge = document.getElementById('fin-summary-badge');
  const summaryAmount = document.getElementById('fin-summary-amount');
  const summaryCategory = document.getElementById('fin-summary-category');
  const summaryDate = document.getElementById('fin-summary-date');
  const summaryAccount = document.getElementById('fin-summary-account');

  const btnSubmit = document.getElementById('fin-btn-submit-tx');
  const formToast = document.getElementById('fin-form-toast');
  let currentFormType = 'expense';

  function updateFormSummary() {
    const rawAmount = (amountInput ? amountInput.value : '0,00').trim();
    const date = (dateInput ? dateInput.value : '15/09/2026').trim();
    const cat = categorySelect ? categorySelect.value : 'Alimentação';
    const acc = accountSelect ? accountSelect.value : 'Conta principal';

    if (summaryAmount) {
      summaryAmount.textContent = 'R$ ' + (rawAmount || '0,00');
      if (currentFormType === 'income') {
        summaryAmount.className = 'fin-form-summary-item-val fin-form-summary-item-val--income';
      } else {
        summaryAmount.className = 'fin-form-summary-item-val fin-form-summary-item-val--highlight';
      }
    }

    if (summaryCategory) {
      summaryCategory.textContent = cat;
    }

    if (summaryDate) {
      summaryDate.textContent = date;
    }

    if (summaryAccount) {
      summaryAccount.textContent = acc;
    }

    if (summaryBadge) {
      if (currentFormType === 'income') {
        summaryBadge.textContent = 'Receita';
        summaryBadge.className = 'fin-form-summary-badge fin-form-summary-badge--income';
      } else {
        summaryBadge.textContent = 'Despesa';
        summaryBadge.className = 'fin-form-summary-badge';
      }
    }

    if (amountInput) {
      if (currentFormType === 'income') {
        amountInput.classList.add('fin-form-amount-input--income');
      } else {
        amountInput.classList.remove('fin-form-amount-input--income');
      }
    }
  }

  // Toggle Despesa / Receita
  if (btnExpense && btnIncome) {
    btnExpense.addEventListener('click', () => {
      currentFormType = 'expense';
      btnExpense.classList.add('active');
      btnExpense.setAttribute('aria-checked', 'true');
      btnIncome.classList.remove('active');
      btnIncome.setAttribute('aria-checked', 'false');
      updateFormSummary();
    });

    btnIncome.addEventListener('click', () => {
      currentFormType = 'income';
      btnIncome.classList.add('active');
      btnIncome.setAttribute('aria-checked', 'true');
      btnExpense.classList.remove('active');
      btnExpense.setAttribute('aria-checked', 'false');
      updateFormSummary();
    });
  }

  // Listeners para atualizar resumo dinamicamente
  if (amountInput) amountInput.addEventListener('input', updateFormSummary);
  if (descInput) descInput.addEventListener('input', updateFormSummary);
  if (dateInput) dateInput.addEventListener('input', updateFormSummary);
  if (categorySelect) categorySelect.addEventListener('change', updateFormSummary);
  if (accountSelect) accountSelect.addEventListener('change', updateFormSummary);

  // Feedback de Salvar Transação
  let toastTimeout = null;
  if (btnSubmit) {
    btnSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      btnSubmit.style.transform = 'scale(0.97)';
      setTimeout(() => {
        btnSubmit.style.transform = '';
      }, 120);

      if (formToast) {
        formToast.classList.add('active');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          formToast.classList.remove('active');
        }, 3000);
      }
    });
  }

  // ==========================================
  // FILTROS E BUSCA EM TEMPO REAL (TRANSAÇÕES)
  // ==========================================
  const searchInput = document.getElementById('fin-tx-search-input');
  const searchClear = document.getElementById('fin-tx-search-clear');
  const filterChips = document.querySelectorAll('.fin-tx-filter-chip');
  const dateGroups = document.querySelectorAll('.fin-tx-date-group');
  const emptyState = document.getElementById('fin-tx-empty-state');
  let currentFilter = 'all';

  function applyTxFilters() {
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    let visibleTotal = 0;

    // Atualiza botão de limpar busca
    if (searchClear) {
      searchClear.style.display = query.length > 0 ? 'flex' : 'none';
    }

    // Filtra cada grupo e seus itens
    dateGroups.forEach((group) => {
      const groupRows = group.querySelectorAll('.fin-tx-row-item');
      let groupVisibleCount = 0;

      groupRows.forEach((row) => {
        const type = row.getAttribute('data-type');
        const name = row.getAttribute('data-name') || '';
        const category = row.getAttribute('data-category') || '';

        const matchesType = (currentFilter === 'all') || (type === currentFilter);
        const matchesQuery = (query === '') || 
                             (name.toLowerCase().indexOf(query) !== -1) || 
                             (category.toLowerCase().indexOf(query) !== -1);

        if (matchesType && matchesQuery) {
          row.style.display = 'flex';
          groupVisibleCount++;
          visibleTotal++;
        } else {
          row.style.display = 'none';
        }
      });

      // Se o grupo não tem itens visíveis, oculta o grupo inteiro
      group.style.display = groupVisibleCount > 0 ? 'flex' : 'none';
    });

    // Mostra ou oculta o estado vazio
    if (emptyState) {
      emptyState.style.display = visibleTotal === 0 ? 'flex' : 'none';
    }
  }

  // Listener de digitação na busca
  if (searchInput) {
    searchInput.addEventListener('input', applyTxFilters);
  }

  // Listener no botão de limpar busca
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
        applyTxFilters();
      }
    });
  }

  // Listener nos chips de filtro (Todas / Receitas / Despesas)
  filterChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      filterChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      currentFilter = chip.getAttribute('data-filter') || 'all';
      applyTxFilters();
    });
  });

  // Botão de opções adicionais com feedback suave
  const filterOptionsBtn = document.getElementById('fin-tx-filter-options-btn');
  if (filterOptionsBtn) {
    filterOptionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      filterOptionsBtn.style.transform = 'scale(0.92)';
      setTimeout(() => {
        filterOptionsBtn.style.transform = '';
      }, 120);
    });
  }
});
