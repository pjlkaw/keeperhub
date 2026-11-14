import { listarContasApi, listarTransacoesApi } from './api.js';

export const obterContas = listarContasApi;
export const obterTransacoes = listarTransacoesApi;

export const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
export const lerMoeda = (valor) => Number(String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
