
(async function () {
    const nav = document.getElementById('modules-nav-wrapper');
    async function carregar(container, arquivo, configurar) {
        try {
            const resposta = await fetch('/shared/components/' + arquivo);
            if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
            const template = document.createElement('template');
            template.innerHTML = await resposta.text();
            configurar(template.content);
            container.replaceChildren(template.content);
        } catch (erro) {
            console.warn('Componente indisponivel; mantendo conteudo inicial: ' + arquivo, erro);
        }
    }
    await Promise.all([
        carregar(nav, 'navbar-section.html', (fragmento) => {
            fragmento.querySelector('[data-module="financas"]').classList.add('active');
            fragmento.querySelector('.modules-nav-bar').removeAttribute('role');
            fragmento.querySelectorAll('[data-module]').forEach((link) => {
                link.removeAttribute('role');
                link.removeAttribute('aria-selected');
                link.removeAttribute('tabindex');
            });
        })
    ]);
})();
