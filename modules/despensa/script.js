import { confirmarAcao } from "./js/confirmar.js";

/* =====================================================
   KEEPERHUB — DESPENSA / INDEX.JS

   Responsável por:
   - Ler e salvar produtos no localStorage;
   - Cadastrar produtos;
   - Editar produtos;
   - Excluir produtos;
   - Pesquisar e filtrar categorias;
   - Calcular a validade;
   - Compartilhar os dados com a página Vencimentos.
===================================================== */

/* CHAVE DE ARMAZENAMENTO

   IMPORTANTE:
   A página Vencimentos utiliza exatamente a mesma chave.
*/
const STORAGE_KEY = "keeperHubProducts";

/* ELEMENTOS HTML */
const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const addButton = document.getElementById("addButton");
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const closeModalButton = document.getElementById("closeModal");
const cancelButton = document.getElementById("cancelButton");
const modalTitle = document.getElementById("modalTitle");

const productName = document.getElementById("productName");
const productCategory = document.getElementById("productCategory");
const productQuantity = document.getElementById("productQuantity");
const productExpiry = document.getElementById("productExpiry");

const categoryButtons = document.querySelectorAll("[data-category]");
const productCounter = document.getElementById("contador-produtos");

/* VARIÁVEIS DE CONTROLE */
let products = loadProducts();
let selectedCategory = "Todos";
let editingId = null;


/* =====================================================
   CARREGAR PRODUTOS
   Recupera os produtos que já estão salvos no navegador.
===================================================== */

function loadProducts() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(saved) ? saved : [];

    } catch (error) {

        console.error("Erro ao carregar produtos:", error);

        return [];

    }

}


/* =====================================================
   SALVAR PRODUTOS
   Salva todos os produtos no localStorage.
   A página Vencimentos também consulta esse armazenamento.
===================================================== */

function saveProducts() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(products)
    );

}


/* =====================================================
   ABRIR MODAL
   Limpa os campos e abre o formulário de cadastro.
===================================================== */

function openModal() {

    editingId = null;

    productForm.reset();

    productQuantity.value = 1;

    modalTitle.textContent = "Adicionar produto";

    productModal.showModal();

}


/* =====================================================
   FECHAR MODAL
===================================================== */

function closeProductModal() {

    productModal.close();

    productForm.reset();

    editingId = null;

}


/* EVENTOS DOS BOTÕES */

addButton.addEventListener("click", openModal);

closeModalButton.addEventListener(
    "click",
    closeProductModal
);

cancelButton.addEventListener(
    "click",
    closeProductModal
);


/* =====================================================
   CADASTRAR E EDITAR PRODUTOS

   Aqui está a parte principal da integração.

   Quando o usuário cadastra um produto, são armazenados:
   - ID;
   - Nome;
   - Categoria;
   - Quantidade;
   - Data de validade.

   A página Vencimentos consegue ler esses mesmos dados.
===================================================== */

productForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const name = productName.value.trim();

    const category = productCategory.value;

    const quantity = Number(productQuantity.value);

    const expiry = productExpiry.value;


    /* Verifica se os campos obrigatórios estão preenchidos */

    if (
        !name ||
        !category ||
        !Number.isFinite(quantity) ||
        quantity < 1
    ) {

        alert("Preencha os campos corretamente.");

        return;

    }


    /* SE ESTIVER EDITANDO UM PRODUTO */

    if (editingId !== null) {

        const product = products.find(
            item => item.id === editingId
        );

        if (product) {

            product.name = name;

            product.category = category;

            product.quantity = quantity;

            product.expiry = expiry;

        }

    }


    /* SE ESTIVER CADASTRANDO UM NOVO PRODUTO */

    else {

        const newProduct = {

            id: (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : String(Date.now()),

            name: name,

            category: category,

            quantity: quantity,

            expiry: expiry

        };

        products.push(newProduct);

    }


    /* SALVA OS DADOS COMPARTILHADOS */

    saveProducts();

    /* Atualiza os cartões da página Produtos */

    renderProducts();

    /* Fecha o formulário */

    closeProductModal();

});


/* =====================================================
   EDITAR PRODUTO
   Recupera as informações e preenche o formulário.
===================================================== */

function editProduct(id) {

    const product = products.find(
        item => String(item.id) === String(id)
    );

    if (!product) return;

    editingId = product.id;

    productName.value = product.name;

    productCategory.value = product.category;

    productQuantity.value = product.quantity;

    productExpiry.value = product.expiry || "";

    modalTitle.textContent = "Editar produto";

    productModal.showModal();

}


/* =====================================================
   EXCLUIR PRODUTO
   Remove o produto do armazenamento compartilhado.
===================================================== */

async function deleteProduct(id) {

    const confirmation = await confirmarAcao(
        "Deseja realmente excluir este produto?"
    );

    if (!confirmation) return;

    products = products.filter(
        item => String(item.id) !== String(id)
    );

    saveProducts();

    renderProducts();

}


/* =====================================================
   CALCULAR DIAS ATÉ O VENCIMENTO

   Retorna:
   - Número negativo: produto vencido;
   - Zero: vence hoje;
   - Número positivo: dias restantes;
   - Null: validade não informada.
===================================================== */

