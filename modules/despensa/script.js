// Inicializador: coordena as funções específicas de cada página.
import { inicializarInterface } from './js/interface.js';
import { inicializarResumo } from './js/index.js';
import { inicializarCadastro } from './js/cadastrar.js';
import { inicializarProdutos } from './js/produtos.js';
import { inicializarPrecos } from './js/precos.js';

async function inicializarModulo() {
    try {
        const inicializadores = {
            index: inicializarResumo,
            cadastrar: inicializarCadastro,
            produtos: inicializarProdutos,
            precos: inicializarPrecos
        };
        inicializadores[document.body.dataset.pagina]?.();
        await inicializarInterface();
    } catch (erro) {
        const mensagem = document.createElement('p');
        mensagem.setAttribute('role', 'alert');
        mensagem.textContent = 'Não foi possível carregar a Despensa. Recarregue a página.';
        document.getElementById('main-content').prepend(mensagem);
    }
}

inicializarModulo();
