import { consultarApi, formatarMoeda, mostrarErro } from './dados.js';

export async function inicializarRelatorios() {
    if (!document.getElementById('report-balance')) return;
    try {
        const resumo = await consultarApi('/relatorios/resumo');
        const receitas = Number(resumo.receitas);
        const margem = receitas ? Math.max(0, Math.round(Number(resumo.saldo) / receitas * 100)) : 0;
        for (const [id, valor] of Object.entries({
            'report-income': resumo.receitas, 'report-expense': resumo.despesas, 'report-balance': resumo.saldo
        })) document.getElementById(id).textContent = formatarMoeda(valor);
        document.getElementById('report-margin').textContent = margem + '%';
    } catch (erro) {
        mostrarErro(erro);
    }
}
