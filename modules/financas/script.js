// Inicializador: coordena as funções específicas de cada página do módulo Finanças.
import { inicializarInterface } from './js/interface.js';
import { inicializarResumo } from './js/index.js';
import { inicializarTransacoes } from './js/transacoes.js';
import { inicializarNovaTransacao } from './js/nova-transacao.js';
import { inicializarRelatorios } from './js/relatorios.js';
import { inicializarContas } from './js/contas.js';
import { inicializarVencimentos } from './js/vencimentos.js';

async function inicializarModulo() {
    try {
        const inicializadores = {
            index: inicializarResumo,
            transacoes: inicializarTransacoes,
            'nova-transacao': inicializarNovaTransacao,
            relatorios: inicializarRelatorios,
            contas: inicializarContas,
            vencimentos: inicializarVencimentos
        };
        inicializadores[document.body.dataset.pagina]?.();
        await inicializarInterface();
    } catch (erro) {
        const mensagem = document.createElement('p');
        mensagem.setAttribute('role', 'alert');
        mensagem.textContent = 'Não foi possível carregar o módulo Finanças. Recarregue a página.';
        document.querySelector('main')?.prepend(mensagem);
    }
}

inicializarModulo();
