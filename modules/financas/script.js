import { inicializarTransacoes } from './js/transacoes.js';
import { inicializarRelatorios } from './js/relatorios.js';
import { inicializarFormulario } from './js/formulario.js';
import { inicializarContas } from './js/contas.js';
import { inicializarDashboard } from './js/dashboard.js';
import { obterContas } from './js/dados.js';
import { mostrarErroAcesso } from './js/acesso.js';

try {
    await Promise.all([
        inicializarTransacoes(),
        inicializarRelatorios(),
        inicializarFormulario(),
        inicializarContas(),
        inicializarDashboard()
    ]);
} catch (erro) {
    // Falha ao carregar (ex.: sem login ou sem conexão): mostra o erro com "Tentar novamente".
    console.error('Não foi possível carregar o módulo Finanças:', erro);
    mostrarErroAcesso(erro, obterContas);
}
