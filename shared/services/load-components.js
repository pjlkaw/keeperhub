/*
 * CONFIG DO MÓDULO:
 *
 * Antes do script /shared/services/load-components.js, defina o módulo:
 *    window.keeperhubModuleConfig = {
 *      module: 'nome-do-modulo',
 *      title: 'Nome do módulo',
 *      subtitle: 'Descrição curta',
 *      backUrl: '/main/',
 *      notificationsModule: 'nome-do-modulo',
 *      addUrl: '/modules/nome-do-modulo/components/adicionar.html'
 *    };
 *
 * Repita esse padrão nos demais módulos; se não houver botão de adicionar,
 * apenas remova "addUrl". o restante continua igual.
 */

const configModule = window.keeperhubModuleConfig || {
    module: 'medicamentos',
    title: 'Medicamentos',
    subtitle: 'Gestão de suas medicações',
    backUrl: '/main/',
    notificationsModule: 'medicamentos',
    addUrl: '/modules/medicamentos/components/adicionar-medicamento.html'
};

const MODULOS_PROTEGIDOS = new Set(['financas', 'despensa', 'pets', 'medicamentos']);

let promessaAcessos = null;
function obterAcessosUsuario() {
    if (!promessaAcessos) {
        promessaAcessos = fetch('/api/modulos/acesso', {
            credentials: 'same-origin',
            cache: 'no-store'
        }).then(async (resposta) => {
            if (resposta.status === 401) {
                window.location.replace('/main/entrar/index.html');
                return null;
            }
            if (!resposta.ok) {
                return null;
            }
            const dados = await resposta.json();
            const modulos = Array.isArray(dados?.modulos) ? dados.modulos : [];
            return new Set(modulos.map((m) => m.codigo));
        }).catch((err) => {
            console.error('[KeeperHub] Erro ao carregar acessos:', err);
            return null;
        });
    }
    return promessaAcessos;
}

if (MODULOS_PROTEGIDOS.has(configModule.module)) {
    obterAcessosUsuario().then((modulosAtivos) => {
        if (modulosAtivos && !modulosAtivos.has(configModule.module)) {
            window.location.replace('/main/compra/index.html');
        }
    });
}

function carregarModulo() {
    fetch('/shared/components/navbar-section.html')
        .then(response => response.text())
        .then(async data => {
            const nav = document.getElementById('modules-nav-wrapper');
            if (!nav) return;

            nav.innerHTML = data;

            const moduloAtual = nav.querySelector(`[data-module="${configModule.module}"]`);
            if (moduloAtual) {
                moduloAtual.classList.add('active');
                moduloAtual.setAttribute('aria-selected', 'true');
                moduloAtual.setAttribute('tabindex', '0');
            }

            const modulosAtivos = await obterAcessosUsuario();
            if (modulosAtivos) {
                nav.querySelectorAll('.modules-nav-item').forEach((item) => {
                    const cod = item.getAttribute('data-module');
                    if (cod && !modulosAtivos.has(cod)) {
                        item.hidden = true;
                        item.style.display = 'none';
                    }
                });
            }
        });

    fetch('/shared/components/header-page.html')
        .then(response => response.text())
        .then(data => {
            const header = document.getElementById('headerSection');
            if (!header) return;

            header.innerHTML = data;

            const pageName = document.getElementById('pageNameH1');
            const pageSubtittle = document.getElementById('pageSubtittleSpan');
            const btnBackHeader = document.getElementById('btn-back-header');
            const btnNotifications = document.getElementById('btn-notifications');

            if (pageName) pageName.textContent = configModule.title;
            if (pageSubtittle) pageSubtittle.textContent = configModule.subtitle;
            if (btnBackHeader) btnBackHeader.href = configModule.backUrl;
            if (btnNotifications) {
                btnNotifications.href = `/shared/components/notifications.html?modulo=${configModule.notificationsModule}`;
            }
        });

    fetch('/shared/components/no-content.html')
        .then(response => response.text())
        .then(data => {
            const noContentSection = document.getElementById('no-content-section');
            if (!noContentSection) return;

            noContentSection.innerHTML = data;
        });

    if (configModule.addUrl) {
        fetch('/shared/components/btn-add.html')
            .then(response => response.text())
            .then(data => {
                const btnAddSection = document.getElementById('btn-add-section');
                if (!btnAddSection) return;

                btnAddSection.innerHTML = data;

                const btnAdd = btnAddSection.querySelector('#btn-add');
                if (btnAdd) btnAdd.href = configModule.addUrl;
            });
    }

    fetch('/shared/components/modal-confirmation.html')
        .then(response => response.text())
        .then(data => {
            const modal = document.getElementById('confirmation-modal');
            if (!modal) return;

            modal.innerHTML = data;
        });
}

carregarModulo();
