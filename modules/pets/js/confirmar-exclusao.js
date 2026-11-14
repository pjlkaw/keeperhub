/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: confirmar-exclusao.js
Abre uma confirmação visual antes de excluir um registro.
Depende de: essentials/components.css
Usado por: consultas, vacinas, medicações, despesas e edição do pet
================================================== */

export function confirmarExclusao({ titulo = 'Excluir registro?', mensagem, confirmar = 'Excluir' } = {}) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'confirmacao-exclusao';

        const cabecalho = document.createElement('h2');
        cabecalho.id = 'confirmacao-exclusao-titulo';
        cabecalho.className = 'confirmacao-exclusao__titulo';
        cabecalho.textContent = titulo;

        const texto = document.createElement('p');
        texto.id = 'confirmacao-exclusao-mensagem';
        texto.className = 'confirmacao-exclusao__mensagem';
        texto.textContent = mensagem || 'Essa ação não pode ser desfeita.';

        const acoes = document.createElement('div');
        acoes.className = 'confirmacao-exclusao__acoes';

        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'botao-secundario';
        cancelar.textContent = 'Cancelar';
        cancelar.autofocus = true;

        const confirmarBotao = document.createElement('button');
        confirmarBotao.type = 'button';
        confirmarBotao.className = 'botao-principal';
        confirmarBotao.textContent = confirmar;

        acoes.append(cancelar, confirmarBotao);
        dialog.setAttribute('aria-labelledby', cabecalho.id);
        dialog.setAttribute('aria-describedby', texto.id);
        dialog.append(cabecalho, texto, acoes);
        document.body.append(dialog);

        const finalizar = valor => {
            dialog.close();
            dialog.remove();
            resolve(valor);
        };

        cancelar.addEventListener('click', () => finalizar(false));
        confirmarBotao.addEventListener('click', () => finalizar(true));
        dialog.addEventListener('cancel', event => {
            event.preventDefault();
            finalizar(false);
        });
        dialog.addEventListener('click', event => {
            if (event.target === dialog) finalizar(false);
        });

        dialog.showModal();
        cancelar.focus();
    });
}
