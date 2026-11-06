import { formatarMoeda, formatarData, lerMoeda, obterContas, obterTransacoes, proximoId, salvarTransacoes } from './dados.js';
import { apiDisponivel, criarTransacaoApi, listarContasApi, atualizarTransacaoApi } from './api.js';

export async function inicializarFormulario() {
    const formulario = document.getElementById('transaction-form');
    if (!formulario) return;

    const campos = formulario.elements;
    const tipos = formulario.querySelectorAll('.type-option');
    const salvar = formulario.querySelector('[type="submit"]');
    let contas = obterContas();
    if (apiDisponivel()) {
        try {
            contas = await listarContasApi();
        } catch (erro) {
            console.warn('API de contas indisponível; usando contas locais.', erro.message);
        }
    }
    const parametros = new URLSearchParams(window.location.search);
    const idEmEdicao = Number(parametros.get('id'));
    const modoEdicaoSolicitado = parametros.get('modo') === 'editar'
        && Number.isInteger(idEmEdicao)
        && idEmEdicao > 0;

    if (!campos.date.value) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        campos.date.value = `${ano}-${mes}-${dia}`;
    }

    campos.account.replaceChildren(new Option('Selecione uma conta', '', true, true));
    contas.forEach((conta) => campos.account.add(new Option(conta.nome, conta.id)));

    const transacoesAtuais = await obterTransacoes();
    const transacaoEmEdicao = modoEdicaoSolicitado
        ? transacoesAtuais.find((transacao) => Number(transacao.id) === idEmEdicao)
        : null;
    const modoEdicao = Boolean(transacaoEmEdicao);

    if (transacaoEmEdicao) {
        const tipoReceita = transacaoEmEdicao.tipo === 'receita';
        tipos.forEach((botao) => {
            const ativo = (botao.dataset.transactionType === 'income') === tipoReceita;
            botao.classList.toggle('selected', ativo);
            botao.setAttribute('aria-pressed', String(ativo));
        });
        campos.value.value = Number(transacaoEmEdicao.valor || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        campos.description.value = transacaoEmEdicao.descricao || '';
        campos.date.value = transacaoEmEdicao.data || campos.date.value;
        campos.category.value = transacaoEmEdicao.categoria || campos.category.value;
        campos.account.value = String(transacaoEmEdicao.conta_id
            || contas.find((conta) => conta.nome === transacaoEmEdicao.conta_nome)?.id
            || '');
        campos.dueDate.value = transacaoEmEdicao.vencimento || '';
        campos.notes.value = transacaoEmEdicao.observacoes || '';
        campos.status.value = transacaoEmEdicao.status || 'pending';
        salvar.textContent = 'Salvar alterações';
    }

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
        atualizarResumo();
    });
    formulario.querySelector('.cancel-button').addEventListener('click', () => {
        const btnVoltar = document.getElementById('btn-back-header');
        window.location.href = btnVoltar ? btnVoltar.getAttribute('href') : '../index.html';
    });

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const dados = new FormData(formulario);
        const valor = lerMoeda(dados.get('value'));
        const contaId = Number(dados.get('account'));

        if (!Number.isFinite(valor) || valor <= 0 || !Number.isInteger(contaId) || contaId <= 0) {
            formulario.reportValidity();
            return;
        }

        const conta = contas.find((item) => item.id === contaId);
        const novaTransacao = {
            id: modoEdicao ? idEmEdicao : proximoId(transacoesAtuais),
            tipo: formulario.querySelector('.type-option.selected').dataset.transactionType === 'income' ? 'receita' : 'despesa',
            valor,
            descricao: dados.get('description'),
            categoria: dados.get('category'),
            conta_id: contaId,
            conta_nome: conta?.nome || '',
            data: dados.get('date'),
            vencimento: dados.get('dueDate') || null,
            status: dados.get('status') || 'pending',
            observacoes: String(dados.get('notes') || '').trim() || null
        };
        let transacaoSalva = novaTransacao;
        if (apiDisponivel()) {
            try {
                const resposta = modoEdicao
                    ? await atualizarTransacaoApi(idEmEdicao, novaTransacao)
                    : await criarTransacaoApi(novaTransacao);
                transacaoSalva = {
                    ...novaTransacao,
                    id: Number(resposta?.id || novaTransacao.id)
                };
            } catch (erro) {
                window.alert(erro.message);
                return;
            }
        }
        const transacoes = modoEdicao
            ? transacoesAtuais.map((transacao) => Number(transacao.id) === idEmEdicao ? transacaoSalva : transacao)
            : [...transacoesAtuais, transacaoSalva];
        salvarTransacoes(transacoes);
        window.location.href = 'transacoes.html';
    });

    salvar.disabled = false;
    atualizarResumo();
}
