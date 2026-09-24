// Monta a navegação compartilhada no contexto de Finanças.
import { alertShared } from '/shared/services/interface.js';

export async function inicializarInterface() {
    const nav = document.getElementById('modules-nav-wrapper');
    if (!nav) return;
    try {
        const resposta = await fetch('/shared/components/navbar-section.html');
        if (!resposta.ok) throw new Error('Falha ao carregar a navegação.');
        nav.innerHTML = await resposta.text();
        nav.querySelector('[role="tablist"]')?.removeAttribute('role');
        nav.querySelectorAll('[data-module]').forEach((link) => {
            const ativo = link.dataset.module === 'financas';
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
