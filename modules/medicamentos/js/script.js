
// mudança de abas em medicacoes.html
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.meds-tab-button');
  const panels = document.querySelectorAll('.meds-panel');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.tabTarget;

      tabButtons.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });

      panels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.id === target);
      });
    });
  });
});

