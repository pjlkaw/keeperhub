const API_URL = '/api';

export async function consultarApi(caminho, opcoes = {}) {
    try {
        const resposta = await fetch(API_URL + caminho, {
            ...opcoes,
            headers: { 'Content-Type': 'application/json', ...opcoes.headers }
        });
        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.error || 'Não foi possível comunicar com a API.');
        }
        return resposta.status === 204 ? null : await resposta.json();
    } catch (erro) {
        throw new Error(erro.message || 'Não foi possível comunicar com a API.', { cause: erro });
    }
}

export const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
export const lerMoeda = (valor) => Number(String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));

export function mostrarErro(erro, destino) {
    if (!destino) return window.alert(erro.message);
    const mensagem = document.createElement('p');
    mensagem.className = 'empty-state';
    mensagem.setAttribute('role', 'alert');
    mensagem.textContent = erro.message;
    destino.replaceChildren(mensagem);
}
