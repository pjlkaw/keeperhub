import { inicializarTransacoes } from './js/transacoes.js';
import { inicializarRelatorios } from './js/relatorios.js';
import { inicializarFormulario } from './js/formulario.js';
import { inicializarContas } from './js/contas.js';
import { inicializarDashboard } from './js/dashboard.js';

await Promise.all([
    inicializarTransacoes(),
    inicializarRelatorios(),
    inicializarFormulario(),
    inicializarContas(),
    inicializarDashboard()
]);
