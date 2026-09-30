import { consultarApi, mostrarErro } from './dados.js';

export async function inicializarContas() {
    const formulario = document.getElementById('account-form');
    const lista = document.getElementById('account-list');
    if (!formulario || !lista) return;
    let contaEmEdicao = null;
    let contas = [];
    const carregar = async () => {
        try {
            contas = await consultarApi('/contas');
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
        } catch (erro) {
            mostrarErro(erro, lista);
        }
    };
    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const botao = formulario.querySelector('[type="submit"]');
        if (botao.disabled) return;
        botao.disabled = true;
        const dados = new FormData(formulario);
        try {
            await consultarApi(contaEmEdicao ? '/contas/' + contaEmEdicao : '/contas', {
                method: contaEmEdicao ? 'PUT' : 'POST',
                body: JSON.stringify({ nome: dados.get('name'), tipo: dados.get('type') })
            });
            contaEmEdicao = null;
            formulario.reset();
            botao.textContent = 'Cadastrar conta';
            await carregar();
        } catch (erro) {
            mostrarErro(erro);
        } finally {
            botao.disabled = false;
        }
    });
    lista.addEventListener('click', async (evento) => {
        const botao = evento.target.closest('button');
        const item = botao?.closest('.account-item');
        if (!item || botao.disabled) return;
        const conta = contas.find((conta) => String(conta.id) === item.dataset.id);
        if (!botao.classList.contains('account-delete')) {
            contaEmEdicao = conta.id;
            formulario.elements.name.value = conta.nome;
            formulario.elements.type.value = conta.tipo;
            formulario.querySelector('[type="submit"]').textContent = 'Salvar alterações';
            return;
        }
        if (!confirm('Excluir esta conta? As transações vinculadas serão mantidas no histórico.')) return;
        botao.disabled = true;
        try {
            await consultarApi('/contas/' + conta.id, { method: 'DELETE' });
            if (contaEmEdicao === conta.id) {
                contaEmEdicao = null;
                formulario.reset();
                formulario.querySelector('[type="submit"]').textContent = 'Cadastrar conta';
            }
            await carregar();
        } catch (erro) {
            botao.disabled = false;
            mostrarErro(erro);
        }
    });
    await carregar();
}
