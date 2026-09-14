    const periodo = document.getElementById("periodo");

    periodo.addEventListener("change", function () {
        console.log("Período selecionado:", this.value);

    });




const routeToggle = document.querySelector('#routeToggle');
  const routeToggleText = document.querySelector(
    '#routeToggleText',
  );

  const routePanel = document.querySelector('#routePanel');
  const routeClose = document.querySelector('#routeClose');

  function openRoute() {
    routePanel.classList.add('open');
    routeToggle.classList.add('is-open');

    routeToggle.setAttribute('aria-expanded', 'true');
    routePanel.setAttribute('aria-hidden', 'false');

    routeToggleText.textContent = 'Ocultar rota';
  }

  function closeRoute() {
    routePanel.classList.remove('open');
    routeToggle.classList.remove('is-open');

    routeToggle.setAttribute('aria-expanded', 'false');
    routePanel.setAttribute('aria-hidden', 'true');

    routeToggleText.textContent = 'Ver melhor rota';
  }

  routeToggle.addEventListener('click', () => {
    const routeIsOpen =
      routePanel.classList.contains('open');

    if (routeIsOpen) {
      closeRoute();
    } else {
      openRoute();
    }
  });

  routeClose.addEventListener('click', () => {
    closeRoute();
  });