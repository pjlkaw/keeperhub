import { obterContas, proximoId, salvarContas } from './dados.js';

export function inicializarContas() {
    const formulario = document.getElementById('account-form');
    const lista = document.getElementById('account-list');
    if (!formulario || !lista) return;

    let contaEmEdicao = null;
    let contas = obterContas();

    const renderizar = () => {
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

    formulario.addEventListener('submit', (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) return;
        const dados = new FormData(formulario);
        const conta = { nome: dados.get('name'), tipo: dados.get('type') };
        if (contaEmEdicao) {
            contas = contas.map((item) => item.id === contaEmEdicao ? { ...item, ...conta } : item);
        } else {
            contas.push({ id: proximoId(contas), ...conta });
        }
        salvarContas(contas);
        contaEmEdicao = null;
        formulario.reset();
        formulario.querySelector('[type="submit"]').textContent = 'Cadastrar conta';
        renderizar();
    });

    lista.addEventListener('click', (evento) => {
        const botao = evento.target.closest('button');
        const item = botao?.closest('.account-item');
        if (!item) return;
        const conta = contas.find((registro) => String(registro.id) === item.dataset.id);
        if (!conta) return;
        if (botao.classList.contains('account-edit')) {
            contaEmEdicao = conta.id;
            formulario.elements.name.value = conta.nome;
            formulario.elements.type.value = conta.tipo;
            formulario.querySelector('[type="submit"]').textContent = 'Salvar alterações';
            return;
        }
        contas = contas.filter((registro) => registro.id !== conta.id);
        salvarContas(contas);
        if (contaEmEdicao === conta.id) {
            contaEmEdicao = null;
            formulario.reset();
            formulario.querySelector('[type="submit"]').textContent = 'Cadastrar conta';
        }
        renderizar();
    });

    renderizar();
}
