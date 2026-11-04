const adicionar = document.getElementById('btn-add-section');
const arquivo = document.getElementById('arquivo-receita');

// O botão compartilhado chega pelo loader; o evento é tratado no contêiner.
adicionar.addEventListener('click', event => {
    if (!event.target.closest('#btn-add')) return;
    event.preventDefault();
    arquivo.click();
});
