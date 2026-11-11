import { atualizarNoContent } from "/shared/services/no-content.js";

/* =====================================================
   KEEPERHUB — DESPENSA / VENCIMENTOS.JS

   Responsável por:
   - Buscar os produtos cadastrados no index;
   - Calcular os dias restantes;
   - Identificar produtos vencidos;
   - Atualizar os contadores;
   - Aplicar os filtros;
   - Exibir os produtos automaticamente.
===================================================== */


/* CHAVE DE ARMAZENAMENTO

   Deve ser exatamente igual à chave utilizada no index.js.
*/

const STORAGE_KEY = "keeperHubProducts";


/* ELEMENTOS HTML */

const lista = document.getElementById("listaVencimentos");

const contadorVencidos =
    document.getElementById("contadorVencidos");

const contadorSeteDias =
    document.getElementById("contadorSeteDias");

const totalVencimentos =
    document.getElementById("totalVencimentos");

const botoesFiltro =
    document.querySelectorAll("[data-filter]");


/* FILTRO INICIAL */

let filtroAtual = "todos";


/* =====================================================
   BUSCAR PRODUTOS

   Recupera os mesmos produtos cadastrados na página index.
===================================================== */

function getProducts() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(saved) ? saved : [];

    } catch (error) {

        console.error(
            "Erro ao ler produtos para vencimentos:",
            error
        );

        return [];

    }

}


/* =====================================================
   CALCULAR DIAS

   Compara a validade do produto com a data atual.

   Resultado:
   - Negativo: vencido;
   - Zero: vence hoje;
   - Positivo: ainda falta esse número de dias.
===================================================== */

function calcularDias(validade) {

    if (!validade) return null;

    const [ano, mes, dia] = validade
        .split("-")
        .map(Number);

    const dataValidade = Date.UTC(
        ano,
        mes - 1,
        dia
    );

    const hoje = new Date();

    const dataHoje = Date.UTC(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
    );

    return Math.round(
        (dataValidade - dataHoje) / 86400000
    );

}


/* =====================================================
   IDENTIFICAR STATUS

   Define a mensagem e a aparência da etiqueta.
===================================================== */

function identificarStatus(dias) {

    if (dias < 0) {

        return {

            texto: `Vencido há ${Math.abs(dias)} dia(s)`,

            classe: "vencido-status"

        };

    }

    if (dias === 0) {

        return {

            texto: "Vence hoje!",

            classe: "proximo"

        };

    }

    return {

        texto: `Vence em ${dias} dia(s)`,

        classe: "proximo"

    };

}


/* =====================================================
   ATUALIZAR CONTADORES

   Conta quantos produtos:
   - Já venceram;
   - Vencem nos próximos 7 dias.

   Produtos sem validade não entram nos contadores.
===================================================== */

function atualizarContadores(produtos) {


    /* PRODUTOS VENCIDOS */

    const vencidos = produtos.filter(product => {

        const dias = calcularDias(product.expiry);

        return dias !== null && dias < 0;

    });


    /* PRODUTOS QUE VENCEM EM ATÉ 7 DIAS */

    const proximosSeteDias = produtos.filter(product => {

        const dias = calcularDias(product.expiry);

        return dias !== null && dias >= 0 && dias <= 7;

    });


    /* MOSTRA OS RESULTADOS NO HTML */

    contadorVencidos.textContent = vencidos.length;

    contadorSeteDias.textContent = proximosSeteDias.length;

}


/* =====================================================
   FILTRAR PRODUTOS

   Aplica os filtros selecionados pelo usuário.
===================================================== */

function filtrarProdutos(produtos) {

    return produtos.filter(product => {

        const dias = calcularDias(product.expiry);


        /* Não exibe produtos sem data de validade */

        if (dias === null) return false;


        /* FILTRO: VENCIDOS */

        if (filtroAtual === "vencidos") {

            return dias < 0;

        }


        /* FILTRO: PRÓXIMOS 7 DIAS */

        if (filtroAtual === "7") {

            return dias >= 0 && dias <= 7;

        }


        /* FILTRO: PRÓXIMOS 30 DIAS */

        if (filtroAtual === "30") {

            return dias >= 0 && dias <= 30;

        }


        /* FILTRO: TODOS */

        return true;

    });

}


/* =====================================================
   CRIAR CARTÃO DO PRODUTO

   Monta visualmente cada produto na página.
===================================================== */

