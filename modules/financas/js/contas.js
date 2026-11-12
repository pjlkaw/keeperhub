import { obterContas, obterTransacoes } from './dados.js';
import { atualizarContaApi, criarContaApi, excluirContaApi } from './api.js';

export async function inicializarContas() {
    const formulario = document.getElementById('account-form');
    const lista = document.getElementById('account-list');
    if (!formulario || !lista) return;

    let contaEmEdicao = null;
    let contas = await obterContas();
    let transacoes = await obterTransacoes();
    const salvarBotao = formulario.querySelector('[type="submit"]');
    const cancelarEdicao = formulario.querySelector('.cancel-edit-button');

    const renderizar = () => {
        if (!contas.length) {
            lista.textContent = 'Nenhuma conta cadastrada.';
            return;
        }
        lista.replaceChildren(...contas.map((conta) => {
            const item = document.createElement('article');
            const detalhes = document.createElement('section');
            const nome = document.createElement('strong');
            const tipo = document.createElement('small');
            const acoes = document.createElement('aside');
            item.className = 'account-item';
            item.dataset.id = conta.id;
            detalhes.setAttribute('aria-label', conta.nome);
            nome.textContent = conta.nome;
            tipo.textContent = conta.tipo;
            detalhes.append(nome, tipo);
            for (const [classe, texto] of [['account-edit', 'Editar'], ['account-delete', 'Excluir']]) {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = classe;
                botao.textContent = texto;
                botao.setAttribute('aria-label', texto + ' conta ' + conta.nome);
                acoes.append(botao);
            }
            item.append(detalhes, acoes);
            return item;
        }));
    };

    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) return;
        const dados = new FormData(formulario);
        const conta = { nome: dados.get('name'), tipo: dados.get('type') };
        if (contaEmEdicao) {
            try {
                await atualizarContaApi(contaEmEdicao, conta);
            } catch (erro) {
                window.alert(erro.message);
                return;
            }
            contas = contas.map((item) => item.id === contaEmEdicao ? { ...item, ...conta } : item);
        } else {
            try {
                const contaCriada = await criarContaApi(conta);
                contas.push({ id: contaCriada.id, ...conta });
            } catch (erro) {
                window.alert(erro.message);
                return;
            }
        }
        contaEmEdicao = null;
        formulario.reset();
        salvarBotao.textContent = 'Cadastrar conta';
        cancelarEdicao.hidden = true;
        renderizar();
    });

    lista.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('button');
        const item = botao?.closest('.account-item');
        if (!item) return;
        const conta = contas.find((registro) => String(registro.id) === item.dataset.id);
        if (!conta) return;
        if (botao.classList.contains('account-edit')) {
            contaEmEdicao = conta.id;
            formulario.elements.name.value = conta.nome;
            formulario.elements.type.value = conta.tipo;
            salvarBotao.textContent = 'Salvar alterações';
            cancelarEdicao.hidden = false;
            return;
        }
        const transacoesVinculadas = transacoes.filter((transacao) =>
            Number(transacao.conta_id) === Number(conta.id)
            || (transacao.conta_id === undefined && transacao.conta_nome === conta.nome)
        );
        if (transacoesVinculadas.length > 0) {
            window.alert('Esta conta possui transações vinculadas e não pode ser excluída.');
            return;
        }
        if (!window.confirm(`Excluir a conta "${conta.nome}"?`)) return;
        try {
            await excluirContaApi(conta.id);
        } catch (erro) {
            window.alert(erro.message);
            return;
        }
        contas = contas.filter((registro) => registro.id !== conta.id);
        if (contaEmEdicao === conta.id) {
            contaEmEdicao = null;
            formulario.reset();
            salvarBotao.textContent = 'Cadastrar conta';
            cancelarEdicao.hidden = true;
        }
        renderizar();
    });

    cancelarEdicao.addEventListener('click', () => {
        contaEmEdicao = null;
        formulario.reset();
        salvarBotao.textContent = 'Cadastrar conta';
        cancelarEdicao.hidden = true;
    });

    renderizar();
}
