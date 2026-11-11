/* =====================================================
   KEEPERHUB — DESPENSA / ESTOQUE.JS

   Liga a Checklist aos Produtos da Despensa:
   - Item marcado como comprado → vira um produto;
   - Item desmarcado → o produto criado por ele é removido.

   Usa a mesma chave do script.js (tela inicial) e do
   vencimentos.js, então o produto aparece nas duas telas.
===================================================== */

const STORAGE_KEY = "keeperHubProducts";

function lerProdutos() {
    try {
        const salvos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(salvos) ? salvos : [];
    } catch (erro) {
        console.error("Erro ao ler produtos da despensa:", erro);
        return [];
    }
}

function gravarProdutos(produtos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
}

function gerarId() {
    return (globalThis.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now());
}

/* Cria o produto na despensa e devolve o id dele.
   A validade fica em branco: o usuário completa depois
   editando o produto na tela inicial. */
export function adicionarProdutoComprado(item) {
    const produtos = lerProdutos();
    const novo = {
        id: gerarId(),
        name: item.nome,
        category: item.categoria || "Outros",
        quantity: Number(item.quantidade) || 1,
        expiry: ""
    };
    produtos.push(novo);
    gravarProdutos(produtos);
    return novo.id;
}

/* Remove o produto criado pela checklist (se ainda existir) */
export function removerProdutoComprado(produtoId) {
    if (!produtoId) return;
    const produtos = lerProdutos().filter(
        produto => String(produto.id) !== String(produtoId)
    );
    gravarProdutos(produtos);
}
