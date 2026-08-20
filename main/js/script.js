// Busca simples por módulo
const searchInput = document.getElementById('search-input');
const cards = document.querySelectorAll('.tool-card');

searchInput.addEventListener('input', (e) => {
  const term = e.target.value.trim().toLowerCase();
  cards.forEach(card => {
    const name = card.dataset.name;
    card.style.display = name.includes(term) ? 'flex' : 'none';
  });
});

// Cada card leva para o index.html do respectivo módulo
cards.forEach(card => {
  card.addEventListener('click', () => {
    window.location.href = `../modules/${card.dataset.name}/index.html`;
  });
});