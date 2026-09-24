// Inicializa a página principal (index.html) do módulo Finanças.
// Renderiza saldo, fluxo do mês, despesas mensais, categorias e transações recentes
// usando dados do localStorage via armazenamento.js.

import {
    obterTransacoes,
    obterDados,
    calcularResumoFinanceiro,
    formatarMoeda,
    formatarData
} from './armazenamento.js';

function renderizarSaldo(resumo) {
    const el = document.querySelector('.preview-balance output');
    if (el) el.textContent = formatarMoeda(resumo.saldo);

    const dl = document.querySelector('.preview-balance dl');
    if (dl) {
        const dds = dl.querySelectorAll('dd');
        if (dds[0]) dds[0].textContent = formatarMoeda(resumo.receitas);
        if (dds[1]) dds[1].textContent = formatarMoeda(resumo.despesas);
    }
}

function renderizarFluxo(resumo) {
    const flowRows = document.querySelectorAll('.flow-row strong');
    if (flowRows[0]) flowRows[0].textContent = formatarMoeda(resumo.receitas);
    if (flowRows[1]) flowRows[1].textContent = formatarMoeda(resumo.despesas);

    const incomeBar = document.querySelector('.income-bar');
    const expenseBar = document.querySelector('.expense-bar');
    const total = resumo.receitas + resumo.despesas;
    if (incomeBar && total > 0) {
        const pct = Math.round((resumo.receitas / total) * 100);
        incomeBar.style.width = `${pct}%`;
    }
    if (expenseBar && total > 0) {
        const pct = Math.round((resumo.despesas / total) * 100);
        expenseBar.style.width = `${pct}%`;
    }
}

function renderizarGraficoMensal(transacoes) {
    const chartDivs = document.querySelectorAll('.monthly-expenses-chart > div');
    if (!chartDivs.length) return;

    const hoje = new Date();
    const meses = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - 3 + i, 1));
        return {
            chave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
            total: 0
        };
    });

    transacoes.forEach((t) => {
        if (t.tipo !== 'despesa' || !t.data) return;
        const [ano, mes] = t.data.split('-');
        const chave = `${ano}-${mes}`;
        const mes_ = meses.find((m) => m.chave === chave);
        if (mes_) mes_.total += Number(t.valor || 0);
    });

    const maxVal = Math.max(...meses.map((m) => m.total), 1);
    const maxHeight = 48;

    chartDivs.forEach((div, i) => {
        const mes = meses[i];
        if (!mes) return;
        const bar = div.querySelector('i');
        const label = div.querySelector('span');
        const value = div.querySelector('b');
        if (bar) bar.style.height = `${Math.max(6, (mes.total / maxVal) * maxHeight)}px`;
        if (label) label.textContent = mes.label;
        if (value) value.textContent = Math.round(mes.total / 1000 * 10) / 10 + 'k';
    });
}

function renderizarCategorias(transacoes) {
    const lista = document.querySelector('.top-spending-list');
    if (!lista) return;

    const despesas = transacoes.filter((t) => t.tipo === 'despesa');
    const totalGasto = despesas.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const porCategoria = {};
    despesas.forEach((t) => {
        const cat = t.categoria || 'Outros';
        porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.valor || 0);
    });

    const top3 = Object.entries(porCategoria)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const cores = ['var(--tool-financas)', '#5985fc', '#9b72f2'];
    lista.querySelectorAll('div').forEach((div, i) => {
        const [cat, val] = top3[i] || ['—', 0];
        const pct = totalGasto > 0 ? Math.round((val / totalGasto) * 100) : 0;
        const b = div.querySelector('b');
        const strong = div.querySelector('strong');
        const small = div.querySelector('small');
        if (b) b.textContent = cat;
        if (strong) strong.firstChild.textContent = `${formatarMoeda(val)} `;
        if (small) small.textContent = `${pct}%`;
        div.style.setProperty('--spending-color', cores[i] || cores[2]);
        div.style.setProperty('--spending-width', `${Math.max(8, pct + 4)}%`);
    });
}

function renderizarTransacoesRecentes(transacoes) {
    const lista = document.querySelector('.recent-transactions-list');
    if (!lista) return;

    const recentes = transacoes.slice(0, 3);
    lista.querySelectorAll('a').forEach((link, i) => {
        const t = recentes[i];
        if (!t) return;
        const b = link.querySelector('b');
        const small1 = link.querySelector('span small');
        const strong = link.querySelector('strong');
        const small2 = link.querySelector('strong small');
        if (b) b.textContent = t.descricao;
        if (small1) small1.textContent = `${t.categoria || ''} · ${formatarData(t.data) || t.hora || ''}`;
        if (strong) strong.firstChild.textContent = `${t.tipo === 'despesa' ? '- ' : '+ '}${formatarMoeda(t.valor)}`;
        if (small2) small2.textContent = t.hora || formatarData(t.data) || '';
        link.classList.toggle('income', t.tipo === 'receita');
    });
}

export function inicializarResumo() {
    const transacoes = obterTransacoes();
    const resumo = calcularResumoFinanceiro();
    renderizarSaldo(resumo);
    renderizarFluxo(resumo);
    renderizarGraficoMensal(transacoes);
    renderizarCategorias(transacoes);
    renderizarTransacoesRecentes(transacoes);
}
