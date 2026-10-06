import { formatarMoeda, formatarData, obterTransacoes, salvarTransacoes } from './dados.js';

function criarTransacao(transacao) {
    const item = document.createElement('article');
    const detalhes = document.createElement('section');
    const valor = document.createElement('b');
    const icone = document.createElement('span');
    const titulo = document.createElement('strong');
    const descricao = document.createElement('small');
    const despesa = transacao.tipo === 'despesa';
    item.className = 'transaction-item';
    icone.className = 'transaction-icon';
    icone.setAttribute('aria-hidden', 'true');
    const simbolo = document.createElement('span');
    simbolo.className = despesa ? 'fa-solid fa-receipt' : 'fa-solid fa-arrow-trend-up';
    icone.append(simbolo);
    titulo.textContent = transacao.descricao;
    detalhes.setAttribute('aria-label', transacao.descricao);
    descricao.textContent = [transacao.categoria, transacao.conta_nome,
        transacao.vencimento && 'Vencimento: ' + formatarData(transacao.vencimento)].filter(Boolean).join(' · ');
    detalhes.append(titulo, descricao);
    valor.className = despesa ? 'expense' : '';
    valor.textContent = (despesa ? '- ' : '+ ') + formatarMoeda(transacao.valor);
    item.append(icone, detalhes, valor);
    if (transacao.status !== 'pago') {
        const acoes = document.createElement('aside');
        const pagamento = document.createElement('button');
        pagamento.className = 'payment-button';
        pagamento.dataset.id = transacao.id;
        pagamento.type = 'button';
        pagamento.textContent = 'Marcar como pago';
        acoes.append(valor, pagamento);
        item.append(acoes);
    }
    return item;
}

function renderizarTransacoes(transacoes, lista, agrupar) {
    lista.replaceChildren();
    if (!transacoes.length) {
        lista.textContent = agrupar ? 'Nenhuma transação cadastrada.' : 'Nenhum vencimento pendente.';
        return;
    }
    if (!agrupar) return lista.append(...transacoes.map(criarTransacao));
    const grupos = new Map();
    transacoes.forEach((transacao) => {
        const data = formatarData(transacao.data) || 'Sem data';
        if (!grupos.has(data)) grupos.set(data, []);
        grupos.get(data).push(transacao);
    });
    grupos.forEach((itens, data) => {
        const grupo = document.createElement('section');
        const titulo = document.createElement('h2');
        grupo.className = 'transaction-group';
        titulo.textContent = data;
        grupo.append(titulo, ...itens.map(criarTransacao));
        lista.append(grupo);
    });
}

function inicializarPopup() {
    const popup = document.querySelector('.filter-popup');
    const botao = document.querySelector('.filter-actions');
    if (!popup || !botao) return;
    const alternar = (aberto) => {
        popup.hidden = !aberto;
        botao.setAttribute('aria-expanded', String(aberto));
    };
    botao.addEventListener('click', () => alternar(popup.hidden));
    popup.addEventListener('click', (evento) => {
        const opcao = evento.target.closest('[data-popup-filter]');
        if (!opcao) return;
        document.querySelector('[data-filter="' + opcao.dataset.popupFilter + '"]')?.click();
        alternar(false);
        botao.focus();
    });
    document.addEventListener('click', (evento) => {
        if (!popup.contains(evento.target) && !botao.contains(evento.target)) alternar(false);
    });
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && !popup.hidden) {
            alternar(false);
            botao.focus();
        }
    });
}

export function inicializarTransacoes() {
    const lista = document.querySelector('#transaction-list, #due-list');
    if (!lista) return;
    const agrupar = lista.id === 'transaction-list';
    const busca = document.querySelector('.transactions-search input');
    const filtros = document.querySelectorAll('[data-filter]');
    let transacoes = [];
    let carregadas = true;
    let filtro = document.querySelector('.filter-active')?.dataset.filter || 'all';
    const atualizar = () => {
        if (!carregadas) return;
        const termo = busca?.value.trim().toLowerCase() || '';
        const hoje = new Date();
        const filtradas = transacoes.filter((transacao) => {
            if (!agrupar) return transacao.vencimento && transacao.status !== 'pago';
            const texto = [transacao.descricao, transacao.categoria, transacao.conta_nome].join(' ').toLowerCase();
            const data = new Date(transacao.data);
            const tipoValido = filtro === 'receitas' ? transacao.tipo === 'receita' : filtro === 'despesas' ? transacao.tipo === 'despesa' : true;
            const mesValido = filtro !== 'este-mes' || (data.getUTCMonth() === hoje.getMonth() && data.getUTCFullYear() === hoje.getFullYear());
            return texto.includes(termo) && tipoValido && mesValido;
        });
        renderizarTransacoes(filtradas, lista, agrupar);
    };
    filtros.forEach((botao) => botao.addEventListener('click', () => {
        filtro = botao.dataset.filter;
        filtros.forEach((item) => {
            const ativo = item === botao;
            item.classList.toggle('filter-active', ativo);
            item.setAttribute('aria-pressed', String(ativo));
        });
        atualizar();
    }));
    busca?.addEventListener('input', atualizar);
    busca?.form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        atualizar();
        busca.focus();
    });
    inicializarPopup();
    lista.addEventListener('click', (evento) => {
        const botao = evento.target.closest('.payment-button');
        if (!botao || botao.disabled) return;
        botao.disabled = true;
        const transacao = transacoes.find((item) => String(item.id) === botao.dataset.id);
        if (transacao) transacao.status = 'pago';
        salvarTransacoes(transacoes);
        botao.textContent = 'Pago';
        botao.closest('.transaction-item').classList.add('is-paid');
    });
    transacoes = obterTransacoes();
    atualizar();
}
