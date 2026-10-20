const CHAVE = "keeperhub_checklist_compras";

const produtosIniciais = [
    { nome: "Arroz", quantidade: 1, categoria: "Alimentos" },
    { nome: "Feijão", quantidade: 1, categoria: "Alimentos" },
    { nome: "Macarrão", quantidade: 2, categoria: "Alimentos" },
    { nome: "Óleo", quantidade: 1, categoria: "Alimentos" },
    { nome: "Açúcar", quantidade: 1, categoria: "Alimentos" },
    { nome: "Sal", quantidade: 1, categoria: "Alimentos" },
    { nome: "Leite", quantidade: 2, categoria: "Bebidas" },
    { nome: "Café", quantidade: 1, categoria: "Bebidas" },
    { nome: "Pão", quantidade: 1, categoria: "Alimentos" },
    { nome: "Ovos", quantidade: 1, categoria: "Alimentos" },
    { nome: "Banana", quantidade: 1, categoria: "Frutas e verduras" },
    { nome: "Tomate", quantidade: 1, categoria: "Frutas e verduras" },
    { nome: "Frango", quantidade: 1, categoria: "Carnes e frios" },
    { nome: "Detergente", quantidade: 1, categoria: "Limpeza" },
    { nome: "Sabão em pó", quantidade: 1, categoria: "Limpeza" },
    { nome: "Papel higiênico", quantidade: 1, categoria: "Higiene" },
    { nome: "Creme dental", quantidade: 1, categoria: "Higiene" }
];

function carregarLista() {
    try {
        const dados = localStorage.getItem(CHAVE);

        if (dados === null) {
            return produtosIniciais.map((produto, id) => ({
                ...produto,
                id: `inicial-${id}`,
                comprado: false
            }));
        }

        const lista = JSON.parse(dados);

        if (!Array.isArray(lista)) {
            throw new Error("Formato inválido");
        }

        return lista;
    } catch (erro) {
        console.error("Não foi possível carregar a lista:", erro);
        return [];
    }
}

let lista = carregarLista();
let filtroAtual = "todos";
let buscaAtual = "";

const form = document.getElementById("formProduto");
const nomeInput = document.getElementById("nomeProduto");
const quantidadeInput = document.getElementById("quantidadeProduto");
const categoriaInput = document.getElementById("categoriaProduto");
const listaElement = document.getElementById("listaCompras");
const mensagemVazia = document.getElementById("mensagemVazia");

function salvarLista() {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(lista));
        return true;
    } catch (erro) {
        console.error("Não foi possível salvar a lista:", erro);
        alert("Não foi possível salvar a lista neste navegador.");
        return false;
    }
}

function atualizarResumo() {
    const total = lista.length;
    const comprados = lista.filter(item => item.comprado).length;
    const porcentagem = total ? Math.round(comprados / total * 100) : 0;

    document.getElementById("totalSelecionados").textContent = total;
    document.getElementById("totalComprados").textContent = comprados;
    document.getElementById("progressoTexto").textContent = `${porcentagem}%`;
    document.getElementById("progressoBarra").style.width =
        `${porcentagem}%`;
}

function criarElementoProduto(produto) {
    const item = document.createElement("article");
    item.className = `shopping-item${produto.comprado ? " done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = produto.comprado;
    checkbox.setAttribute("aria-label", `Marcar ${produto.nome} como comprado`);

    checkbox.addEventListener("change", () => {
        produto.comprado = checkbox.checked;
        salvarLista();
        renderizarLista();
    });

    const info = document.createElement("div");
    info.className = "product-info";

    const nome = document.createElement("span");
    nome.className = "product-name";
    nome.textContent = produto.nome;

    const meta = document.createElement("span");
    meta.className = "product-meta";
    meta.textContent = `${produto.quantidade} un. • ${produto.categoria}`;

    info.append(nome, meta);

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "remove-item";
    remover.innerHTML = '<i class="fa-solid fa-trash"></i>';
    remover.setAttribute("aria-label", `Remover ${produto.nome}`);

    remover.addEventListener("click", () => {
        lista = lista.filter(item => item.id !== produto.id);
        salvarLista();
        renderizarLista();
    });

    item.append(checkbox, info, remover);
    return item;
}

function renderizarLista() {
    listaElement.replaceChildren();

    const filtrados = lista.filter(produto => {
        const correspondeBusca = produto.nome
            .toLocaleLowerCase("pt-BR")
            .includes(buscaAtual.toLocaleLowerCase("pt-BR"));

        const correspondeFiltro =
            filtroAtual === "todos" ||
            (filtroAtual === "comprados" && produto.comprado) ||
            (filtroAtual === "pendentes" && !produto.comprado);

        return correspondeBusca && correspondeFiltro;
    });

    filtrados.forEach(produto => {
        listaElement.appendChild(criarElementoProduto(produto));
    });

    mensagemVazia.hidden = filtrados.length > 0;
    atualizarResumo();

    document.querySelectorAll(".filter").forEach(botao => {
        const ativo = botao.dataset.filtro === filtroAtual;
        botao.classList.toggle("active", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
    });
}

form.addEventListener("submit", evento => {
    evento.preventDefault();

    const nome = nomeInput.value.trim();
    const quantidade = Number(quantidadeInput.value);

    if (!nome || !Number.isInteger(quantidade) ||
        quantidade < 1 || quantidade > 999) {
        alert("Informe um produto e uma quantidade válida.");
        return;
    }

    lista.push({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        nome,
        quantidade,
        categoria: categoriaInput.value,
        comprado: false
    });

    salvarLista();
    form.reset();
    quantidadeInput.value = 1;
    nomeInput.focus();
    renderizarLista();
});

document.getElementById("buscaProduto").addEventListener("input", evento => {
    buscaAtual = evento.target.value.trim();
    renderizarLista();
});

document.querySelectorAll(".filter").forEach(botao => {
    botao.addEventListener("click", () => {
        filtroAtual = botao.dataset.filtro;
        renderizarLista();
    });
});

document.getElementById("limparComprados").addEventListener("click", () => {
    lista = lista.filter(produto => !produto.comprado);
    salvarLista();
    renderizarLista();
});

document.getElementById("limparLista").addEventListener("click", () => {
    if (!lista.length) return;

    if (confirm("Deseja apagar todos os produtos da lista?")) {
        lista = [];
        salvarLista();
        renderizarLista();
    }
});

renderizarLista();