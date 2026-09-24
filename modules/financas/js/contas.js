// Inicializa a página contas.html do módulo Finanças.
// Gerencia o CRUD de contas bancárias no localStorage.

import {
    obterContas,
    salvarConta,
    excluirConta
} from './armazenamento.js';

function criarItemConta(conta) {
    const item = document.createElement('article');
    const detalhes = document.createElement('section');
    const nome = document.createElement('strong');
    const tipo = document.createElement('small');
    const acoes = document.createElement('aside');
    const btnEditar = document.createElement('button');
    const btnExcluir = document.createElement('button');

    item.className = 'account-item';
    item.dataset.id = conta.id;
    nome.textContent = conta.nome;
    tipo.textContent = conta.tipo;
    btnEditar.type = 'button';
    btnEditar.className = 'account-edit';
    btnEditar.textContent = 'Editar';
    btnExcluir.type = 'button';
    btnExcluir.className = 'account-delete';
    btnExcluir.textContent = 'Excluir';
    detalhes.append(nome, tipo);
    acoes.append(btnEditar, btnExcluir);
    item.append(detalhes, acoes);
    return item;
}

export function inicializarContas() {
    const form = document.querySelector('#account-form');
    const lista = document.querySelector('#account-list');
    if (!form || !lista) return;

    let editandoId = null;

    const renderizarContas = () => {
        const contas = obterContas();
        lista.replaceChildren(...contas.map(criarItemConta));
    };

    renderizarContas();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const dados = Object.fromEntries(new FormData(form));
        salvarConta({
            id: editandoId ? Number(editandoId) : undefined,
            nome: dados.name,
            tipo: dados.type
        });
        editandoId = null;
        form.reset();
        renderizarContas();
    });

    lista.addEventListener('click', (e) => {
        const botao = e.target.closest('button');
        const item = botao?.closest('.account-item');
        if (!botao || !item) return;

        if (botao.classList.contains('account-delete')) {
            if (!confirm('Excluir esta conta? As transações vinculadas serão mantidas.')) return;
            excluirConta(item.dataset.id);
            renderizarContas();
            return;
        }

        if (botao.classList.contains('account-edit')) {
            editandoId = item.dataset.id;
            form.elements.name.value = item.querySelector('strong').textContent;
            form.elements.type.value = item.querySelector('small').textContent;
        }
    });
}
