// Persistência específica dos produtos da Despensa.
// A chave antiga permanece intacta para preservar os cadastros existentes.
const CHAVE_PRODUTOS = 'keeperhub-despensa-produtos';
const CHAVE_LEGADA = 'produtos';

export function lerProdutos() {
    const texto = localStorage.getItem(CHAVE_PRODUTOS) ?? localStorage.getItem(CHAVE_LEGADA);
    const produtos = texto === null ? [] : JSON.parse(texto);
    if (!Array.isArray(produtos) || produtos.some((produto) =>
        !produto || typeof produto.nome !== 'string' ||
        !Number.isFinite(produto.quantidade) || produto.quantidade < 1 ||
        !['string', 'number'].includes(typeof produto.id))) {
        throw new Error('Os dados salvos da despensa não puderam ser lidos.');
    }
    return produtos;
}

export function salvarProdutos(produtos) {
    localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(produtos));
}
