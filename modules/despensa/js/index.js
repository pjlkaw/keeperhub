
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






const listaProdutos = document.getElementById("lista-produtos");
  const contadorProdutos = document.getElementById("contador-produtos");

  function carregarProdutos() {
    let produtos;

    try {
      produtos = JSON.parse(localStorage.getItem("produtos")) || [];

      if (!Array.isArray(produtos)) {
        produtos = [];
      }
    } catch (erro) {
      produtos = [];
    }

    contadorProdutos.textContent =
      produtos.length === 1
        ? "1 produto cadastrado"
        : `${produtos.length} produtos cadastrados`;

    listaProdutos.replaceChildren();

    if (produtos.length === 0) {
      const mensagem = document.createElement("p");
      mensagem.className = "lista-vazia";
      mensagem.textContent = "";
      listaProdutos.appendChild(mensagem);
      return;
    }

    const produtosOrdenados = [...produtos].sort(function (a, b) {
      if (!a.validade && !b.validade) return 0;
      if (!a.validade) return 1;
      if (!b.validade) return -1;

      return a.validade.localeCompare(b.validade);
    });

    produtosOrdenados.forEach(function (produto) {
      const item = document.createElement("article");
      item.className = "produto-item";

      const informacoes = document.createElement("div");

      const nome = document.createElement("h3");
      nome.textContent = produto.nome;

      const detalhes = document.createElement("p");
      detalhes.textContent =
        `${produto.quantidade} ${produto.unidade}` +
        ` - ${produto.categoria}`;

      const marca = document.createElement("p");
      marca.textContent = produto.marca
        ? `Marca: ${produto.marca}`
        : "Marca não informada";

      const validade = document.createElement("p");
      validade.textContent = produto.validade
        ? `Validade: ${formatarData(produto.validade)}`
        : "Validade não informada";

      const botaoExcluir = document.createElement("button");
      botaoExcluir.type = "button";
      botaoExcluir.className = "botao-excluir";
      botaoExcluir.textContent = "Excluir";
      botaoExcluir.addEventListener("click", function () {
        excluirProduto(produto.id);
      });

      informacoes.append(nome, detalhes, marca, validade);
      item.append(informacoes, botaoExcluir);
      listaProdutos.appendChild(item);
    });
  }

  function formatarData(data) {
    const partes = data.split("-");

    if (partes.length !== 3) {
      return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function excluirProduto(id) {
    const produtos =
      JSON.parse(localStorage.getItem("produtos")) || [];

    const produtosAtualizados = produtos.filter(function (produto) {
      return produto.id !== id;
    });

    localStorage.setItem(
      "produtos",
      JSON.stringify(produtosAtualizados)
    );

    carregarProdutos();
  }

  carregarProdutos();