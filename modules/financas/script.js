// Inicializador do módulo Finanças.
// Integração oficial com serviços compartilhados do KeeperHub (shared/)

// Integração com o serviço de alerta compartilhado
let alertShared;
try {
    const sharedInterface = await import('../../shared/services/interface.js');
    alertShared = sharedInterface.alertShared;
} catch (e) {
    // Fallback dinâmico se executado em escopo restrito
}

export function showFeedback(message) {
    if (typeof alertShared === 'function') {
        alertShared(message);
        return;
    }
    const alertEl = document.getElementById('alertFromShared');
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.style.transition = 'top 0.35s ease, opacity 0.35s ease';
        alertEl.style.opacity = '1';
        alertEl.style.top = '20px';
        clearTimeout(alertEl._closeTimer);
        alertEl._closeTimer = setTimeout(() => {
            alertEl.style.top = '-100px';
            alertEl.style.opacity = '0';
        }, 2400);
    } else {
        console.log('[KeeperHub Finanças]', message);
    }
}

const API_URL = '/api';

// Dados padrão persistentes para garantir experiência instantânea e offline
const STORAGE_KEY_TX = 'keeperhub_financas_transacoes';
const STORAGE_KEY_ACC = 'keeperhub_financas_contas';

const INITIAL_TRANSACTIONS = [
    { id: 1, descricao: 'Supermercado', valor: 150.45, tipo: 'despesa', categoria: 'Alimentação', conta_id: 1, conta_nome: 'Conta principal', data: new Date().toISOString(), status: 'pago' },
    { id: 2, descricao: 'Uber', valor: 24.90, tipo: 'despesa', categoria: 'Transporte', conta_id: 1, conta_nome: 'Conta principal', data: new Date().toISOString(), status: 'pago' },
    { id: 3, descricao: 'Salário', valor: 5430.00, tipo: 'receita', categoria: 'Renda', conta_id: 1, conta_nome: 'Conta principal', data: new Date(Date.now() - 86400000).toISOString(), status: 'pago' },
    { id: 4, descricao: 'Aluguel & Condomínio', valor: 1200.00, tipo: 'despesa', categoria: 'Moradia', conta_id: 1, conta_nome: 'Conta principal', data: new Date(Date.now() - 172800000).toISOString(), vencimento: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'pendente' },
    { id: 5, descricao: 'Internet Fibra', valor: 129.90, tipo: 'despesa', categoria: 'Assinaturas', conta_id: 1, conta_nome: 'Conta principal', data: new Date(Date.now() - 259200000).toISOString(), vencimento: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'pendente' }
];

const INITIAL_ACCOUNTS = [
    { id: 1, nome: 'Conta principal', tipo: 'Conta corrente' },
    { id: 2, nome: 'Reserva de emergência', tipo: 'Poupança' },
    { id: 3, nome: 'Carteira física', tipo: 'Carteira' }
];

function getStoredTransactions() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_TX);
        if (data) return JSON.parse(data);
    } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(INITIAL_TRANSACTIONS)); } catch (e) {}
    return INITIAL_TRANSACTIONS;
}

function saveStoredTransactions(txs) {
    try { localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(txs)); } catch (e) {}
}

function getStoredAccounts() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_ACC);
        if (data) return JSON.parse(data);
    } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY_ACC, JSON.stringify(INITIAL_ACCOUNTS)); } catch (e) {}
    return INITIAL_ACCOUNTS;
}

function saveStoredAccounts(accs) {
    try { localStorage.setItem(STORAGE_KEY_ACC, JSON.stringify(accs)); } catch (e) {}
}

