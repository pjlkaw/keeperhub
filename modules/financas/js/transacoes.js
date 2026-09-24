// Inicializa a página transacoes.html do módulo Finanças.
// Lista, filtra e busca transações do localStorage, e permite marcar como paga.

import {
    obterTransacoes,
    marcarTransacaoComoPaga,
    formatarMoeda,
    formatarData
} from './armazenamento.js';

function criarItemTransacao(transacao) {
    const item = document.createElement('article');
    const detalhes = document.createElement('section');
    const icone = document.createElement('span');
    const titulo = document.createElement('strong');
    const subtitulo = document.createElement('small');
    const meta = [transacao.categoria, transacao.conta_nome, transacao.vencimento && `Vencimento: ${formatarData(transacao.vencimento)}`]
        .filter(Boolean).join(' · ');

    item.className = 'transaction-item';
    icone.className = 'transaction-icon';
    icone.textContent = transacao.tipo === 'receita' ? '↗' : '▣';
    titulo.textContent = transacao.descricao;
    subtitulo.textContent = meta;
    detalhes.append(titulo, subtitulo);

    const valor = document.createElement('b');
    valor.className = transacao.tipo === 'despesa' ? 'expense' : '';
    valor.textContent = `${transacao.tipo === 'despesa' ? '- ' : '+ '}${formatarMoeda(transacao.valor)}`;

    if (transacao.status !== 'pago') {
        const acoes = document.createElement('aside');
        const botaoPagar = document.createElement('button');
        botaoPagar.className = 'payment-button';
        botaoPagar.dataset.id = transacao.id;
        botaoPagar.type = 'button';
        botaoPagar.textContent = 'Marcar como pago';
        acoes.append(valor, botaoPagar);
        item.append(icone, detalhes, acoes);
    } else {
        item.append(icone, detalhes, valor);
    }

    return item;
}

function renderizarGrupos(transacoes, lista) {
    lista.replaceChildren();
    if (!transacoes.length) {
        const vazio = document.createElement('p');
        vazio.className = 'empty-state';
        vazio.textContent = 'Nenhuma transação encontrada.';
        lista.append(vazio);
        return;
    }
    const grupos = new Map();
    transacoes.forEach((t) => {
        const data = formatarData(t.data) || 'Sem data';
        if (!grupos.has(data)) grupos.set(data, []);
        grupos.get(data).push(t);
    });
    grupos.forEach((itens, data) => {
        const grupo = document.createElement('section');
        const titulo = document.createElement('h2');
        grupo.className = 'transaction-group';
        titulo.textContent = data;
        grupo.append(titulo, ...itens.map(criarItemTransacao));
        lista.append(grupo);
    });
    vincularBotoesPagamento();
}

function vincularBotoesPagamento() {
    document.querySelectorAll('.payment-button').forEach((botao) => {
        botao.onclick = () => {
            const id = botao.dataset.id;
            const pago = marcarTransacaoComoPaga(id);
            if (pago) {
                botao.textContent = 'Pago';
                botao.disabled = true;
                botao.closest('.transaction-item')?.classList.add('is-paid');
            }
        };
    });
}

function vincularFiltros(transacoes, lista) {
    const campoBusca = document.querySelector('.transactions-search input');
    const botoesFiltro = document.querySelectorAll('.filter-chips button');
    if (!campoBusca && !botoesFiltro.length) return;

    let filtroAtual = 'all';

    const aplicarFiltros = () => {
        const termo = campoBusca?.value.trim().toLowerCase() || '';
        const mesAtual = new Date().getMonth();
        const anoAtual = new Date().getFullYear();
        const filtrados = transacoes.filter((t) => {
            const haystack = [t.descricao, t.categoria, t.conta_nome].filter(Boolean).join(' ').toLowerCase();
            const dataT = t.data ? new Date(t.data) : null;
            const buscaOk = !termo || haystack.includes(termo);
            const tipoOk = filtroAtual === 'receitas' ? t.tipo === 'receita'
                : filtroAtual === 'despesas' ? t.tipo === 'despesa' : true;
            const mesOk = filtroAtual === 'este-mes'
                ? dataT && dataT.getUTCMonth() === mesAtual && dataT.getUTCFullYear() === anoAtual
                : true;
            return buscaOk && tipoOk && mesOk;
        });
        renderizarGrupos(filtrados, lista);
    };

    campoBusca?.addEventListener('input', aplicarFiltros);
    botoesFiltro.forEach((botao) => {
        botao.addEventListener('click', (e) => {
            e.preventDefault();
            botoesFiltro.forEach((b) => b.classList.remove('filter-active'));
            botao.classList.add('filter-active');
            filtroAtual = botao.dataset.filter || 'all';
            aplicarFiltros();
        });
    });

    // Aplica filtro inicial conforme botão ativo
    const ativo = Array.from(botoesFiltro).find((b) => b.classList.contains('filter-active'));
    if (ativo) {
        filtroAtual = ativo.dataset.filter || 'all';
        aplicarFiltros();
    }
}

function vincularPopupFiltro() {
    const popup = document.querySelector('.filter-popup');
    const trigger = document.querySelector('.filter-actions');
    if (!trigger || !popup) return;

    const fechar = () => {
        popup.setAttribute('hidden', '');
        popup.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
    };
    const abrir = () => {
        popup.removeAttribute('hidden');
        popup.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.hasAttribute('hidden') ? abrir() : fechar();
    });

    popup.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-popup-filter]');
        if (!btn) return;
        const alvo = document.querySelector(`.filter-chips button[data-filter="${btn.dataset.popupFilter}"]`)
            || document.querySelector('.filter-chips button');
        if (alvo) alvo.click();
        fechar();
    });

    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && !trigger.contains(e.target)) fechar();
    });
}

export function inicializarTransacoes() {
    const lista = document.querySelector('#transaction-list');
    if (!lista) return;

    const transacoes = obterTransacoes();
    renderizarGrupos(transacoes, lista);
    vincularFiltros(transacoes, lista);
    vincularPopupFiltro();
}
