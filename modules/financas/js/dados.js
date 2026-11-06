import { apiDisponivel, listarTransacoesApi } from './api.js';

const CHAVE_CONTAS = 'keeperhub-financas-contas';
const CHAVE_TRANSACOES = 'keeperhub-financas-transacoes';

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
    }
}

export const obterContas = () => lerLista(CHAVE_CONTAS, []);
export const salvarContas = (contas) => salvarLista(CHAVE_CONTAS, contas);
export async function obterTransacoes() {
    if (apiDisponivel()) {
        try {
            const transacoes = await listarTransacoesApi();
            salvarLista(CHAVE_TRANSACOES, transacoes);
            return transacoes;
        } catch (erro) {
            console.warn('API de transações indisponível; usando armazenamento local.', erro.message);
        }
    }
    return lerLista(CHAVE_TRANSACOES, []);
}
export const salvarTransacoes = (transacoes) => salvarLista(CHAVE_TRANSACOES, transacoes);
export const proximoId = (itens) => Math.max(0, ...itens.map((item) => Number(item.id) || 0)) + 1;

export const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
export const lerMoeda = (valor) => Number(String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
