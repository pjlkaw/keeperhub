/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: cadastrar-registro.js
Configura o cabeçalho e controla a alternância entre os formulários
de medicação e vacina na página de cadastro unificado.
Depende de: shared/services/load-components.js, medicacoes.js, vacinacoes.js
Usado por: components/cadastrar-registro.html
================================================== */

const parametrosCadastro = new URLSearchParams(location.search);
const tipoInicial = parametrosCadastro.get('tipo') === 'vacina'
    ? 'vacina'
    : 'medicamento';
const petOrigem = parametrosCadastro.get('petId');
const todosNaOrigem = !petOrigem && parametrosCadastro.get('todos') === '1';

// Ajusta o retorno do cabeçalho antes de o script compartilhado ler a configuração.
const listaOrigem = tipoInicial === 'vacina'
    ? 'vacinacoes.html'
    : 'medicacoes.html';
const retornoCadastro = new URL(listaOrigem, location.href);
if (petOrigem) retornoCadastro.searchParams.set('petId', petOrigem);
if (todosNaOrigem) retornoCadastro.searchParams.set('todos', '1');
window.keeperhubModuleConfig.backUrl = retornoCadastro.href;

// Espera o HTML existir antes de preparar os painéis e os respectivos scripts.
document.addEventListener('DOMContentLoaded', iniciarCadastroRegistro, { once: true });

async function iniciarCadastroRegistro() {
    const tipo = document.getElementById('tipo-registro');
    const main = tipo.closest('main');
    const paineis = {
        medicamento: document.getElementById('cadastro-medicamento'),
        vacina: document.getElementById('cadastro-vacina')
    };
    const seletorAtivo = () =>
        main.querySelector('[id^="cadastro-"]:not([hidden]) select');

    function mostrarCadastro(valor) {
        const url = new URL(location.href);
        url.searchParams.set('tipo', valor);
        history.replaceState(null, '', url.pathname + url.search + url.hash);

        for (const [nome, painel] of Object.entries(paineis)) {
            const ativo = nome === valor;
            painel.hidden = !ativo;
            painel.inert = !ativo;
            document.getElementById(`estilo-${nome}`).media = ativo ? 'all' : 'not all';
        }

        main.className = valor === 'vacina'
            ? 'adicionar-vacina'
            : 'adicionar-medicacao';
    }

    tipo.value = tipoInicial;
    mostrarCadastro(tipoInicial);

    // Cada módulo inicializa o seletor e o envio do próprio formulário.
    await Promise.all([
        import('/modules/pets/js/medicacoes.js'),
        import('/modules/pets/js/vacinacoes.js')
    ]);

    const seletorInicial = seletorAtivo();
    if (
        todosNaOrigem &&
        [...seletorInicial.options].some(opcao => opcao.value === '__todos__')
    ) {
        seletorInicial.value = '__todos__';
        seletorInicial.dispatchEvent(new Event('change'));
    }

    // Mantém a seleção de pets ao alternar entre os dois tipos de registro.
    tipo.addEventListener('change', () => {
        const seletorAnterior = seletorAtivo();
        const pet = seletorAnterior.value;
        const marcados = new Set(
            [...seletorAnterior.nextElementSibling.querySelectorAll(':checked')]
                .map(input => input.value)
        );

        mostrarCadastro(tipo.value);

        const seletor = seletorAtivo();
        seletor.nextElementSibling.querySelectorAll('input').forEach(input => {
            input.checked = marcados.has(input.value);
        });
        seletor.value = pet;
        if (seletor.selectedIndex === -1) seletor.value = '';
        if (!seletor.disabled) seletor.dispatchEvent(new Event('change'));
    });

    tipo.disabled = false;
}