function getDaysUntilExpiry(date) {

    if (!date) return null;

    const [year, month, day] = date.split("-").map(Number);

    const expiryDate = Date.UTC(
        year,
        month - 1,
        day
    );

    const today = new Date();

    const todayDate = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    return Math.round(
        (expiryDate - todayDate) / 86400000
    );

}


/* =====================================================
   FORMATAR DATA

   Transforma AAAA-MM-DD em DD/MM/AAAA.
===================================================== */

function formatDate(date) {

    if (!date) return "Não informada";

    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;

}


/* =====================================================
   CONTADOR DE PRODUTOS
   Atualiza o número de produtos cadastrados.
===================================================== */

function updateProductCounter() {

    if (productCounter) {

        productCounter.textContent =
            `${products.length} produto(s) cadastrado(s)`;

    }

}


/* =====================================================
   RENDERIZAR PRODUTOS

   Cria os cartões na tela e aplica os filtros.
===================================================== */

function renderProducts() {

    if (!productList) return;

    productList.innerHTML = "";

    let filteredProducts = [...products];


    /* FILTRO POR CATEGORIA */

    if (selectedCategory !== "Todos") {

        filteredProducts = filteredProducts.filter(
            product => product.category === selectedCategory
        );

    }


    /* FILTRO DE PESQUISA */

    const search = searchInput.value
        .toLowerCase()
        .trim();

    if (search) {

        filteredProducts = filteredProducts.filter(
            product => product.name.toLowerCase().includes(search)
        );

    }


    /* ATUALIZA CONTADOR */

    updateProductCounter();


    /* MENSAGEM QUANDO NÃO EXISTEM PRODUTOS */

    if (filteredProducts.length === 0) {

        const message = document.createElement("p");

        message.className = "empty-message";

        message.textContent = products.length === 0
            ? "Nenhum produto cadastrado."
            : "Nenhum produto encontrado.";

        productList.appendChild(message);

        return;

    }


    /* CRIA OS CARTÕES */

    filteredProducts.forEach(product => {

        const card = document.createElement("article");

        card.className = "product-card";


        /* INFORMAÇÕES DO PRODUTO */

        const information = document.createElement("section");

        information.className = "product-information";


        const name = document.createElement("h3");

        name.textContent = product.name;


        const category = document.createElement("p");

        category.textContent = product.category;


        const quantity = document.createElement("p");

        quantity.textContent =
            `Quantidade: ${product.quantity}`;


        /* INFORMAÇÃO DA VALIDADE */

        const validity = document.createElement("p");

        validity.className = "validity";

        const days = getDaysUntilExpiry(product.expiry);


        if (days === null) {

            validity.textContent = "Validade não informada";

        }

        else if (days < 0) {

            validity.textContent =
                `Vencido há ${Math.abs(days)} dia(s)`;

            validity.classList.add("expired");

        }

        else if (days === 0) {

            validity.textContent = "Vence hoje!";

            validity.classList.add("expired");

        }

        else {

            validity.textContent =
                `Validade: ${formatDate(product.expiry)}`;

            if (days <= 7) {

                validity.classList.add("expired");

            }

        }


        information.append(
            name,
            category,
            quantity,
            validity
        );


        /* BOTÕES DE AÇÃO */

        const actions = document.createElement("section");

        actions.className = "product-actions";


        /* BOTÃO EDITAR */

        const editButton = document.createElement("button");

        editButton.type = "button";

        editButton.className = "edit-button";

        editButton.innerHTML =
            '<i class="fa-solid fa-pen"></i>';

        editButton.setAttribute(
            "aria-label",
            "Editar produto"
        );

        editButton.addEventListener("click", () => {

            editProduct(product.id);

        });


        /* BOTÃO EXCLUIR */

        const deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "delete-button";

        deleteButton.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        deleteButton.setAttribute(
            "aria-label",
            "Excluir produto"
        );

        deleteButton.addEventListener("click", () => {

            deleteProduct(product.id);

        });


        /* ADICIONA OS BOTÕES E INFORMAÇÕES */

        actions.append(editButton, deleteButton);

        card.append(information, actions);

        productList.appendChild(card);

    });

}


/* =====================================================
   FILTRAR CATEGORIAS
===================================================== */

categoryButtons.forEach(button => {

    button.addEventListener("click", () => {

        categoryButtons.forEach(item => {

            item.classList.remove("active");

        });

        button.classList.add("active");

        selectedCategory = button.dataset.category;

        renderProducts();

    });

});


/* =====================================================
   PESQUISAR PRODUTOS
===================================================== */

searchInput.addEventListener("input", () => {

    if (clearSearch) {

        clearSearch.hidden = !searchInput.value;

    }

    renderProducts();

});


/* =====================================================
   LIMPAR PESQUISA
===================================================== */

if (clearSearch) {

    clearSearch.addEventListener("click", () => {

        searchInput.value = "";

        clearSearch.hidden = true;

        renderProducts();

        searchInput.focus();

    });

}


/* =====================================================
   INICIAR PÁGINA
   Carrega os produtos salvos assim que a página abre.
===================================================== */

renderProducts();