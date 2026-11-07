
// ELEMENTOS

const productList = document.getElementById("productList");

const searchInput = document.getElementById("searchInput");

const clearSearch = document.getElementById("clearSearch");

const addButton = document.getElementById("addButton");

const productModal = document.getElementById("productModal");

const productForm = document.getElementById("productForm");

const closeModal = document.getElementById("closeModal");

const cancelButton = document.getElementById("cancelButton");

const modalTitle = document.getElementById("modalTitle");

const productName = document.getElementById("productName");

const productCategory = document.getElementById("productCategory");

const productQuantity = document.getElementById("productQuantity");

const productExpiry = document.getElementById("productExpiry");

const categoryButtons = document.querySelectorAll(".category");


// Armazenamento

let products = JSON.parse(
    localStorage.getItem("keeperHubProducts")
) || [];

let selectedCategory = "Todos";

let editingId = null;


// Salvar produtos no navegador

function saveProducts() {

    localStorage.setItem(
        "keeperHubProducts",
        JSON.stringify(products)
    );

}

// Abrir modal

function openModal() {

    editingId = null;

    productForm.reset();

    productQuantity.value = 1;

    modalTitle.textContent = "Adicionar produto";

    productModal.showModal();

}

addButton.addEventListener("click", openModal);


// Fechar modal

closeModal.addEventListener("click", () => {

    productModal.close();

});

cancelButton.addEventListener("click", () => {

    productModal.close();

});

// Cadastrar e editar

productForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const name = productName.value.trim();

    const category = productCategory.value;

    const quantity = Number(productQuantity.value);

    const expiry = productExpiry.value;

    if (!name || !category || quantity < 1) {

        alert("Preencha todos os campos corretamente.");

        return;

    }

    // Editar produto existente

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

    // Cadastrar novo produto

    else {

        const newProduct = {

            id: Date.now(),

            name: name,

            category: category,

            quantity: quantity,

            expiry: expiry

        };

        products.push(newProduct);

    }

    saveProducts();

    renderProducts();

    productModal.close();

    productForm.reset();

});



// Editar produto


function editProduct(id) {

    const product = products.find(
        item => item.id === id
    );

    if (!product) return;

    editingId = id;

    productName.value = product.name;

    productCategory.value = product.category;

    productQuantity.value = product.quantity;

    productExpiry.value = product.expiry || "";

    modalTitle.textContent = "Editar produto";

    productModal.showModal();

}



// Excluir produto


function deleteProduct(id) {

    const confirmation = confirm(
        "Deseja realmente excluir este produto?"
    );

    if (!confirmation) return;

    products = products.filter(
        item => item.id !== id
    );

    saveProducts();

    renderProducts();

}

// Data de validade


function getDaysUntilExpiry(date) {

    if (!date) return null;

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const expiry = new Date(date + "T00:00:00");

    return Math.round(
        (expiry - today) / (1000 * 60 * 60 * 24)
    );

}


function formatDate(date) {

    if (!date) return "Não informada";

    const [year, month, day] = date.split("-");

    return `${day}/${month}/${year}`;

}

// Renderizar produtos

function renderProducts() {

    productList.innerHTML = "";

    let filteredProducts = [...products];

// Filtro de categoria

    if (selectedCategory !== "Todos") {

        filteredProducts = filteredProducts.filter(
            product => product.category === selectedCategory
        );

    }

// Pesquisa

    const search = searchInput.value
        .toLowerCase()
        .trim();

    if (search) {

        filteredProducts = filteredProducts.filter(
            product => product.name.toLowerCase().includes(search)
        );

    }

    // Nenhum produto encontrado

    if (filteredProducts.length === 0) {

        const message = document.createElement("p");

        message.className = "empty-message";

        if (products.length === 0) {

            message.textContent = "Nenhum produto cadastrado.";

        } else {

            message.textContent = "Nenhum produto encontrado.";

        }

        productList.appendChild(message);

        return;

    }

    // Criar cartões

    filteredProducts.forEach(product => {

        const card = document.createElement("article");

        card.className = "product-card";

        // Informações

        const information = document.createElement("section");

        information.className = "product-information";

        const name = document.createElement("h3");

        name.textContent = product.name;

        const category = document.createElement("p");

        category.textContent = product.category;

        const quantity = document.createElement("p");

        quantity.textContent =
            `Quantidade: ${product.quantity}`;

        const validity = document.createElement("p");

        validity.className = "validity";

        const days = getDaysUntilExpiry(product.expiry);

        if (!product.expiry) {

            validity.textContent = "Validade não informada";

        } else if (days < 0) {

            validity.textContent =
                `Vencido há ${Math.abs(days)} dia(s)`;

            validity.classList.add("expired");

        } else if (days === 0) {

            validity.textContent = "Vence hoje!";

            validity.classList.add("expired");

        } else {

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

        // Botões

        const actions = document.createElement("section");

        actions.className = "product-actions";

        const editButton = document.createElement("button");

        editButton.className = "edit-button";

        editButton.innerHTML =
            '<i class="fa-solid fa-pen"></i>';

        editButton.setAttribute("aria-label", "Editar produto");

        editButton.addEventListener("click", () => {

            editProduct(product.id);

        });

        const deleteButton = document.createElement("button");

        deleteButton.className = "delete-button";

        deleteButton.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        deleteButton.setAttribute("aria-label", "Excluir produto");

        deleteButton.addEventListener("click", () => {

            deleteProduct(product.id);

        });

        actions.append(editButton, deleteButton);

        card.append(information, actions);

        productList.appendChild(card);

    });

}


// FILTRAR CATEGORIAS

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


// PESQUISAR

searchInput.addEventListener("input", () => {

    clearSearch.style.display =
        searchInput.value ? "block" : "none";

    renderProducts();

});


// Limpar pesquisa

clearSearch.addEventListener("click", () => {

    searchInput.value = "";

    clearSearch.style.display = "none";

    renderProducts();

    searchInput.focus();

});


// Iniciar a página


renderProducts();
