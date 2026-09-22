import { lerProdutos, salvarProdutos } from './armazenamento.js';

export function inicializarCadastro() {
    const formulario = document.getElementById('form-produto');
    const mensagem = document.getElementById('erro-cadastro');
    formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        mensagem.hidden = true;
        const campos = new FormData(formulario);
        const nome = String(campos.get('nome') || '').trim();
        const categoria = String(campos.get('categoria') || '');
        const quantidade = Number(campos.get('quantidade'));
        const unidade = String(campos.get('unidade') || '');
        if (!nome || !categoria || !Number.isFinite(quantidade) || quantidade < 1 || !unidade) {
            mensagem.textContent = 'Preencha corretamente os campos obrigatórios.';
            mensagem.hidden = false;
            return;
        }
        try {
            const produtos = lerProdutos();
            produtos.push({
                id: Date.now(), nome, categoria, quantidade, unidade,
                validade: String(campos.get('validade') || ''),
                marca: String(campos.get('marca') || '').trim(),
                criadoEm: new Date().toISOString()
            });
            salvarProdutos(produtos);
            window.location.href = '/modules/despensa/index.html';
        } catch (erro) {
            mensagem.textContent = 'Não foi possível salvar o produto. Verifique os dados e o armazenamento do navegador.';
            mensagem.hidden = false;
        }
    });

    const arquivo = document.getElementById('fileInput');
    const previa = document.getElementById('preview');
    let urlPrevia = null;
    arquivo.addEventListener('change', () => {
        if (urlPrevia) URL.revokeObjectURL(urlPrevia);
        urlPrevia = null;
        previa.hidden = true;
        previa.removeAttribute('src');
        const imagem = arquivo.files[0];
        if (!imagem) return;
        if (!imagem.type.startsWith('image/')) {
            arquivo.value = '';
            mensagem.textContent = 'Selecione um arquivo de imagem válido.';
            mensagem.hidden = false;
            return;
        }
        urlPrevia = URL.createObjectURL(imagem);
        previa.src = urlPrevia;
        previa.hidden = false;
    });
    window.addEventListener('pagehide', () => {
        if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    });
}