function criarCard(product) {

    const dias = calcularDias(product.expiry);

    const status = identificarStatus(dias);


    /* CARTÃO PRINCIPAL */

    const card = document.createElement("article");

    card.className = "card produto";


    /* NOME DO PRODUTO */

    const titulo = document.createElement("h3");

    titulo.textContent = product.name;


    /* ETIQUETA DE VALIDADE */

    const etiqueta = document.createElement("div");

    etiqueta.className = `status ${status.classe}`;

    etiqueta.textContent = status.texto;


    /* INFORMAÇÕES DO PRODUTO */

    const informacoes = document.createElement("div");

    informacoes.className = "card produto-info";

    informacoes.textContent =
        `${product.category} • ${product.quantity} unidade(s)`;


    /* ADICIONA OS ELEMENTOS AO CARTÃO */

    card.append(
        titulo,
        etiqueta,
        informacoes
    );


    return card;

}


/* =====================================================
   RENDERIZAR VENCIMENTOS

   Atualiza a página com os produtos cadastrados no index.
===================================================== */

function renderizarVencimentos() {

    if (!lista) return;


    /* BUSCA OS PRODUTOS SALVOS */

    const produtos = getProducts();


    /* ATUALIZA OS CONTADORES */

    atualizarContadores(produtos);


    /* SEPARA PRODUTOS COM VALIDADE */

    const produtosComValidade = produtos.filter(
        product => product.expiry
    );


    /* MOSTRA O NO-CONTENT QUANDO NENHUM PRODUTO TEM VALIDADE */

    atualizarNoContent(produtosComValidade.length > 0);


    /* APLICA O FILTRO SELECIONADO */

    const produtosFiltrados = filtrarProdutos(produtos);


    /* ATUALIZA O TOTAL DE ITENS */

    totalVencimentos.textContent =
        `Produtos - ${produtosFiltrados.length} Itens`;


    /* LIMPA A LISTA ANTERIOR */

    lista.innerHTML = "";


    /* MENSAGEM QUANDO NÃO EXISTEM PRODUTOS */

    if (produtosFiltrados.length === 0) {

        const mensagem = document.createElement("p");

        mensagem.className = "lista-vazia";

        mensagem.textContent =
            produtosComValidade.length === 0
                ? "Nenhum produto com validade cadastrada."
                : "Nenhum produto encontrado neste filtro.";

        lista.appendChild(mensagem);

        return;

    }


    /* ORDENA OS PRODUTOS

       Os produtos vencidos aparecem primeiro.
       Depois aparecem os que estão mais próximos de vencer.
    */

    produtosFiltrados.sort((a, b) => {

        return calcularDias(a.expiry) - calcularDias(b.expiry);

    });


    /* CRIA OS CARTÕES NA TELA */

    produtosFiltrados.forEach(product => {

        lista.appendChild(
            criarCard(product)
        );

    });

}


/* =====================================================
   EVENTOS DOS FILTROS

   Permite selecionar:
   - Todos;
   - Vencidos;
   - Em 7 dias;
   - Em 30 dias.
===================================================== */

botoesFiltro.forEach(botao => {

    botao.addEventListener("click", () => {


        /* GUARDA O FILTRO SELECIONADO */

        filtroAtual = botao.dataset.filter;


        /* REMOVE A SELEÇÃO DOS OUTROS BOTÕES */

        botoesFiltro.forEach(item => {

            item.classList.remove("ativo");

        });


        /* ATIVA O BOTÃO CLICADO */

        botao.classList.add("ativo");


        /* ATUALIZA A LISTA */

        renderizarVencimentos();

    });

});


/* =====================================================
   ATUALIZAÇÃO ENTRE ABAS

   Se o localStorage for alterado em outra aba,
   a página de vencimentos atualiza os dados.
===================================================== */

window.addEventListener("storage", event => {

    if (event.key === STORAGE_KEY) {

        renderizarVencimentos();

    }

});


/* =====================================================
   ATUALIZAR AO VOLTAR PARA A PÁGINA

   Atualiza os produtos quando o usuário retorna à aba.
===================================================== */

window.addEventListener(
    "focus",
    renderizarVencimentos
);


/* =====================================================
   INICIALIZAÇÃO

   Executa a leitura assim que a página abre.
===================================================== */

renderizarVencimentos();