// Monta a navegação compartilhada no contexto da Despensa.
import { alertShared } from '/shared/services/interface.js';

export async function inicializarInterface() {
    const nav = document.getElementById('modules-nav-wrapper');
    try {
        const resposta = await fetch('/shared/components/navbar-section.html');
        if (!resposta.ok) throw new Error('Falha ao carregar a navegação.');
        nav.innerHTML = await resposta.text();
        // Links para páginas não são abas com painéis na mesma página.
        nav.querySelector('[role="tablist"]')?.removeAttribute('role');
        nav.querySelectorAll('[data-module]').forEach((link) => {
            const ativo = link.dataset.module === 'despensa';
            link.classList.toggle('active', ativo);
            link.removeAttribute('role');
            link.removeAttribute('aria-selected');
            link.removeAttribute('tabindex');
            if (ativo) link.setAttribute('aria-current', 'page');
        });
    } catch (erro) {
        alertShared('Não foi possível carregar a navegação entre módulos.');
    }
}
