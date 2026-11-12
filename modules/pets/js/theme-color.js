/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: theme-color.js
Mantém a cor da barra do navegador sincronizada com o tema ativo.
Depende de: shared/styles/variables.css e shared/services/theme.js
Usado por: páginas Pets com meta theme-color
================================================== */

const metaTema = document.querySelector('meta[name="theme-color"]');
const raizTema = document.documentElement;

function atualizarCorDaBarra() {
    const cor = getComputedStyle(raizTema).getPropertyValue('--header-bg').trim();
    if (metaTema && cor) metaTema.setAttribute('content', cor);
}

atualizarCorDaBarra();
new MutationObserver(atualizarCorDaBarra).observe(raizTema, {
    attributes: true,
    attributeFilter: ['data-theme']
});
