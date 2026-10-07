export function atualizarNoContent(temConteudo) {
    const secao = document.querySelector(".no-content-section");

    if (!secao) {
        return;
    }

    secao.hidden = temConteudo;
    document.body.classList.toggle("sem-rolagem", !temConteudo);
}
