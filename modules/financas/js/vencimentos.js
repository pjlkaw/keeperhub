// Inicializa a página vencimentos.html do módulo Finanças.
// Lista transações com vencimento pendente e permite marcar como paga.

import {
    obterTransacoes,
    marcarTransacaoComoPaga,
    formatarMoeda,
    formatarData
} from './armazenamento.js';

function criarItemVencimento(transacao) {
    const item = document.createElement('article');
    const detalhes = document.createElement('section');
    const icone = document.createElement('span');
    const titulo = document.createElement('strong');
    const subtitulo = document.createElement('small');

    item.className = 'transaction-item';
    icone.className = 'transaction-icon';
    icone.textContent = '⏰';
    titulo.textContent = transacao.descricao;
    subtitulo.textContent = `Vencimento: ${formatarData(transacao.vencimento)} · ${transacao.categoria || ''}`;
    detalhes.append(titulo, subtitulo);

    const valor = document.createElement('b');
    valor.className = 'expense';
    valor.textContent = `- ${formatarMoeda(transacao.valor)}`;

    const acoes = document.createElement('aside');
    const botaoPagar = document.createElement('button');
    botaoPagar.className = 'payment-button';
    botaoPagar.dataset.id = transacao.id;
    botaoPagar.type = 'button';
    botaoPagar.textContent = 'Marcar como pago';
    acoes.append(valor, botaoPagar);
    item.append(icone, detalhes, acoes);

    botaoPagar.onclick = () => {
        const pago = marcarTransacaoComoPaga(transacao.id);
        if (pago) {
            botaoPagar.textContent = 'Pago';
            botaoPagar.disabled = true;
            item.classList.add('is-paid');
        }
    };

    return item;
}

export function inicializarVencimentos() {
    const lista = document.querySelector('#due-list');
    if (!lista) return;

    const transacoes = obterTransacoes();
    const pendentes = transacoes.filter((t) => t.vencimento && t.status !== 'pago');

    lista.replaceChildren();
    if (!pendentes.length) {
        const vazio = document.createElement('p');
        vazio.className = 'empty-state';
        vazio.textContent = 'Nenhum vencimento pendente.';
        lista.append(vazio);
        return;
    }
    pendentes.forEach((t) => lista.append(criarItemVencimento(t)));
}
