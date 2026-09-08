/**
 * KeeperHub — Módulo Pets JavaScript (Landing Pública)
 * Padrão Arquitetural Oficial: /main/pets/js/pets.js
 *
 * Responsabilidade:
 * - Inicialização do tema compartilhado (Dark/Light)
 * - Navegação interna entre as 5 views do Mini App demonstrativo:
 *   1. Visão Geral (cuidados)
 *   2. Vacinas (vacinas)
 *   3. Consultas e Exames (consultas)
 *   4. Medicamentos (medicamentos)
 *   5. Histórico (historico)
 * - Controle dos chips de visualização e atributos de acessibilidade (aria-selected)
 * - Botões de retorno ao resumo inicial (data-back-to="cuidados")
 * - Filtros de categoria na timeline de histórico de saúde
 * - Reset automático de scroll ao trocar de view
 */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.pets-demo-theme-btn').forEach((demoThemeBtn) => {
    demoThemeBtn.addEventListener('click', () => {
      const mainToggle = document.getElementById('theme-toggle');
      if (mainToggle) mainToggle.click();
    });
  });

  // 1. Prevenção de navegação em links âncora/mock da demonstração
  document.querySelectorAll('a[href="#"], a[href=""]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
    });
  });

  // 3. Elementos do Mini App Demonstrativo de Pets
  const tabButtons = document.querySelectorAll('.module-chips-list .module-chip');
  const demoViews = document.querySelectorAll('.pets-demo-view');
  const backButtons = document.querySelectorAll('.pets-demo-back-btn[data-back-to], .pets-demo-btn-back');
  const scrollArea = document.querySelector('.pets-demo-scroll-area');

  /**
   * Alterna a view exibida no Mini App
   * @param {string} targetView - Identificador da view de destino
   */
  function switchDemoView(targetView) {
    // 1. Atualiza estado visual e de acessibilidade dos chips
    tabButtons.forEach((btn) => {
      const isTarget = btn.getAttribute('data-target-view') === targetView;
      if (isTarget) {
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

    // 3. Reset do scroll interno da área da demonstração
    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }
  }

  // Listeners nos chips de controle da demonstração
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target-view');
      if (target) {
        switchDemoView(target);
      }
    });
  });

  // Listeners nos botões de retorno à Visão Geral
  document.querySelectorAll('.pets-demo-quick-card[data-target-view]').forEach((card) => {
    card.addEventListener('click', () => {
      switchDemoView(card.getAttribute('data-target-view'));
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  backButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-back-to') || 'cuidados';
      switchDemoView(target);
    });
  });

  // 4. Interação com chips de filtro na timeline de Histórico
  const filterChips = document.querySelectorAll('.pets-demo-filter-chip');
  const timelineCards = document.querySelectorAll('.pets-demo-timeline-card');

  filterChips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = chip.getAttribute('data-timeline-filter');

      // Atualiza chip ativo
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      // Filtra os cards da timeline
      timelineCards.forEach((card) => {
        const category = card.getAttribute('data-timeline-category');
        if (filter === 'todos' || category === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
});
