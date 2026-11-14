import { atualizarNoContent } from "/shared/services/no-content.js";
import { confirmarAcao } from "./confirmar.js";
import {
    listarChecklist,
    adicionarItemChecklist,
    marcarComprado,
    removerItemChecklist,
    limparChecklist
} from "./api.js";
import { alertShared } from "/shared/services/interface.js";


/* =================================
   CHECKLIST - KEEPERHUB
================================= */

// ELEMENTOS HTML

const form = document.getElementById("formProduto");

const nomeInput = document.getElementById("nomeProduto");
const quantidadeInput = document.getElementById("quantidadeProduto");
const categoriaInput = document.getElementById("categoriaProduto");

const listaElement = document.getElementById("listaCompras");
const mensagemVazia = document.getElementById("mensagemVazia");

const buscaInput = document.getElementById("buscaProduto");

const modal = document.getElementById("modalProduto");

const btnAddSection = document.getElementById("btn-add-section");
const fecharModal = document.getElementById("fecharModal");
const cancelarModal = document.getElementById("cancelarModal");

const limparLista = document.getElementById("limparLista");

// ESTADOS

let lista = [];

let filtroAtual = "todos";
let buscaAtual = "";

// =================================
// CARREGAR DADOS (banco, via js/api.js)
// =================================

async function carregarLista() {

    try {

        lista = await listarChecklist();

    } catch (erro) {

        console.error("Erro ao carregar a lista:", erro);

        alertShared(erro.message);

    }

    renderizarLista();

}

// =================================
// ATUALIZAR RESUMO
// =================================

function atualizarResumo() {

    const total = lista.length;

    const comprados = lista.filter(
        produto => produto.comprado
    ).length;

    const porcentagem = total > 0
        ? Math.round((comprados / total) * 100)
        : 0;

    document.getElementById("totalSelecionados")
        .textContent = total;

    document.getElementById("totalComprados")
        .textContent = comprados;

    document.getElementById("progressoTexto")
        .textContent = `${porcentagem}%`;

    document.getElementById("progressoBarra")
        .style.width = `${porcentagem}%`;

}

// =================================
// CRIAR PRODUTO NA LISTA
// =================================

function criarElementoProduto(produto) {

    const item = document.createElement("article");

    item.className = "shopping-item";

    if (produto.comprado) {
        item.classList.add("done");
    }

    // CHECKBOX

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = produto.comprado;

    checkbox.setAttribute(
        "aria-label",
        `Marcar ${produto.nome} como comprado`
    );

    checkbox.addEventListener("change", async () => {

        // COMPRADO → o servidor cria o produto na despensa
        // DESMARCADO → o servidor remove o produto criado
        const comprado = checkbox.checked;

        checkbox.disabled = true;

        try {

            await marcarComprado(produto.id, comprado);

            alertShared(
                comprado
                    ? `${produto.nome} adicionado aos seus produtos.`
                    : `${produto.nome} removido dos seus produtos.`
            );

        } catch (erro) {

            console.error("Erro ao atualizar o item:", erro);

            alertShared(erro.message);

        }

        await carregarLista();

    });

    // INFORMAÇÕES

    const info = document.createElement("div");

    info.className = "product-info";

    const nome = document.createElement("span");

    nome.className = "product-name";
    nome.textContent = produto.nome;

    const meta = document.createElement("span");

    meta.className = "product-meta";

    meta.textContent =
        `${produto.quantidade} un. • ${produto.categoria}`;

    info.append(nome, meta);

    // BOTÃO REMOVER

    const remover = document.createElement("button");

    remover.type = "button";
    remover.className = "remove-item";

    remover.innerHTML =
        '<i class="fa-solid fa-trash"></i>';

    remover.setAttribute(
        "aria-label",
        `Remover ${produto.nome}`
    );

    remover.addEventListener("click", async () => {

        const confirmar = await confirmarAcao(
            `Deseja remover ${produto.nome} da lista?`
        );

        if (!confirmar) return;

        try {

            await removerItemChecklist(produto.id);

        } catch (erro) {

            alertShared(erro.message);

        }

        await carregarLista();

    });

    item.append(
        checkbox,
        info,
        remover
    );

    return item;

}

// =================================
// RENDERIZAR LISTA
// =================================

