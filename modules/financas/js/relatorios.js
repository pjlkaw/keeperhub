// Inicializa a página relatorios.html do módulo Finanças.
// Exibe resumo financeiro calculado a partir dos dados locais.

import {
    obterTransacoes,
    calcularResumoFinanceiro,
    formatarMoeda
} from './armazenamento.js';

function renderizarResumo(resumo) {
    const elReceitas = document.querySelector('#report-income');
    const elDespesas = document.querySelector('#report-expense');
    const elSaldo = document.querySelector('#report-balance');
    const elMargem = document.querySelector('#report-margin');

    if (elReceitas) elReceitas.textContent = formatarMoeda(resumo.receitas);
    if (elDespesas) elDespesas.textContent = formatarMoeda(resumo.despesas);
    if (elSaldo) elSaldo.textContent = formatarMoeda(resumo.saldo);
    if (elMargem) elMargem.textContent = `${resumo.margem}%`;
}

function renderizarGraficoEvolucao(transacoes) {
    const mesesEl = document.querySelectorAll('.report-month');
    if (!mesesEl.length) return;

    const hoje = new Date();
    const meses = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - 3 + i, 1));
        return {
            chave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
            receitas: 0,
            despesas: 0
        };
    });

    transacoes.forEach((t) => {
        if (!t.data) return;
        const [ano, mes] = t.data.split('-');
        const m = meses.find((m) => m.chave === `${ano}-${mes}`);
        if (!m) return;
        const val = Number(t.valor || 0);
        if (t.tipo === 'receita') m.receitas += val;
        else if (t.tipo === 'despesa') m.despesas += val;
    });

    const maxVal = Math.max(...meses.flatMap((m) => [m.receitas, m.despesas]), 1);
    const maxH = 108;

    mesesEl.forEach((el, i) => {
        const m = meses[i];
        if (!m) return;
        const incomeBar = el.querySelector('.income-bar');
        const expenseBar = el.querySelector('.expense-bar');
        const span = el.querySelector('span');
        const bIncome = el.querySelector('.income-bar b');
        const bExpense = el.querySelector('.expense-bar b');

        if (incomeBar) incomeBar.style.height = `${Math.max(4, (m.receitas / maxVal) * maxH)}px`;
        if (expenseBar) expenseBar.style.height = `${Math.max(4, (m.despesas / maxVal) * maxH)}px`;
        if (bIncome) bIncome.textContent = `${(m.receitas / 1000).toFixed(1)}k`;
        if (bExpense) bExpense.textContent = `${(m.despesas / 1000).toFixed(1)}k`;
        if (span) span.textContent = m.label;
    });
}

function renderizarCategoriasGasto(transacoes) {
    const lista = document.querySelector('.spending-list');
    if (!lista) return;

    const despesas = transacoes.filter((t) => t.tipo === 'despesa');
    const totalGasto = despesas.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const porCategoria = {};
    despesas.forEach((t) => {
        const cat = t.categoria || 'Outros';
        porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor || 0);
    });

    const ordenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
    const cores = ['var(--tool-financas)', '#5985fc', 'var(--tool-financas)', '#8c63e8', '#9da5b3'];

    lista.querySelectorAll('div').forEach((div, i) => {
        const [cat, val] = ordenadas[i] || ['Outros', 0];
        const pct = totalGasto > 0 ? Math.round((val / totalGasto) * 100) : 0;
        const b = div.querySelector('b');
        const spanVal = div.querySelector('span');
        if (b) b.textContent = `● ${cat}`;
        if (spanVal) {
            const strong = spanVal.querySelector('strong');
            spanVal.firstChild.textContent = `${formatarMoeda(val).replace('R$\u00a0', 'R$ ')}   `;
            if (strong) strong.textContent = `${pct}%`;
        }
        div.style.setProperty('--category-color', cores[i] || cores[4]);
        div.style.setProperty('--category-width', `${Math.max(8, pct)}%`);
    });
}

export function inicializarRelatorios() {
    const transacoes = obterTransacoes();
    const resumo = calcularResumoFinanceiro();
    renderizarResumo(resumo);
    renderizarGraficoEvolucao(transacoes);
    renderizarCategoriasGasto(transacoes);
}
