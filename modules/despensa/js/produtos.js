// Interações da lista de demonstração existente.
function alterarQuantidade(botao) {
    const card = botao.closest('.product-card');
    const quantidadeElemento = card.querySelector('.quantity');
    const textoQuantidade = card.querySelector('.quantity-text');
    const quantidade = Math.max(1, Number(quantidadeElemento.textContent) + Number(botao.dataset.quantidade));
    quantidadeElemento.textContent = quantidade;
    textoQuantidade.textContent = quantidade;
    card.dataset.quantity = quantidade;
    const unidade = textoQuantidade.nextSibling;
    if (unidade && unidade.nodeType === Node.TEXT_NODE) {
        unidade.textContent = quantidade === 1 ? ' unidade' : ' unidades';
    }
}

export function inicializarProdutos() {
    const busca = document.getElementById('searchInput');
    const filtros = document.querySelectorAll('.filter');
    const lista = document.getElementById('productsList');
    const contador = document.getElementById('itemsBadge');
    let filtroAtual = 'Todos';

    function filtrarProdutos() {
        const texto = busca.value.toLowerCase().trim();
        let encontrados = 0;
        lista.querySelectorAll('.product-card').forEach((produto) => {
            const correspondeNome = produto.dataset.name.toLowerCase().includes(texto);
            const correspondeCategoria = filtroAtual === 'Todos' || produto.dataset.category === filtroAtual;
            produto.hidden = !correspondeNome || !correspondeCategoria;
            if (!produto.hidden) encontrados++;
        });
        document.getElementById('emptyMessage').classList.toggle('show', encontrados === 0);
        contador.textContent = encontrados + (encontrados === 1 ? ' item' : ' itens');
    }

    filtros.forEach((botao) => {
        botao.setAttribute('aria-pressed', String(botao.classList.contains('active')));
        botao.addEventListener('click', () => {
            filtroAtual = botao.dataset.category;
            filtros.forEach((filtro) => {
                const ativo = filtro === botao;
                filtro.classList.toggle('active', ativo);
                filtro.setAttribute('aria-pressed', String(ativo));
            });
            filtrarProdutos();
        });
    });
    busca.addEventListener('input', filtrarProdutos);
    lista.querySelectorAll('[data-quantidade]').forEach((botao) => {
        botao.addEventListener('click', () => alterarQuantidade(botao));
    });
    lista.querySelectorAll('.delete-button').forEach((botao) => {
        botao.addEventListener('click', () => {
            const card = botao.closest('.product-card');
            card.classList.add('removing');
            setTimeout(() => {
                card.remove();
                filtrarProdutos();
            }, 200);
        });
    });
    filtrarProdutos();
}