async function requestApi(path, options = {}) {
    try {
        const response = await fetch(`${API_URL}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });

        if (response.ok) {
            return response.status === 204 ? null : response.json();
        }
    } catch (err) {
        // Fallback local se backend não estiver respondendo
    }

    // Camada de persistência local / offline
    const method = options.method || 'GET';
    const txs = getStoredTransactions();
    const accs = getStoredAccounts();

    if (path.startsWith('/relatorios/resumo')) {
        const income = txs.filter((t) => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor || 0), 0);
        const expense = txs.filter((t) => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor || 0), 0);
        return { receitas: income, despesas: expense, saldo: income - expense };
    }

    if (path === '/transacoes' && method === 'GET') {
        return txs;
    }

    if (path === '/transacoes' && method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        const acc = accs.find((a) => a.id === Number(body.conta_id));
        const newTx = {
            id: Date.now(),
            descricao: body.descricao || 'Sem descrição',
            valor: Number(body.valor || 0),
            tipo: body.tipo || 'despesa',
            categoria: body.categoria || 'Geral',
            conta_id: body.conta_id,
            conta_nome: acc ? acc.nome : 'Conta principal',
            data: body.data || new Date().toISOString(),
            vencimento: body.vencimento || null,
            status: body.status || 'pendente'
        };
        txs.unshift(newTx);
        saveStoredTransactions(txs);
        return newTx;
    }

    if (path.match(/\/transacoes\/\d+\/pagamento/) && method === 'PATCH') {
        const id = Number(path.split('/')[2]);
        const target = txs.find((t) => t.id === id);
        if (target) {
            target.status = 'pago';
            saveStoredTransactions(txs);
        }
        return target;
    }

    if (path === '/contas' && method === 'GET') {
        return accs;
    }

    if (path === '/contas' && method === 'POST') {
        const body = JSON.parse(options.body || '{}');
        const newAcc = { id: Date.now(), nome: body.nome || 'Nova conta', tipo: body.tipo || 'Conta corrente' };
        accs.push(newAcc);
        saveStoredAccounts(accs);
        return newAcc;
    }

    if (path.match(/\/contas\/\d+/) && method === 'PUT') {
        const id = Number(path.split('/')[2]);
        const body = JSON.parse(options.body || '{}');
        const target = accs.find((a) => a.id === id);
        if (target) {
            target.nome = body.nome || target.nome;
            target.tipo = body.tipo || target.tipo;
            saveStoredAccounts(accs);
        }
        return target;
    }

    if (path.match(/\/contas\/\d+/) && method === 'DELETE') {
        const id = Number(path.split('/')[2]);
        const updated = accs.filter((a) => a.id !== id);
        saveStoredAccounts(updated);
        return null;
    }

    return null;
}

const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
const parseCurrency = (value) => {
    const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return Number(normalized);
};

async function loadFinancialSummary(query = '') {
    const hasSummaryOutput = document.querySelector('#dashboard-balance, #report-income, #report-expense, #report-balance');
    if (!hasSummaryOutput) return;

    const summary = await requestApi(`/relatorios/resumo${query}`);
    if (!summary) return;
    const income = Number(summary.receitas);
    const expense = Number(summary.despesas);
    const balance = Number(summary.saldo);
    const margin = income ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    document.querySelector('#dashboard-balance')?.replaceChildren(formatCurrency(balance));
    document.querySelector('#dashboard-income')?.replaceChildren(formatCurrency(income));
    document.querySelector('#dashboard-expense')?.replaceChildren(formatCurrency(expense));
    document.querySelector('#dashboard-change')?.replaceChildren('Atualizado');
    document.querySelector('#report-income')?.replaceChildren(formatCurrency(income));
    document.querySelector('#report-expense')?.replaceChildren(formatCurrency(expense));
    document.querySelector('#report-balance')?.replaceChildren(formatCurrency(balance));
    const marginTrack = document.querySelector('.margin-track');
    if (marginTrack) marginTrack.value = margin;
    document.querySelector('#report-margin')?.replaceChildren(`${margin}% de margem`);
}

function createTransactionItem(transaction) {
    const item = document.createElement('article');
    const details = document.createElement('section');
    const amount = document.createElement('b');
    const icon = document.createElement('span');
    const title = document.createElement('strong');
    const subtitle = document.createElement('small');
    const meta = [transaction.categoria, transaction.conta_nome, transaction.vencimento && `Vencimento: ${formatDate(transaction.vencimento)}`].filter(Boolean).join(' · ');

    item.className = 'transaction-item';
    icon.className = 'transaction-icon';
    icon.textContent = transaction.tipo === 'receita' ? '↗' : '▣';
    title.textContent = transaction.descricao;
    subtitle.textContent = meta;
    details.append(title, subtitle);
    amount.className = transaction.tipo === 'despesa' ? 'expense' : '';
    amount.textContent = `${transaction.tipo === 'despesa' ? '- ' : '+ '}${formatCurrency(transaction.valor)}`;
    item.append(icon, details, amount);

    if (transaction.status !== 'pago') {
        const payment = document.createElement('button');
        const actions = document.createElement('aside');
        payment.className = 'payment-button';
        payment.dataset.id = transaction.id;
        payment.type = 'button';
        payment.textContent = 'Marcar como pago';
        actions.append(amount);
        actions.append(payment);
        item.replaceChildren(icon, details, actions);
    }
    return item;
}

function renderTransactionGroups(transactions, list) {
    list.replaceChildren();
    if (!transactions.length) {
        list.textContent = 'Nenhuma transação cadastrada.';
        return;
    }
    const groups = new Map();
    transactions.forEach((transaction) => {
        const date = formatDate(transaction.data) || 'Sem data';
        if (!groups.has(date)) groups.set(date, []);
        groups.get(date).push(transaction);
    });
    groups.forEach((items, date) => {
        const group = document.createElement('section');
        const heading = document.createElement('h2');
        group.className = 'transaction-group';
        heading.textContent = date;
        group.append(heading, ...items.map(createTransactionItem));
        list.append(group);
    });
    bindPaymentButtons();
}

function updateExpenseChart(transactions) {
    const chartItems = document.querySelectorAll('.dashboard-screen .chart-item');
    if (!chartItems.length) return;

    const today = new Date();
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
    const months = Array.from({ length: 4 }, (_item, index) => {
        const date = new Date(Date.UTC(today.getFullYear(), today.getMonth() - 3 + index, 1));
        return {
            key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
            label: monthFormatter.format(date).replace('.', ''),
            total: 0
        };
    });

    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let currentMonthTotal = 0;
    let currentMonthHighest = 0;

    transactions.forEach((transaction) => {
        if (transaction.tipo !== 'despesa' || !transaction.data) return;
        const amount = Number(transaction.valor || 0);
        const date = new Date(transaction.data);
        const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        const month = months.find((item) => item.key === key);
        if (month) month.total += amount;
        if (key === currentMonthKey) {
            currentMonthTotal += amount;
            currentMonthHighest = Math.max(currentMonthHighest, amount);
        }
    });

    const maximumExpense = Math.max(...months.map((month) => month.total), 0);
    const maximumBarHeight = 128;
    chartItems.forEach((item, index) => {
        const month = months[index];
        const bar = item.querySelector('.bar');
        const label = item.querySelector('small');
        if (bar) {
            bar.style.height = maximumExpense ? `${Math.max(8, (month.total / maximumExpense) * maximumBarHeight)}px` : '0';
            bar.title = `${month.label}: ${formatCurrency(month.total)}`;
        }
        if (label) label.textContent = month.label;
    });

    document.querySelector('#monthly-total')?.replaceChildren(formatCurrency(currentMonthTotal));
    document.querySelector('#monthly-highest')?.replaceChildren(formatCurrency(currentMonthHighest));
}

function bindTransactionFilters(transactions, list) {
    const searchInput = document.querySelector('.transactions-search input');
    const filterButtons = document.querySelectorAll('.filter-chips button');
    if (!searchInput && !filterButtons.length) return;

    let currentFilter = 'all';
    const applyFilters = () => {
        const searchTerm = searchInput?.value.trim().toLowerCase() || '';
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const filtered = transactions.filter((transaction) => {
            const haystack = [transaction.descricao, transaction.categoria, transaction.conta_nome].filter(Boolean).join(' ').toLowerCase();
            const transactionDate = transaction.data ? new Date(transaction.data) : null;
            const matchesSearch = !searchTerm || haystack.includes(searchTerm);
            const matchesType = currentFilter === 'receitas' ? transaction.tipo === 'receita' : currentFilter === 'despesas' ? transaction.tipo === 'despesa' : true;
            const matchesMonth = currentFilter === 'este-mes' ? transactionDate && transactionDate.getUTCMonth() === currentMonth && transactionDate.getUTCFullYear() === currentYear : true;
            return matchesSearch && matchesType && matchesMonth;
        });
        renderTransactionGroups(filtered, list);
    };

    searchInput?.addEventListener('input', applyFilters);
    filterButtons.forEach((button) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            filterButtons.forEach((item) => item.classList.remove('filter-active'));
            button.classList.add('filter-active');
            currentFilter = button.dataset.filter || button.textContent.trim().toLowerCase();
            applyFilters();
        });
    });
    // apply initial filter (show current active)
    const active = Array.from(filterButtons).find((b) => b.classList.contains('filter-active'));
    if (active) {
        currentFilter = active.dataset.filter || active.textContent.trim().toLowerCase();
        applyFilters();
    }
}

async function loadTransactions() {
    const list = document.querySelector('#transaction-list');
    const bars = document.querySelectorAll('.dashboard-screen .bar');
    if (!list && !bars.length) return;

    const transactions = await requestApi('/transacoes');
    if (list) {
        renderTransactionGroups(transactions, list);
        bindTransactionFilters(transactions, list);
    }
    updateExpenseChart(transactions);
}

async function loadDueTransactions() {
    const list = document.querySelector('#due-list');
    if (!list) return;
    const transactions = await requestApi('/transacoes');
    const due = transactions.filter((transaction) => transaction.vencimento && transaction.status !== 'pago');
    list.replaceChildren();
    if (!due.length) list.textContent = 'Nenhum vencimento pendente.';
    else due.forEach((transaction) => list.append(createTransactionItem(transaction)));
    bindPaymentButtons();
}

function bindPaymentButtons() {
    document.querySelectorAll('.payment-button').forEach((button) => {
        button.onclick = async () => {
            try {
                await requestApi(`/transacoes/${button.dataset.id}/pagamento`, { method: 'PATCH' });
                button.textContent = 'Pago';
                button.disabled = true;
                button.closest('.transaction-item').classList.add('is-paid');
                showFeedback('Pagamento registrado com sucesso!');
            } catch (error) { showFeedback(error.message); }
        };
    });
}

function bindReportFilters() {
    const filterForm = document.querySelector('.report-filters');
    if (!filterForm) return;
    filterForm.addEventListener('change', () => {
        loadFinancialSummary(getReportFilterQuery()).catch((error) => alert(error.message));
    });
}

function getReportFilterQuery() {
    const filterForm = document.querySelector('.report-filters');
    if (!filterForm) return '';
    const params = new URLSearchParams({
        periodo: document.querySelector('#report-period')?.selectedIndex || 0,
        tipo: document.querySelector('#report-type')?.selectedIndex || 0
    });
    return `?${params.toString()}`;
}

Promise.all([loadFinancialSummary(getReportFilterQuery()), loadTransactions(), loadDueTransactions()]).catch((error) => {
    if (error.message.includes('comunicar')) console.warn(error.message);
    else alert(error.message);
});

bindReportFilters();

const typeOptions = document.querySelectorAll('.type-option');
const valueInput = document.querySelector('#value');

if (valueInput) {
    const clearDefaultValue = () => {
        if (valueInput.value === '0,00') valueInput.value = '';
    };
    const restoreDefaultValue = () => {
        if (!valueInput.value.trim()) valueInput.value = '0,00';
    };

    window.addEventListener('load', () => setTimeout(() => {
        valueInput.focus();
        clearDefaultValue();
    }, 0));
    valueInput.addEventListener('focus', clearDefaultValue);
    valueInput.addEventListener('blur', restoreDefaultValue);
}

// Ensure filter buttons are visually interactive even if transactions fail to load
function bindFilterButtonsOnly() {
    const filterButtons = document.querySelectorAll('.filter-chips button');
    if (!filterButtons.length) return;
    filterButtons.forEach((button) => {
        button.onclick = (e) => {
            e.preventDefault();
            filterButtons.forEach((item) => item.classList.remove('filter-active'));
            button.classList.add('filter-active');
        };
    });
}

bindFilterButtonsOnly();

// Filter actions popup behavior
function bindFilterPopup() {
    const popup = document.querySelector('.filter-popup');
    const trigger = document.querySelector('.filter-actions');
    if (!trigger || !popup) return;

    const closePopup = () => {
        popup.setAttribute('hidden', '');
        popup.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
    };

    const openPopup = () => {
        popup.removeAttribute('hidden');
        popup.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
    };

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup.hasAttribute('hidden')) openPopup();
        else closePopup();
    });

    // clicking a popup option triggers corresponding filter button click
    popup.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-popup-filter]');
        if (!btn) return;
        const key = btn.dataset.popupFilter;
        const target = document.querySelector(`.filter-chips button[data-filter="${key}"]`)
            || document.querySelector('.filter-chips button');
        if (target) target.click();
        closePopup();
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && !trigger.contains(e.target)) closePopup();
    });
}

bindFilterPopup();

typeOptions.forEach((option) => {
    option.addEventListener('click', () => {
        typeOptions.forEach((item) => {
            item.classList.remove('selected');
            item.setAttribute('aria-pressed', 'false');
        });
        option.classList.add('selected');
        option.setAttribute('aria-pressed', 'true');
        document.querySelector('#summary-type')?.replaceChildren(option.dataset.transactionType === 'income' ? 'Receita' : 'Despesa');
    });
});

const transactionForm = document.querySelector('#transaction-form');

if (transactionForm) {
    const accountSelect = transactionForm.elements.account;
    requestApi('/contas').then((accounts) => {
        if (!accounts || !accounts.length) return;
        accountSelect.replaceChildren(new Option('Selecione uma conta', '', true, true));
        accounts.forEach((account) => accountSelect.add(new Option(account.nome, account.id)));
    }).catch((error) => console.warn(error.message));

    document.querySelector('.cancel-button')?.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    transactionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = new FormData(transactionForm);
        const selectedType = document.querySelector('.type-option.selected');
        const value = parseCurrency(form.get('value'));
        const accountId = Number(form.get('account'));

        if (!Number.isFinite(value) || value <= 0) {
            showFeedback('Informe um valor maior que zero.');
            return;
        }

        if (!Number.isInteger(accountId) || accountId <= 0) {
            showFeedback('Selecione uma conta cadastrada.');
            return;
        }

        try {
            await requestApi('/transacoes', {
                method: 'POST',
                body: JSON.stringify({
                    tipo: selectedType?.dataset.transactionType === 'income' ? 'receita' : 'despesa',
                    valor: value,
                    descricao: form.get('description') || 'Transação',
                    categoria: form.get('category') || 'Geral',
                    conta_id: accountId,
                    data: form.get('date'),
                    vencimento: form.get('dueDate') || null,
                    status: form.get('status') || 'pendente'
                })
            });
            showFeedback('Transação salva com sucesso!');
            setTimeout(() => {
                window.location.href = 'transacoes.html';
            }, 600);
        } catch (error) {
            showFeedback(error.message);
        }
    });
}

const accountForm = document.querySelector('#account-form');
const accountList = document.querySelector('#account-list');

if (accountForm && accountList) {
    let editingId = null;

    const loadAccounts = async () => {
        const accounts = await requestApi('/contas');
        if (!accounts) return;
        accountList.replaceChildren(...accounts.map((account) => {
            const item = document.createElement('article');
            const details = document.createElement('section');
            const name = document.createElement('strong');
            const type = document.createElement('small');
            const actions = document.createElement('aside');
            const editButton = document.createElement('button');
            const deleteButton = document.createElement('button');

            item.className = 'account-item';
            item.dataset.id = account.id;
            name.textContent = account.nome;
            type.textContent = account.tipo;
            editButton.type = 'button';
            editButton.className = 'account-edit';
            editButton.textContent = 'Editar';
            deleteButton.type = 'button';
            deleteButton.className = 'account-delete';
            deleteButton.textContent = 'Excluir';
            details.append(name, type);
            actions.append(editButton, deleteButton);
            item.append(details, actions);
            return item;
        }));
    };

    loadAccounts().catch((error) => console.warn(error.message));

    accountForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(accountForm));
        try {
            await requestApi(editingId ? `/contas/${editingId}` : '/contas', {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify({ nome: data.name, tipo: data.type })
            });
            const wasEditing = editingId;
            editingId = null;
            accountForm.reset();
            await loadAccounts();
            showFeedback(wasEditing ? 'Conta atualizada com sucesso!' : 'Conta cadastrada com sucesso!');
        } catch (error) {
            showFeedback(error.message);
        }
    });

    accountList.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        const item = button?.closest('.account-item');
        if (!button || !item) return;

        try {
            if (button.classList.contains('account-delete')) {
                if (!confirm('Excluir esta conta? As transações vinculadas serão mantidas no histórico.')) return;
                await requestApi(`/contas/${item.dataset.id}`, { method: 'DELETE' });
                await loadAccounts();
                showFeedback('Conta excluída com sucesso.');
                return;
            }
            editingId = item.dataset.id;
            accountForm.elements.name.value = item.querySelector('strong').textContent;
            accountForm.elements.type.value = item.querySelector('small').textContent;
            showFeedback('Editando conta: altere os dados no formulário acima.');
        } catch (error) {
            showFeedback(error.message);
        }
    });
}
