// Estado de erro do módulo Finanças, no mesmo padrão do módulo Pets:
// mensagem em vermelho + botão "Tentar novamente", que apenas tenta carregar de novo.
const ID_ERRO = 'finance-access-error';

function removerErro() {
    document.getElementById(ID_ERRO)?.remove();
    document.querySelector('.app-container')?.classList.remove('finance-access-failed');
}

// recarregar: função que tenta carregar a página de novo (lança erro se falhar).
export function mostrarErroAcesso(erro, recarregar) {
    const container = document.querySelector('.app-container');
    if (!container) return;
    removerErro();

    const secao = document.createElement('section');
    const mensagem = document.createElement('p');
    const botao = document.createElement('button');
    secao.id = ID_ERRO;
    secao.className = 'finance-access-error';
    mensagem.className = 'finance-access-error__message';
    mensagem.setAttribute('role', 'alert');
    mensagem.textContent = erro?.message || 'Não foi possível acessar as finanças.';
    botao.type = 'button';
    botao.className = 'finance-access-error__button';
    botao.textContent = 'Tentar novamente';
    secao.append(mensagem, botao);

    // Entra logo depois do cabeçalho, como no Pets.
    const cabecalho = container.querySelector('.section-header-section');
    if (cabecalho) cabecalho.after(secao);
    else container.prepend(secao);
    container.classList.add('finance-access-failed');

    botao.addEventListener('click', async () => {
        botao.disabled = true;
        try {
            await recarregar();
            // Deu certo: recarrega a tela normal.
            window.location.reload();
        } catch (novoErro) {
            // Continua com erro: mostra a mensagem de novo, como no Pets.
            mostrarErroAcesso(novoErro, recarregar);
        }
    });
}