function renderizarLista() {

    listaElement.replaceChildren();

    // MOSTRA O NO-CONTENT QUANDO A LISTA ESTÁ VAZIA
    atualizarNoContent(lista.length > 0);

    const filtrados = lista.filter(produto => {

        const correspondeBusca =
            produto.nome
                .toLocaleLowerCase("pt-BR")
                .includes(buscaAtual.toLocaleLowerCase("pt-BR"));

        const correspondeFiltro =
            filtroAtual === "todos" ||
            (
                filtroAtual === "pendentes" &&
                !produto.comprado
            );

        return correspondeBusca && correspondeFiltro;

    });

    // MOSTRAR PRODUTOS

    filtrados.forEach(produto => {

        listaElement.appendChild(
            criarElementoProduto(produto)
        );

    });

    // MENSAGEM VAZIA

    mensagemVazia.hidden = filtrados.length > 0;

    if (lista.length === 0) {

        mensagemVazia.textContent =
            "Sua lista está vazia. Adicione seu primeiro produto!";

    } else if (filtrados.length === 0) {

        mensagemVazia.textContent =
            "Nenhum produto encontrado.";

    }

    // ATUALIZAR RESUMO

    atualizarResumo();

    // ATUALIZAR FILTROS

    document.querySelectorAll(".filter").forEach(botao => {

        const ativo = botao.dataset.filtro === filtroAtual;

        botao.classList.toggle("active", ativo);

        botao.setAttribute(
            "aria-pressed",
            String(ativo)
        );

    });

}

// =================================
// ABRIR MODAL
// =================================

function abrirFormulario() {

    if (!modal.open) {
        modal.showModal();
    }

    nomeInput.focus();

}

// O btn-add compartilhado é carregado pelo load-components.js;
// o clique é capturado na seção para abrir o modal
btnAddSection.addEventListener("click", event => {
    if (!event.target.closest("#btn-add")) return;
    event.preventDefault();
    abrirFormulario();
});

// =================================
// FECHAR MODAL
// =================================

function fecharFormulario() {

    modal.close();

}

fecharModal.addEventListener("click", fecharFormulario);

cancelarModal.addEventListener("click", fecharFormulario);

// =================================
// CADASTRAR PRODUTO
// =================================

form.addEventListener("submit", async evento => {

    evento.preventDefault();

    const nome = nomeInput.value.trim();

    const quantidade = Number(
        quantidadeInput.value
    );

    const categoria = categoriaInput.value;

    // VALIDAR CAMPOS

    if (!nome) {

        alert("Informe o nome do produto.");

        nomeInput.focus();

        return;

    }

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > 999
    ) {

        alert("Informe uma quantidade entre 1 e 999.");

        quantidadeInput.focus();

        return;

    }

    if (!categoria) {

        alert("Selecione uma categoria.");

        categoriaInput.focus();

        return;

    }

    // SALVAR NO BANCO

    const botaoSalvar = form.querySelector('[type="submit"]');

    if (botaoSalvar) botaoSalvar.disabled = true;

    try {

        await adicionarItemChecklist({ nome, quantidade, categoria });

    } catch (erro) {

        alertShared(erro.message);

        return;

    } finally {

        if (botaoSalvar) botaoSalvar.disabled = false;

    }

    // LIMPAR FORMULÁRIO

    form.reset();

    quantidadeInput.value = 1;

    // VOLTAR PARA TODOS

    filtroAtual = "todos";

    buscaAtual = "";

    buscaInput.value = "";

    // FECHAR MODAL E ATUALIZAR TELA

    modal.close();

    await carregarLista();

});

// =================================
// PESQUISAR PRODUTOS
// =================================

buscaInput.addEventListener("input", evento => {

    buscaAtual = evento.target.value.trim();

    renderizarLista();

});

// =================================
// FILTRAR PRODUTOS
// =================================

document.querySelectorAll(".filter").forEach(botao => {

    botao.addEventListener("click", () => {

        filtroAtual = botao.dataset.filtro;

        renderizarLista();

    });

});

// =================================
// LIMPAR LISTA INTEIRA
// =================================

limparLista.addEventListener("click", async () => {

    if (lista.length === 0) {

        alertShared("Sua lista já está vazia.");

        return;

    }

    const confirmar = await confirmarAcao(
        "Deseja apagar todos os produtos da lista?"
    );

    if (!confirmar) return;

    try {

        await limparChecklist();

    } catch (erro) {

        alertShared(erro.message);

    }

    buscaAtual = "";

    filtroAtual = "todos";

    buscaInput.value = "";

    await carregarLista();

});

// =================================
// INICIALIZAÇÃO
// =================================

carregarLista();
