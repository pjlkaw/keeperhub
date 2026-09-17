let filtroAtual = "Todos";


    /*
     * FILTRO POR CATEGORIA
     */
    function selecionarFiltro(botao) {

      document
        .querySelectorAll(".filter")
        .forEach(filter => {
          filter.classList.remove("active");
        });

      botao.classList.add("active");

      filtroAtual = botao.dataset.category;

      filtrarProdutos();
    }


    /*
     * BUSCA + FILTRO
     */
    function filtrarProdutos() {

      const texto =
        document
          .getElementById("searchInput")
          .value
          .toLowerCase()
          .trim();

      const produtos =
        document.querySelectorAll(".product-card");

      let encontrados = 0;

      produtos.forEach(produto => {

        const nome =
          produto.dataset.name.toLowerCase();

        const categoria =
          produto.dataset.category;

        const correspondeNome =
          nome.includes(texto);

        const correspondeCategoria =
          filtroAtual === "Todos" ||
          categoria === filtroAtual;

        if (
          correspondeNome &&
          correspondeCategoria
        ) {

          produto.style.display = "flex";

          encontrados++;

        } else {

          produto.style.display = "none";

        }

      });


      const mensagem =
        document.getElementById("emptyMessage");

      if (encontrados === 0) {
        mensagem.classList.add("show");
      } else {
        mensagem.classList.remove("show");
      }

    }


    /*
     * ALTERAR QUANTIDADE
     */
    function alterarQuantidade(botao, valor) {

      const card =
        botao.closest(".product-card");

      const quantidadeElemento =
        card.querySelector(".quantity");

      const textoQuantidade =
        card.querySelector(".quantity-text");

      let quantidade =
        parseInt(quantidadeElemento.textContent);

      quantidade += valor;

      if (quantidade < 1) {
        quantidade = 1;
      }


      quantidadeElemento.textContent =
        quantidade;

      textoQuantidade.textContent =
        quantidade;

      card.dataset.quantity =
        quantidade;


      atualizarTextoUnidades(
        card,
        quantidade
      );

    }


    /*
     * ALTERA "UNIDADE" / "UNIDADES"
     */
    function atualizarTextoUnidades(
      card,
      quantidade
    ) {

      const paragrafo =
        card.querySelector("p");

      const texto =
        paragrafo.innerHTML;

      if (quantidade === 1) {

        paragrafo.innerHTML =
          texto.replace(
            "unidades",
            "unidade"
          );

      } else {

        paragrafo.innerHTML =
          texto.replace(
            "unidade",
            "unidades"
          );

      }

    }


    /*
     * EXCLUIR PRODUTO
     */
    function excluirProduto(botao) {

      const card =
        botao.closest(".product-card");

      card.classList.add("removing");

      setTimeout(() => {

        card.remove();

        atualizarContador();

        filtrarProdutos();

      }, 200);

    }


    /*
     * ATUALIZA O CONTADOR
     */
    function atualizarContador() {

      const total =
        document.querySelectorAll(
          ".product-card"
        ).length;

      document.getElementById(
        "itemsBadge"
      ).textContent =
        total + (total === 1 ? " item" : " itens");

    }

    /*
     * BOTÃO VOLTAR
     */
    function voltar() {
      window.history.back();
    }

  
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
