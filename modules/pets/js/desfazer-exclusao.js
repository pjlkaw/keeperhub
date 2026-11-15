/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: desfazer-exclusao.js
Mostra um aviso temporário com a opção de cancelar uma exclusão.
A exclusão só é enviada ao armazenamento ou à API quando o prazo termina.
Usado por: consultas, vacinas, medicações, despesas e cadastro do pet
================================================== */

// Registra a posição do cartão para inserir o aviso no mesmo ponto após renderizar a lista.
export function capturarPosicaoDoAviso(elemento) {
    const item = elemento?.closest('li') ?? elemento;
    const container = item?.parentElement;
    if (!container) return null;

    return {
        container,
        indice: Array.prototype.indexOf.call(container.children, item)
    };
}

// Insere o aviso no lugar do cartão e executa a exclusão após o prazo.
const TEMPO_PARA_DESFAZER = 4000;

export function oferecerDesfazerExclusao({
    antesDe,
    depoisDe,
    posicao,
    mensagem,
    aoDesfazer,
    aoExcluir,
    aoFalhar
}) {
    const lista = posicao?.container;
    const aviso = document.createElement(lista && /^(UL|OL)$/.test(lista.tagName) ? 'li' : 'div');
    aviso.className = 'aviso-exclusao-pendente';
    if (lista?.classList.contains('lista-historico-pets')) {
        aviso.classList.add('item-historico-pets');
    }
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');

    const texto = document.createElement('p');
    texto.className = 'aviso-exclusao-pendente__mensagem';
    texto.textContent = mensagem;

    const desfazer = document.createElement('button');
    desfazer.className = 'aviso-exclusao-pendente__botao';
    desfazer.type = 'button';
    desfazer.textContent = 'Desfazer';

    aviso.append(texto, desfazer);

    if (lista?.isConnected) {
        // Remove o estado vazio que a renderização pode ter colocado no lugar do cartão.
        lista.querySelectorAll(
            ':scope > .consulta-vazia, :scope > .medicacao-vazia, ' +
            ':scope > .vacina-vazia, :scope > .lancamentos-vazios'
        ).forEach(item => item.remove());
        const indice = Math.max(0, Math.min(posicao.indice, lista.children.length));
        lista.insertBefore(aviso, lista.children.item(indice));
    } else if (antesDe?.parentElement) antesDe.before(aviso);
    else if (depoisDe?.parentElement) depoisDe.after(aviso);
    else document.querySelector('main')?.prepend(aviso);

    const temporizador = window.setTimeout(async () => {
        desfazer.disabled = true;
        try {
            await aoExcluir();
        } catch (erro) {
            aoFalhar(erro);
        } finally {
            aviso.remove();
        }
    }, TEMPO_PARA_DESFAZER);

    desfazer.addEventListener('click', () => {
        window.clearTimeout(temporizador);
        aviso.remove();
        aoDesfazer();
    }, { once: true });
}
