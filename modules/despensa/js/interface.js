// Monta a navegação compartilhada no contexto da Despensa.
import { alertShared } from '/shared/services/interface.js';

export async function inicializarInterface() {

 fetch('/shared/components/navbar-section.html')
        .then(response => response.text())
        .then(data => {
            const nav = document.getElementById('modules-nav-wrapper');
            nav.innerHTML = data;

            const moduloAtual = nav.querySelector('[data-module="SEU-MODULO"]');
            moduloAtual.classList.add('active');
            moduloAtual.setAttribute('aria-selected', 'true');
            moduloAtual.setAttribute('tabindex', '0');
        });
    }




