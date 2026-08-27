const API_URL = '/api';

async function requestApi(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Não foi possível comunicar com a API.');
    }

    return response.status === 204 ? null : response.json();
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
    const income = Number(summary.receitas);
    const expense = Number(summary.despesas);
    const balance = Number(summary.saldo);
    const margin = income ? Math.max(0, Math.round((balance / income) * 100)) : 0;

    document.querySelector('#dashboard-balance')?.replaceChildren(formatCurrency(balance));
    document.querySelector('#dashboard-change')?.replaceChildren('Dados atualizados pelo banco');
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

    let currentFilter = 'Todas';
    const applyFilters = () => {
        const searchTerm = searchInput?.value.trim().toLowerCase() || '';
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const filtered = transactions.filter((transaction) => {
            const haystack = [transaction.descricao, transaction.categoria, transaction.conta_nome].filter(Boolean).join(' ').toLowerCase();
            const transactionDate = transaction.data ? new Date(transaction.data) : null;
            const matchesSearch = !searchTerm || haystack.includes(searchTerm);
            const matchesType = currentFilter === 'Receitas' ? transaction.tipo === 'receita' : currentFilter === 'Despesas' ? transaction.tipo === 'despesa' : true;
            const matchesMonth = currentFilter.includes('Este') ? transactionDate && transactionDate.getUTCMonth() === currentMonth && transactionDate.getUTCFullYear() === currentYear : true;
            return matchesSearch && matchesType && matchesMonth;
        });
        renderTransactionGroups(filtered, list);
    };

    searchInput?.addEventListener('input', applyFilters);
    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            filterButtons.forEach((item) => item.classList.remove('filter-active'));
            button.classList.add('filter-active');
            currentFilter = button.textContent.trim();
            applyFilters();
        });
    });
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
            } catch (error) { alert(error.message); }
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

typeOptions.forEach((option) => {
    option.addEventListener('click', () => {
        typeOptions.forEach((item) => {
            item.classList.remove('selected');
            item.setAttribute('aria-pressed', 'false');
        });
        option.classList.add('selected');
        option.setAttribute('aria-pressed', 'true');
    });
});

const transactionForm = document.querySelector('#transaction-form');

if (transactionForm) {
    const accountSelect = transactionForm.elements.account;
    requestApi('/contas').then((accounts) => {
        accountSelect.replaceChildren(new Option('Selecione uma conta', '', true, true));
        accounts.forEach((account) => accountSelect.add(new Option(account.nome, account.id)));
    }).catch((error) => alert(error.message));

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
            alert('Informe um valor maior que zero.');
            return;
        }

        if (!Number.isInteger(accountId) || accountId <= 0) {
            alert('Selecione uma conta cadastrada antes de salvar a transação.');
            return;
        }

        try {
            await requestApi('/transacoes', {
                method: 'POST',
                body: JSON.stringify({
                    tipo: selectedType?.dataset.transactionType === 'income' ? 'receita' : 'despesa',
                    valor: value,
                    descricao: form.get('description'),
                    categoria: form.get('category'),
                    conta_id: accountId,
                    data: form.get('date'),
                    vencimento: form.get('dueDate') || null,
                    status: form.get('status') || 'pendente'
                })
            });
            alert('Transação salva com sucesso!');
            window.location.href = 'transacoes.html';
        } catch (error) {
            alert(error.message);
        }
    });
}

const accountForm = document.querySelector('#account-form');
const accountList = document.querySelector('#account-list');

if (accountForm && accountList) {
    let editingId = null;

    const loadAccounts = async () => {
        const accounts = await requestApi('/contas');
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

    loadAccounts().catch((error) => alert(error.message));

    accountForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(accountForm));
        try {
            await requestApi(editingId ? `/contas/${editingId}` : '/contas', {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify({ nome: data.name, tipo: data.type })
            });
            editingId = null;
            accountForm.reset();
            await loadAccounts();
        } catch (error) {
            alert(error.message);
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
                return;
            }
            editingId = item.dataset.id;
            accountForm.elements.name.value = item.querySelector('strong').textContent;
            accountForm.elements.type.value = item.querySelector('small').textContent;
        } catch (error) {
            alert(error.message);
        }
    });
}
