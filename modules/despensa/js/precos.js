export function inicializarPrecos() {
    const botaoRota = document.getElementById('routeToggle');
    const textoRota = document.getElementById('routeToggleText');
    const painelRota = document.getElementById('routePanel');
    const fecharRota = document.getElementById('routeClose');

    function alternarRota(aberta) {
        painelRota.hidden = !aberta;
        painelRota.classList.toggle('open', aberta);
        botaoRota.classList.toggle('is-open', aberta);
        botaoRota.setAttribute('aria-expanded', String(aberta));
        painelRota.setAttribute('aria-hidden', String(!aberta));
        textoRota.textContent = aberta ? 'Ocultar rota' : 'Ver melhor rota';
    }

    botaoRota.addEventListener('click', () => alternarRota(painelRota.hidden));
    fecharRota.addEventListener('click', () => {
        alternarRota(false);
        botaoRota.focus();
    });
    painelRota.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape') {
            alternarRota(false);
            botaoRota.focus();
        }
    });
}
