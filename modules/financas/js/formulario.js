import { consultarApi, formatarMoeda, formatarData, lerMoeda, mostrarErro } from './dados.js';

export async function inicializarFormulario() {
    const formulario = document.getElementById('transaction-form');
    if (!formulario) return;
    const campos = formulario.elements;
    const tipos = formulario.querySelectorAll('.type-option');
    const salvar = formulario.querySelector('[type="submit"]');
    const atualizarResumo = () => {
        const valores = {
            value: formatarMoeda(lerMoeda(campos.value.value)),
            category: campos.category.value,
            date: formatarData(campos.date.value),
            account: campos.account.selectedOptions[0]?.textContent || ''
        };
        for (const [campo, valor] of Object.entries(valores)) {
            document.getElementById('summary-' + campo).textContent = valor;
        }
    };
    tipos.forEach((botao) => botao.addEventListener('click', () => {
        tipos.forEach((item) => {
            const ativo = item === botao;
            item.classList.toggle('selected', ativo);
            item.setAttribute('aria-pressed', String(ativo));
        });
        document.getElementById('summary-type').textContent = botao.dataset.transactionType === 'income' ? 'Receita' : 'Despesa';
    }));
    formulario.addEventListener('input', atualizarResumo);
    formulario.addEventListener('change', atualizarResumo);
    campos.value.addEventListener('focus', () => {
        if (campos.value.value === '0,00') campos.value.value = '';
    });
    campos.value.addEventListener('blur', () => {
        if (!campos.value.value.trim()) campos.value.value = '0,00';
    });
    campos.value.focus();
    formulario.querySelector('.cancel-button').addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (salvar.disabled) return;
        const dados = new FormData(formulario);
        const valor = lerMoeda(dados.get('value'));
        const contaId = Number(dados.get('account'));
        if (!Number.isFinite(valor) || valor <= 0) return alert('Informe um valor maior que zero.');
        if (!Number.isInteger(contaId) || contaId <= 0) return alert('Selecione uma conta cadastrada antes de salvar a transação.');
        salvar.disabled = true;
        try {
            await consultarApi('/transacoes', {
                method: 'POST',
                body: JSON.stringify({
                    tipo: formulario.querySelector('.type-option.selected').dataset.transactionType === 'income' ? 'receita' : 'despesa',
                    valor, descricao: dados.get('description'), categoria: dados.get('category'),
                    conta_id: contaId, data: dados.get('date'), vencimento: dados.get('dueDate') || null,
                    status: dados.get('status') || 'pendente'
                })
            });
            alert('Transação salva com sucesso!');
            window.location.href = 'transacoes.html';
        } catch (erro) {
            mostrarErro(erro);
        } finally {
            salvar.disabled = false;
        }
    });
    salvar.disabled = true;
    campos.account.disabled = true;
    try {
        const contas = await consultarApi('/contas');
        campos.account.replaceChildren(new Option('Selecione uma conta', '', true, true));
        contas.forEach((conta) => campos.account.add(new Option(conta.nome, conta.id)));
        campos.account.disabled = false;
        salvar.disabled = false;
    } catch (erro) {
        campos.account.replaceChildren(new Option('Não foi possível carregar as contas', ''));
        mostrarErro(erro);
    }
}
