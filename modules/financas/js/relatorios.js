import { formatarMoeda, obterTransacoes } from './dados.js';

export function inicializarRelatorios() {
    if (!document.getElementById('report-balance')) return;

    const transacoes = obterTransacoes();
    const receitas = transacoes
        .filter((transacao) => transacao.tipo === 'receita')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
    const despesas = transacoes
        .filter((transacao) => transacao.tipo === 'despesa')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
    const saldo = receitas - despesas;
    const margem = receitas ? Math.max(0, Math.round(saldo / receitas * 100)) : 0;

    for (const [id, valor] of Object.entries({
        'report-income': receitas,
        'report-expense': despesas,
        'report-balance': saldo
    })) {
        document.getElementById(id).textContent = formatarMoeda(valor);
    }
    document.getElementById('report-margin').textContent = margem + '%';
}
