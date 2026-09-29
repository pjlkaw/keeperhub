

   fetch('/shared/components/navbar-section.html')
        .then(response => response.text())
        .then(data => {
            const nav = document.getElementById('modules-nav-wrapper');
            nav.innerHTML = data;

            const moduloAtual = nav.querySelector('[data-module="despensa"]');
            moduloAtual.classList.add('active');
            moduloAtual.setAttribute('aria-selected', 'true');
            moduloAtual.setAttribute('tabindex', '0');
        });


import { lerProdutos, salvarProdutos } from './armazenamento.js';
import { alertShared } from '/shared/services/interface.js';

function formatarData(data) {
    const partes = String(data).split('-');
    return partes.length === 3 ? partes.reverse().join('/') : String(data);
}

function criarProduto(produto, excluirProduto) {
    const item = document.createElement('article');
    item.className = 'card produto-item';
    const informacoes = document.createElement('div');
    const nome = document.createElement('h3');
    nome.textContent = produto.nome;
    const detalhes = document.createElement('p');
    detalhes.textContent = produto.quantidade + ' ' + produto.unidade + ' - ' + produto.categoria;
    const marca = document.createElement('p');
    marca.textContent = produto.marca ? 'Marca: ' + produto.marca : 'Marca não informada';
    const validade = document.createElement('p');
    validade.textContent = produto.validade ? 'Validade: ' + formatarData(produto.validade) : 'Validade não informada';
    const botaoExcluir = document.createElement('button');
    botaoExcluir.type = 'button';
    botaoExcluir.className = 'botao-excluir';
    botaoExcluir.textContent = 'Excluir';
    botaoExcluir.setAttribute('aria-label', 'Excluir ' + produto.nome);
    botaoExcluir.addEventListener('click', () => excluirProduto(produto.id));
    informacoes.append(nome, detalhes, marca, validade);
    item.append(informacoes, botaoExcluir);
    return item;
}

export function inicializarResumo() {
    const lista = document.getElementById('lista-produtos');
    const contador = document.getElementById('contador-produtos');

    function carregarProdutos() {
        const produtos = lerProdutos();
        contador.textContent = produtos.length === 1 ? '1 produto cadastrado' : produtos.length + ' produtos cadastrados';
        const ordenados = [...produtos].sort((a, b) => {
            if (!a.validade && !b.validade) return 0;
            if (!a.validade) return 1;
            if (!b.validade) return -1;
            return String(a.validade).localeCompare(String(b.validade));
        });
        lista.replaceChildren(...ordenados.map((produto) => criarProduto(produto, excluirProduto)));
        if (!produtos.length) lista.textContent = 'Nenhum produto cadastrado.';
    }

    function excluirProduto(id) {
        try {
            salvarProdutos(lerProdutos().filter((produto) => produto.id !== id));
            carregarProdutos();
        } catch (erro) {
            alertShared('Não foi possível excluir o produto. Tente novamente.');
        }
    }

    try {
        carregarProdutos();
    } catch (erro) {
        contador.textContent = 'Dados indisponíveis';
        lista.textContent = 'Não foi possível ler os produtos salvos.';
    }
}
