// Inicializa a página nova-transacao.html do módulo Finanças.
// Gerencia seleção de tipo, preenchimento de preview e submissão offline.

import {
    obterContas,
    salvarTransacao,
    formatarMoeda,
    formatarData,
    converterMoeda
} from './armazenamento.js';

function populaContas() {
    const selectConta = document.querySelector('#account');
    if (!selectConta) return;
    const contas = obterContas();
    selectConta.replaceChildren(new Option('Selecione uma conta', '', true, true));
    contas.forEach((c) => selectConta.add(new Option(c.nome, c.id)));
}

function vincularTipoTransacao() {
    const opcoesTipo = document.querySelectorAll('.type-option');
    opcoesTipo.forEach((opcao) => {
        opcao.addEventListener('click', () => {
            opcoesTipo.forEach((item) => {
                item.classList.remove('selected');
                item.setAttribute('aria-pressed', 'false');
            });
            opcao.classList.add('selected');
            opcao.setAttribute('aria-pressed', 'true');
            const sumType = document.querySelector('#summary-type');
            if (sumType) sumType.textContent = opcao.dataset.transactionType === 'income' ? 'Receita' : 'Despesa';
        });
    });
}

function vincularPreviewResumo() {
    const form = document.querySelector('#transaction-form');
    if (!form) return;

    const atualizar = () => {
        const sumVal = document.querySelector('#summary-value');
        const sumCat = document.querySelector('#summary-category');
        const sumDate = document.querySelector('#summary-date');
        const sumAccount = document.querySelector('#summary-account');

        const valor = converterMoeda(form.elements.value?.value);
        if (sumVal) sumVal.textContent = formatarMoeda(valor);
        if (sumCat) sumCat.textContent = form.elements.category?.value || '—';
        if (sumDate && form.elements.date?.value) sumDate.textContent = formatarData(form.elements.date.value);
        if (sumAccount) {
            const opt = form.elements.account;
            sumAccount.textContent = opt?.options[opt.selectedIndex]?.text || '—';
        }
    };

    ['input', 'change'].forEach((ev) => form.addEventListener(ev, atualizar));
    atualizar();
}

function vincularCampoValor() {
    const campoValor = document.querySelector('#value');
    if (!campoValor) return;
    const limpar = () => { if (campoValor.value === '0,00') campoValor.value = ''; };
    const restaurar = () => { if (!campoValor.value.trim()) campoValor.value = '0,00'; };
    campoValor.addEventListener('focus', limpar);
    campoValor.addEventListener('blur', restaurar);
    window.addEventListener('load', () => setTimeout(() => { campoValor.focus(); limpar(); }, 0));
}

function vincularFormulario() {
    const form = document.querySelector('#transaction-form');
    if (!form) return;

    document.querySelector('.cancel-button')?.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const dados = new FormData(form);
        const tipoSelecionado = document.querySelector('.type-option.selected');
        const valor = converterMoeda(dados.get('value'));
        const contaId = Number(dados.get('account'));

        if (!Number.isFinite(valor) || valor <= 0) {
            alert('Informe um valor maior que zero.');
            return;
        }
        if (!Number.isInteger(contaId) || contaId <= 0) {
            alert('Selecione uma conta cadastrada antes de salvar.');
            return;
        }

        const contas = obterContas();
        const conta = contas.find((c) => c.id === contaId);

        salvarTransacao({
            tipo: tipoSelecionado?.dataset.transactionType === 'income' ? 'receita' : 'despesa',
            valor,
            descricao: dados.get('description'),
            categoria: dados.get('category'),
            conta_id: contaId,
            conta_nome: conta?.nome || '',
            data: dados.get('date'),
            vencimento: dados.get('dueDate') || null,
            status: dados.get('status') || 'pendente'
        });

        alert('Transação salva com sucesso!');
        window.location.href = 'transacoes.html';
    });
}

export function inicializarNovaTransacao() {
    populaContas();
    vincularTipoTransacao();
    vincularPreviewResumo();
    vincularCampoValor();
    vincularFormulario();
}
