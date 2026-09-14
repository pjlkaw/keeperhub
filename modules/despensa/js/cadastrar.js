 const formProduto = document.getElementById("form-produto");

  formProduto.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const categoria = document.getElementById("categoria").value;
    const quantidade = Number(
      document.getElementById("quantidade").value
    );
    const unidade = document.getElementById("unidade").value;
    const validade = document.getElementById("validade").value;
    const marca = document.getElementById("marca").value.trim();

    if (!nome || !categoria || quantidade < 1 || !unidade) {
      alert("Preencha corretamente os campos obrigatórios.");
      return;
    }

    const novoProduto = {
      id: Date.now(),
      nome,
      categoria,
      quantidade,
      unidade,
      validade,
      marca,
      criadoEm: new Date().toISOString()
    };

    let produtos;

    try {
      produtos = JSON.parse(localStorage.getItem("produtos")) || [];

      if (!Array.isArray(produtos)) {
        produtos = [];
      }
    } catch (erro) {
      produtos = [];
    }

    produtos.push(novoProduto);
    localStorage.setItem("produtos", JSON.stringify(produtos));

    window.location.href = "inicio.html";
  });


//Script para fazer upload de imagem -->


    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');

    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            // Verifica se é imagem
            if (!file.type.startsWith('image/')) {
                alert('Por favor, selecione um arquivo de imagem válido.');
                this.value = '';
                preview.style.display = 'none';
                return;
            }
   
        }
    });