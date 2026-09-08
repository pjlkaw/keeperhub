/**
 * ==================================================
 * KEEPERHUB — MÓDULO METAS SCRIPT (Landing Pública)
 * Padrão Arquitetural Oficial: /main/metas/js/metas.js
 * Responsabilidade: Interações, filtros, alternância de abas e mini-demo do módulo Metas
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.metas-demo-theme-btn').forEach((demoThemeBtn) => {
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

  // Elementos centrais da demonstração
  const tabButtons = document.querySelectorAll('.module-chip');
  const demoViews = document.querySelectorAll('.metas-demo-view');
  const backButtons = document.querySelectorAll('.metas-demo-btn-back, .metas-demo-back-btn');
  const internalNavCards = document.querySelectorAll('.metas-demo-routine-card[data-target-view], .metas-demo-objective-card[data-target-view]');
  const scrollArea = document.getElementById('metas-demo-scroll-area');
  const fabBtn = document.getElementById('btn-metas-demo-fab');

  const toggleCarroBtn = document.getElementById('btn-toggle-obj-carro');
  const detailSectionCarro = document.getElementById('section-detail-obj-carro');
  const iconToggleCarro = document.getElementById('icon-toggle-obj-carro');

  // Mecanismo de Troca de Visualizações (Mini App Metas)
  function switchDemoView(targetView) {
    // 1. Atualiza o estado dos chips de controle no hero
    tabButtons.forEach((btn) => {
      const btnTarget = btn.getAttribute('data-target-view');
      if (btnTarget === targetView) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // 2. Alterna a view ativa dentro do preview
    demoViews.forEach((view) => {
      const viewName = view.getAttribute('data-view-name');
      if (viewName === targetView) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // 3. Controle de visibilidade do FAB (Oculto em Livros)
    if (fabBtn) {
      if (targetView === 'livros') {
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

  // Listeners nos botões de controle da demonstração
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target-view');
      if (target) {
        switchDemoView(target);
      }
    });
  });

  // Listeners nos cards de navegação interna da rotina e objetivos
  internalNavCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const target = card.getAttribute('data-target-view');
      if (target) {
        switchDemoView(target);
      }
    });
  });

  // Listeners nos botões de retorno ao resumo inicial
  backButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-back-to') || 'visao-geral';
      switchDemoView(target);
    });
  });

  // Alternância do bloco de detalhes do Objetivo "Novo carro"
  if (toggleCarroBtn && detailSectionCarro) {
    toggleCarroBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = window.getComputedStyle(detailSectionCarro).display === 'none';
      if (isHidden) {
        detailSectionCarro.style.display = 'flex';
        toggleCarroBtn.setAttribute('aria-expanded', 'true');
        if (iconToggleCarro) iconToggleCarro.style.transform = 'rotate(180deg)';
      } else {
        detailSectionCarro.style.display = 'none';
        toggleCarroBtn.setAttribute('aria-expanded', 'false');
        if (iconToggleCarro) iconToggleCarro.style.transform = 'rotate(0deg)';
      }
    });
  }

  // ==========================================
  // LÓGICA INTERATIVA DA VIEW LIVROS
  // ==========================================
  const bookData = {
    habitos: {
      title: 'Hábitos Atômicos',
      coverTitle: 'HÁBITOS ATÔMICOS',
      author: 'James Clear',
      coverTag: 'TOP',
      coverClass: 'metas-book-cover--habitos',
      rating: '4.8',
      stars: '★★★★★',
      genre: 'Não-ficção • Desenvolvimento pessoal',
      status: 'Disponível para leitura',
      synopsis: '"Pequenas mudanças, resultados extraordinários. Um método prático para construir bons hábitos e eliminar hábitos ruins todos os dias."'
    },
    pairico: {
      title: 'Pai Rico, Pai Pobre',
      coverTitle: 'PAI RICO PAI POBRE',
      author: 'Robert T. Kiyosaki',
      coverTag: 'FIN',
      coverClass: 'metas-book-cover--pairico',
      rating: '4.6',
      stars: '★★★★★',
      genre: 'Educação Financeira • Negócios',
      status: 'Disponível para leitura',
      synopsis: '"O que os ricos ensinam a seus filhos sobre dinheiro que os pobres e a classe média não ensinam. Lições fundamentais de inteligência financeira."'
    },
    mindset: {
      title: 'Mindset: A Nova Psicologia do Sucesso',
      coverTitle: 'MINDSET',
      author: 'Carol S. Dweck',
      coverTag: 'PSI',
      coverClass: 'metas-book-cover--mindset',
      rating: '4.7',
      stars: '★★★★★',
      genre: 'Psicologia • Alta Performance',
      status: 'Disponível para leitura',
      synopsis: '"Como a atitude mental influencia o sucesso. Descubra a diferença entre o mindset fixo e o mindset de crescimento."'
    }
  };

  const booksCatalogSection = document.getElementById('metas-books-catalog-section');
  const bookDetailPanel = document.getElementById('metas-book-detail-panel');
  const btnBackToBooksCatalog = document.getElementById('btn-back-to-books-catalog');
  const bookDetailButtons = document.querySelectorAll('.btn-metas-book-detail');
  const bookTabButtons = document.querySelectorAll('.metas-books-tab-btn');

  // Elementos do painel de detalhe do livro
  const detailCoverContainer = document.getElementById('detail-cover-container');
  const detailCoverTag = document.getElementById('detail-cover-tag');
  const detailCoverTitle = document.getElementById('detail-cover-title');
  const detailCoverAuthor = document.getElementById('detail-cover-author');
  const detailInfoTitle = document.getElementById('detail-info-title');
  const detailInfoAuthor = document.getElementById('detail-info-author');
  const detailInfoScore = document.getElementById('detail-info-score');
  const detailInfoGenre = document.getElementById('detail-info-genre');
  const detailInfoStatus = document.getElementById('detail-info-status');
  const detailInfoSynopsis = document.getElementById('detail-info-synopsis');

  function openBookDetail(bookKey) {
    const item = bookData[bookKey] || bookData.habitos;
    if (detailCoverContainer) {
      detailCoverContainer.className = 'metas-book-cover metas-book-cover--large ' + item.coverClass;
    }
    if (detailCoverTag) detailCoverTag.textContent = item.coverTag;
    if (detailCoverTitle) detailCoverTitle.textContent = item.coverTitle;
    if (detailCoverAuthor) detailCoverAuthor.textContent = item.author;
    if (detailInfoTitle) detailInfoTitle.textContent = item.title;
    if (detailInfoAuthor) detailInfoAuthor.textContent = item.author;
    if (detailInfoScore) detailInfoScore.textContent = item.rating;
    if (detailInfoGenre) detailInfoGenre.textContent = item.genre;
    if (detailInfoStatus) detailInfoStatus.textContent = item.status;
    if (detailInfoSynopsis) detailInfoSynopsis.textContent = item.synopsis;

    if (booksCatalogSection) booksCatalogSection.style.display = 'none';
    if (bookDetailPanel) bookDetailPanel.style.display = 'flex';
  }

  function closeBookDetail() {
    if (bookDetailPanel) bookDetailPanel.style.display = 'none';
    if (booksCatalogSection) booksCatalogSection.style.display = 'block';
  }

  bookDetailButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const bookId = btn.getAttribute('data-book-id');
      openBookDetail(bookId);
    });
  });

  if (btnBackToBooksCatalog) {
    btnBackToBooksCatalog.addEventListener('click', (e) => {
      e.preventDefault();
      closeBookDetail();
    });
  }

  // Alternância de abas de livros
  bookTabButtons.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      bookTabButtons.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      closeBookDetail();
    });
  });

  // ==========================================
  // LÓGICA INTERATIVA DA VIEW CALENDÁRIO
  // ==========================================
  const calendarDayCells = document.querySelectorAll('.metas-calendar-day-cell:not(.metas-calendar-day-cell--empty)');
  const selectedDayLabel = document.getElementById('metas-calendar-selected-day-label');
  const selectedCountLabel = document.getElementById('metas-calendar-events-count-label');
  const eventsContainer = document.getElementById('metas-calendar-events-container');

  const calendarEventsData = {
    15: [
      { time: '10:00', title: 'Reunião de trabalho', tag: 'Trabalho', tagClass: 'metas-calendar-event-tag--work' },
      { time: '15:00', title: 'Prazo: Novo carro', tag: 'Meta', tagClass: 'metas-calendar-event-tag--goal' },
      { time: '20:00', title: 'Jantar com amigos', tag: 'Pessoal', tagClass: 'metas-calendar-event-tag--personal' }
    ],
    3: [
      { time: '09:00', title: 'Planejamento trimestral', tag: 'Trabalho', tagClass: 'metas-calendar-event-tag--work' }
    ],
    24: [
      { time: '14:00', title: 'Revisão de aporte: Reserva', tag: 'Meta', tagClass: 'metas-calendar-event-tag--goal' }
    ]
  };

  function renderCalendarEvents(day) {
    const events = calendarEventsData[day] || [];
    if (selectedDayLabel) {
      selectedDayLabel.textContent = day === '15' || day === 15 ? 'Hoje • 15 de Setembro' : day + ' de Setembro';
    }
    if (selectedCountLabel) {
      selectedCountLabel.textContent = events.length === 1 ? '1 evento' : events.length + ' eventos';
    }

    if (!eventsContainer) return;

    if (events.length === 0) {
      eventsContainer.innerHTML = `
        <div class="metas-calendar-event-card metas-calendar-empty-card">
          <span class="metas-calendar-empty-text">Nenhum evento agendado para este dia.</span>
        </div>
      `;
      return;
    }

    let html = '';
    events.forEach((ev) => {
      html += `
        <div class="metas-calendar-event-card">
          <div class="metas-calendar-event-left">
            <span class="metas-calendar-event-time">${ev.time}</span>
            <div class="metas-calendar-event-info">
              <h5 class="metas-calendar-event-title">${ev.title}</h5>
            </div>
          </div>
          <span class="metas-calendar-event-tag ${ev.tagClass}">${ev.tag}</span>
        </div>
      `;
    });
    eventsContainer.innerHTML = html;
  }

  calendarDayCells.forEach((cell) => {
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      calendarDayCells.forEach((c) => {
        c.classList.remove('active');
        c.removeAttribute('aria-selected');
      });
      cell.classList.add('active');
      cell.setAttribute('aria-selected', 'true');
      const day = cell.getAttribute('data-day');
      renderCalendarEvents(day);
    });
  });

  // Feedback suave nas ações demonstrativas
  const demoActionButtons = document.querySelectorAll('.btn-metas-obj-action, .metas-calendar-nav-btn, .btn-metas-demo-fab');
  demoActionButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.style.transform = 'scale(0.94)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 120);
    });
  });
});
