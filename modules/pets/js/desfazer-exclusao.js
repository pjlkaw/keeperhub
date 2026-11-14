/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: desfazer-exclusao.js
Mostra um aviso temporário com a opção de cancelar uma exclusão.
A exclusão só é enviada ao armazenamento ou à API quando o prazo termina.
Usado por: consultas, vacinas, medicações, despesas e cadastro do pet
================================================== */

// Insere o aviso antes do elemento indicado e executa a exclusão após o prazo.
export function oferecerDesfazerExclusao({
    antesDe,
    mensagem,
    aoDesfazer,
    aoExcluir,
    aoFalhar,
    duracao = 7000
}) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso-exclusao-pendente';
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

    if (antesDe?.parentElement) antesDe.before(aviso);
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
    }, duracao);

    desfazer.addEventListener('click', () => {
        window.clearTimeout(temporizador);
        aviso.remove();
        aoDesfazer();
    }, { once: true });
}
