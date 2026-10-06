const CHAVE_CONTAS = 'keeperhub-financas-contas';
const CHAVE_TRANSACOES = 'keeperhub-financas-transacoes';

const contasIniciais = [
    { id: 1, nome: 'Conta principal', tipo: 'Conta corrente' },
    { id: 2, nome: 'Poupança', tipo: 'Poupança' },
    { id: 3, nome: 'Carteira', tipo: 'Carteira' }
];

function copiar(valor) {
    return JSON.parse(JSON.stringify(valor));
}

function lerLista(chave, padrao) {
    try {
        const valor = JSON.parse(localStorage.getItem(chave));
        return Array.isArray(valor) ? valor : copiar(padrao);
    } catch {
        return copiar(padrao);
    }
}

function salvarLista(chave, itens) {
    try {
        localStorage.setItem(chave, JSON.stringify(itens));
    } catch {
        // O módulo continua funcional durante a sessão caso o armazenamento não esteja disponível.
    }
}

export const obterContas = () => lerLista(CHAVE_CONTAS, contasIniciais);
export const salvarContas = (contas) => salvarLista(CHAVE_CONTAS, contas);
export const obterTransacoes = () => lerLista(CHAVE_TRANSACOES, []);
export const salvarTransacoes = (transacoes) => salvarLista(CHAVE_TRANSACOES, transacoes);
export const proximoId = (itens) => Math.max(0, ...itens.map((item) => Number(item.id) || 0)) + 1;

export const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
export const lerMoeda = (valor) => Number(String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
