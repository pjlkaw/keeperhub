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
                    document.getElementById('btn-back-header').href = "/modules/financas/";
                    document.getElementById('btn-back-header').setAttribute('aria-label', 'Voltar');
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
