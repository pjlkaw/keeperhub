const configCabecalho = document.currentScript.dataset;
document.addEventListener('DOMContentLoaded', () => {
            fetch('/shared/components/header-page.html')
                .then(response => {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.text();
                })
                .then(data => {
                    document.getElementById('headerSection').innerHTML = data;
                    document.getElementById('pageNameH1').textContent = configCabecalho.title;
                    document.getElementById('pageSubtittleSpan').textContent = configCabecalho.subtitle;
                    const btnVoltar = document.getElementById('btn-back-header');
                    btnVoltar.href = "/modules/financas/";
                    // data-back="anterior": volta para a página de onde a pessoa veio, desde que seja do próprio módulo.
                    if (configCabecalho.back === 'anterior' && document.referrer) {
                        const origem = new URL(document.referrer);
                        const mesmaOrigem = origem.origin === window.location.origin;
                        const doModulo = origem.pathname.startsWith('/modules/financas/');
                        const outraPagina = origem.pathname !== window.location.pathname;
                        if (mesmaOrigem && doModulo && outraPagina) btnVoltar.href = origem.pathname + origem.search;
                    }
                    btnVoltar.setAttribute('aria-label', 'Voltar');
                    document.getElementById('btn-notifications').href = '/shared/components/notifications.html?modulo=financas';
                    const atualizarRotuloTema = () => {
                        const botao = document.getElementById('theme-toggle');
                        if (!botao) return;
                        const rotulo = document.documentElement.dataset.theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
                        botao.setAttribute('aria-label', rotulo);
                        botao.title = rotulo;
                    };
                    atualizarRotuloTema();
                    new MutationObserver(atualizarRotuloTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
                })
                .catch(erro => console.error('Nao foi possivel carregar o cabecalho.', erro));
        });
