/**
 * ==================================================
 * KEEPERHUB — MÓDULO DESPENSA SCRIPT (Landing Pública)
 * Padrão Arquitetural Oficial: /main/despensa/js/despensa.js
 * Responsabilidade: Interações, filtros, alternância de views e mini-demo do módulo Despensa
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.des-demo-theme-btn').forEach((demoThemeBtn) => {
    demoThemeBtn.addEventListener('click', () => {
      const mainToggle = document.getElementById('theme-toggle');
      if (mainToggle) mainToggle.click();
    });
  });

  // Prevenção de links nulos ou âncoras vazias
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // Prevenção de submissão do formulário demonstrativo
  const newProductForm = document.getElementById('des-demo-new-product-form');
  if (newProductForm) {
    newProductForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  // Elementos centrais da demonstração
  const scrollArea = document.getElementById('des-demo-scroll-area');
  const viewHome = document.getElementById('des-demo-view-home');
  const viewProducts = document.getElementById('des-demo-view-products');
  const viewVencimentos = document.getElementById('des-demo-view-vencimentos');
  const viewComparacao = document.getElementById('des-demo-view-comparacao');
  const viewNovoProduto = document.getElementById('des-demo-view-novo-produto');

  const tabButtons = document.querySelectorAll('.module-chips-list .module-chip');
  const btnOpenProducts = document.getElementById('btn-des-demo-open-products');
  const btnOpenExpiring = document.getElementById('btn-des-demo-open-expiring');
  const btnOpenCompare = document.getElementById('btn-des-demo-open-compare');

  const btnBackToHome = document.getElementById('btn-des-demo-back-to-home');
  const btnBackFromVenc = document.getElementById('btn-des-demo-back-from-venc');
  const btnBackFromCompare = document.getElementById('btn-des-demo-back-from-compare');
  const btnBackFromNew = document.getElementById('btn-des-demo-back-from-new');

  const fabBtn = document.getElementById('btn-des-demo-add');

  // 1. Função Central de Alternância de Visualizações do Preview
  function switchDemoView(targetView) {
    // Atualiza o estado ativo dos botões superiores da landing
    tabButtons.forEach((btn) => {
      const isMatch = btn.getAttribute('data-target-view') === targetView;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    // Gerencia a exibição das views implementadas no preview único
    if (targetView === 'home') {
      if (viewProducts) viewProducts.classList.remove('active');
      if (viewVencimentos) viewVencimentos.classList.remove('active');
      if (viewComparacao) viewComparacao.classList.remove('active');
      if (viewNovoProduto) viewNovoProduto.classList.remove('active');
      if (viewHome) viewHome.classList.add('active');
      if (scrollArea) scrollArea.scrollTop = 0;
    } else if (targetView === 'products') {
      if (viewHome) viewHome.classList.remove('active');
      if (viewVencimentos) viewVencimentos.classList.remove('active');
      if (viewComparacao) viewComparacao.classList.remove('active');
      if (viewNovoProduto) viewNovoProduto.classList.remove('active');
      if (viewProducts) viewProducts.classList.add('active');
      if (scrollArea) scrollArea.scrollTop = 0;
    } else if (targetView === 'vencimentos') {
      if (viewHome) viewHome.classList.remove('active');
      if (viewProducts) viewProducts.classList.remove('active');
      if (viewComparacao) viewComparacao.classList.remove('active');
      if (viewNovoProduto) viewNovoProduto.classList.remove('active');
      if (viewVencimentos) viewVencimentos.classList.add('active');
      if (scrollArea) scrollArea.scrollTop = 0;
    } else if (targetView === 'comparacao') {
      if (viewHome) viewHome.classList.remove('active');
      if (viewProducts) viewProducts.classList.remove('active');
      if (viewVencimentos) viewVencimentos.classList.remove('active');
      if (viewNovoProduto) viewNovoProduto.classList.remove('active');
      if (viewComparacao) viewComparacao.classList.add('active');
      if (scrollArea) scrollArea.scrollTop = 0;
    } else if (targetView === 'novo-produto') {
      if (viewHome) viewHome.classList.remove('active');
      if (viewProducts) viewProducts.classList.remove('active');
      if (viewVencimentos) viewVencimentos.classList.remove('active');
      if (viewComparacao) viewComparacao.classList.remove('active');
      if (viewNovoProduto) viewNovoProduto.classList.add('active');
      if (scrollArea) scrollArea.scrollTop = 0;
    }
  }

  // Cliques nos Botões Reais da Barra de Funcionalidades
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target-view') || 'home';
      switchDemoView(target);
    });
  });

  // Conexão Dupla: Card "PRODUTOS (24 cadastrados)" na Home abre Produtos
  if (btnOpenProducts) {
    btnOpenProducts.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('products');
    });
  }

  // Conexão Dupla: Card "PRÓXIMOS A VENCER (5 precisam atenção)" na Home abre Vencimentos
  if (btnOpenExpiring) {
    btnOpenExpiring.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('vencimentos');
    });
  }

  // Conexão Dupla: Card "COMPARAÇÃO (Economize nas compras)" na Home abre Comparação
  if (btnOpenCompare) {
    btnOpenCompare.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('comparacao');
    });
  }

  // Conexão Dupla: Botão flutuante (+) na Home abre Novo Produto
  if (fabBtn) {
    fabBtn.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('novo-produto');
    });
  }

  // Retornos internos ao cabeçalho da Visão Geral
  if (btnBackToHome) {
    btnBackToHome.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('home');
    });
  }

  if (btnBackFromVenc) {
    btnBackFromVenc.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('home');
    });
  }

  if (btnBackFromCompare) {
    btnBackFromCompare.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('home');
    });
  }

  if (btnBackFromNew) {
    btnBackFromNew.addEventListener('click', (e) => {
      e.preventDefault();
      switchDemoView('home');
    });
  }

  // 2. Busca e Filtro de Categorias em Todos os Produtos
  const searchInput = document.getElementById('des-demo-search-input');
  const catChips = document.querySelectorAll('.des-demo-cat-chip:not(.des-demo-venc-chip)');
  const productCards = document.querySelectorAll('#des-demo-products-list .des-demo-item-card');
  const emptyState = document.getElementById('des-demo-empty-state');
  const prodBadge = document.getElementById('des-demo-prod-badge');

  let activeCategory = 'all';

  function normalizeString(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function filterProducts() {
    const searchTerm = normalizeString(searchInput ? searchInput.value.trim() : '');
    let visibleCount = 0;

    productCards.forEach((card) => {
      const prodName = normalizeString(card.dataset.productName || '');
      const prodCat = card.dataset.productCat || '';

      const matchesCategory = activeCategory === 'all' || prodCat === activeCategory;
      const matchesSearch = !searchTerm || prodName.includes(searchTerm);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
    }

    if (prodBadge) {
      prodBadge.textContent = visibleCount === 1 ? '1 item' : visibleCount + ' itens';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
  }

  catChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      catChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      activeCategory = chip.dataset.cat || 'all';
      filterProducts();
    });
  });

  // 3. Filtro Resumido de Vencimentos (Todos / Críticos)
  const vencChips = document.querySelectorAll('.des-demo-venc-chip');
  const vencCards = document.querySelectorAll('#des-demo-venc-list .des-demo-item-card');
  const vencCounter = document.getElementById('des-demo-venc-counter');

  vencChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      vencChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');

      const filterType = chip.getAttribute('data-venc-filter') || 'all';
      let visibleCount = 0;

      vencCards.forEach((card) => {
        const isCrit = card.getAttribute('data-venc-critical') === 'true';
        if (filterType === 'all' || (filterType === 'critical' && isCrit)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (vencCounter) {
        vencCounter.textContent = filterType === 'critical' ? visibleCount + ' itens críticos' : visibleCount + ' itens';
      }
    });
  });

  // 4. Interatividade da Vista de Comparação (Alternar Rota e Filtros Demonstrativos)
  const btnToggleRoute = document.getElementById('btn-des-demo-toggle-route');
  const btnHideRoute = document.getElementById('btn-des-demo-hide-route');
  const routeContainer = document.getElementById('des-demo-route-container');
  const routeBtnLabel = document.getElementById('des-route-btn-label');

  function toggleRouteView(shouldHide) {
    if (!routeContainer || !btnToggleRoute) return;
    const isCurrentlyVisible = window.getComputedStyle(routeContainer).display !== 'none';
    const willShow = shouldHide !== undefined ? !shouldHide : !isCurrentlyVisible;

    if (willShow) {
      routeContainer.style.display = 'block';
      btnToggleRoute.setAttribute('aria-expanded', 'true');
      if (routeBtnLabel) routeBtnLabel.textContent = 'Ocultar rota';
    } else {
      routeContainer.style.display = 'none';
      btnToggleRoute.setAttribute('aria-expanded', 'false');
      if (routeBtnLabel) routeBtnLabel.textContent = 'Ver melhor rota';
    }
  }

  if (btnToggleRoute) {
    btnToggleRoute.addEventListener('click', (e) => {
      e.preventDefault();
      toggleRouteView();
    });
  }

  if (btnHideRoute) {
    btnHideRoute.addEventListener('click', (e) => {
      e.preventDefault();
      toggleRouteView(true); // oculta
    });
  }

  // Filtros Demonstrativos de Período e Mercado (Mock interativo simples)
  const periodSelect = document.getElementById('des-demo-period-select');
  const marketSelect = document.getElementById('des-demo-market-select');
  const totalValEl = document.getElementById('des-compare-total-val');
  const savingsValEl = document.getElementById('des-compare-savings-val');
  const paoPctEl = document.getElementById('des-dist-pao-pct');
  const extraPctEl = document.getElementById('des-dist-extra-pct');
  const paoBarEl = document.getElementById('des-dist-pao-bar');
  const extraBarEl = document.getElementById('des-dist-extra-bar');

  function updateCompareMockData() {
    const period = periodSelect ? periodSelect.value : 'semana';
    const market = marketSelect ? marketSelect.value : 'todos';

    if (period === 'mes') {
      if (totalValEl) totalValEl.textContent = market === 'pao' ? 'R$ 1.045,40' : (market === 'extra' ? 'R$ 696,90' : 'R$ 1.742,30');
      if (savingsValEl) savingsValEl.textContent = 'R$ 158,20';
    } else {
      if (totalValEl) totalValEl.textContent = market === 'pao' ? 'R$ 291,50' : (market === 'extra' ? 'R$ 194,40' : 'R$ 485,90');
      if (savingsValEl) savingsValEl.textContent = 'R$ 42,50';
    }

    if (market === 'pao') {
      if (paoPctEl) paoPctEl.textContent = '100%';
      if (extraPctEl) extraPctEl.textContent = '0%';
      if (paoBarEl) paoBarEl.style.width = '100%';
      if (extraBarEl) extraBarEl.style.width = '0%';
    } else if (market === 'extra') {
      if (paoPctEl) paoPctEl.textContent = '0%';
      if (extraPctEl) extraPctEl.textContent = '100%';
      if (paoBarEl) paoBarEl.style.width = '0%';
      if (extraBarEl) extraBarEl.style.width = '100%';
    } else {
      if (paoPctEl) paoPctEl.textContent = '60%';
      if (extraPctEl) extraPctEl.textContent = '40%';
      if (paoBarEl) paoBarEl.style.width = '60%';
      if (extraBarEl) extraBarEl.style.width = '40%';
    }
  }

  if (periodSelect) periodSelect.addEventListener('change', updateCompareMockData);
  if (marketSelect) marketSelect.addEventListener('change', updateCompareMockData);

  // 5. Interatividade da Vista de Novo Produto (Cadastro Demonstrativo)
  const photoBtn = document.getElementById('des-demo-photo-btn');
  const photoLabel = document.getElementById('des-demo-photo-label');
  const newNameInput = document.getElementById('des-new-prod-name');
  const newCatSelect = document.getElementById('des-new-prod-cat');
  const newUnitSelect = document.getElementById('des-new-prod-unit');
  const newBrandInput = document.getElementById('des-new-prod-brand');
  const newExpInput = document.getElementById('des-new-prod-exp');
  const newQtyVal = document.getElementById('des-new-qty-val');
  const btnNewQtyMinus = document.getElementById('btn-des-new-qty-minus');
  const btnNewQtyPlus = document.getElementById('btn-des-new-qty-plus');
  const btnMockScanner = document.getElementById('btn-des-demo-mock-scanner');
  const btnSaveProduct = document.getElementById('btn-des-new-save-product');
  const feedbackBanner = document.getElementById('des-new-feedback');

  let isPhotoSelected = false;
  let newQty = 1;
  let mockToggle = false;
  let feedbackTimer = null;

  // Foto demonstrativa (alterna estado visual)
  if (photoBtn) {
    photoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isPhotoSelected = !isPhotoSelected;
      photoBtn.classList.toggle('has-photo', isPhotoSelected);
      if (photoLabel) {
        photoLabel.textContent = isPhotoSelected ? 'Foto selecionada ✓' : 'Adicionar foto';
      }
    });
  }

  // Quantidade (mínimo 1 na criação)
  if (btnNewQtyMinus) {
    btnNewQtyMinus.addEventListener('click', (e) => {
      e.preventDefault();
      if (newQty > 1) {
        newQty -= 1;
        if (newQtyVal) newQtyVal.textContent = newQty;
      }
    });
  }

  if (btnNewQtyPlus) {
    btnNewQtyPlus.addEventListener('click', (e) => {
      e.preventDefault();
      newQty += 1;
      if (newQtyVal) newQtyVal.textContent = newQty;
    });
  }

  // Scanner Mock (preenchimento automático demonstrativo)
  if (btnMockScanner) {
    btnMockScanner.addEventListener('click', (e) => {
      e.preventDefault();
      mockToggle = !mockToggle;

      if (mockToggle) {
        if (newNameInput) newNameInput.value = 'Leite Integral';
        if (newCatSelect) newCatSelect.value = 'Laticínios';
        if (newUnitSelect) newUnitSelect.value = 'L';
        if (newBrandInput) newBrandInput.value = 'Piracanjuba';
      } else {
        if (newNameInput) newNameInput.value = 'Arroz Branco';
        if (newCatSelect) newCatSelect.value = 'Grãos';
        if (newUnitSelect) newUnitSelect.value = 'kg';
        if (newBrandInput) newBrandInput.value = 'Camil';
      }
      newQty = 1;
      if (newQtyVal) newQtyVal.textContent = '1';

      // Efeito tátil
      btnMockScanner.style.transform = 'scale(0.88)';
      setTimeout(() => {
        btnMockScanner.style.transform = '';
      }, 150);
    });
  }

  // Salvar Produto (Validação mínima e feedback demonstrativo)
  if (btnSaveProduct) {
    btnSaveProduct.addEventListener('click', (e) => {
      e.preventDefault();
      const name = newNameInput ? newNameInput.value.trim() : '';

      if (feedbackTimer) {
        clearTimeout(feedbackTimer);
        feedbackTimer = null;
      }

      if (!name) {
        if (feedbackBanner) {
          feedbackBanner.textContent = 'Informe o nome do produto.';
          feedbackBanner.className = 'des-demo-feedback-banner des-demo-feedback-error';
          feedbackBanner.style.display = 'block';
          if (newNameInput) newNameInput.focus();
        }
        return;
      }

      // Sucesso demonstrativo
      if (feedbackBanner) {
        feedbackBanner.textContent = 'Produto adicionado à demonstração ✓';
        feedbackBanner.className = 'des-demo-feedback-banner des-demo-feedback-success';
        feedbackBanner.style.display = 'block';
      }

      // Limpa o formulário após salvar para permitir nova demonstração
      if (newNameInput) newNameInput.value = '';
      if (newBrandInput) newBrandInput.value = '';
      if (newCatSelect) newCatSelect.value = '';
      if (newExpInput) newExpInput.value = '';
      if (newUnitSelect) newUnitSelect.value = 'unidade';
      newQty = 1;
      if (newQtyVal) newQtyVal.textContent = '1';
      isPhotoSelected = false;
      if (photoBtn) photoBtn.classList.remove('has-photo');
      if (photoLabel) photoLabel.textContent = 'Adicionar foto';

      // Oculta o feedback suavemente após 2.5s
      feedbackTimer = setTimeout(() => {
        if (feedbackBanner) feedbackBanner.style.display = 'none';
      }, 2500);
    });
  }

  // 6. Controle Interativo de Quantidade (+ e −) nos cards de produto com suporte a Sem Estoque
  const originalStatusData = {
    'leite': { text: 'Vence em 3 dias', class: 'des-status-critical' },
    'macarrao': { text: 'Vence em 7 dias', class: 'des-status-warning' },
    'prod-leite': { text: 'Vence em 3 dias', class: 'des-status-critical' },
    'prod-arroz': { text: 'Estoque OK', class: 'des-status-ok' },
    'prod-suco': { text: 'Estoque OK', class: 'des-status-ok' },
    'prod-feijao': { text: 'Estoque OK', class: 'des-status-ok' },
    'venc-molho': { text: 'Vencido há 3 dias', class: 'des-status-critical' },
    'venc-cafe': { text: 'Vence em 2 dias', class: 'des-status-warning' },
    'venc-leite': { text: 'Vence em 3 dias', class: 'des-status-warning' },
    'venc-feijao': { text: 'Vence em 18 dias', class: 'des-status-notice' }
  };

  const qtyButtons = document.querySelectorAll('.btn-des-qty');

  qtyButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const target = btn.dataset.target;
      if (!target) return;

      const qtyEl = document.getElementById('des-qty-' + target);
      const unitEl = document.getElementById('des-unit-' + target);
      const statusTag = document.getElementById('des-status-tag-' + target);

      if (!qtyEl) return;

      let currentQty = parseInt(qtyEl.textContent, 10);
      if (isNaN(currentQty)) currentQty = 0;

      const isPlus = btn.classList.contains('btn-des-qty-plus');

      if (isPlus) {
        currentQty += 1;
      } else {
        if (currentQty > 0) {
          currentQty -= 1;
        }
      }

      qtyEl.textContent = currentQty;

      if (unitEl) {
        unitEl.textContent = currentQty + (currentQty === 1 ? ' unidade' : ' unidades');
      }

      // Atualização semântica de status para zero unidades
      if (statusTag) {
        const orig = originalStatusData[target];
        if (currentQty === 0) {
          statusTag.textContent = 'Sem estoque';
          statusTag.className = 'des-demo-status-badge des-status-out-of-stock';
        } else if (orig) {
          statusTag.textContent = orig.text;
          statusTag.className = 'des-demo-status-badge ' + orig.class;
        }
      }
    });
  });

  // 7. Feedback tátil demonstrativo nos botões de exclusão
  const deleteButtons = document.querySelectorAll('.btn-des-demo-delete');
  deleteButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 150);
    });
  });
});
