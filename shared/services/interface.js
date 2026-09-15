// Arquivo geral .js de padronização de elementos da interface
// Final de head:
// <script src="/shared/services/interface.js"></script>


// ALERTAS
// Ao início do <body>: 
// <section id="alertFromShared" class="alert"></section>
export function alertShared(conteudo) {
    const alert = document.getElementById('alertFromShared');

    if (!alert) return;

    alert.textContent = conteudo;
    alert.style.transition = 'top 0.35s ease, opacity 0.35s ease';
    alert.style.opacity = '1';
    alert.style.top = '20px';

    clearTimeout(alert._closeTimer);
    alert._closeTimer = setTimeout(() => {
        alert.style.top = '-100px';
        alert.style.opacity = '0';
    }, 2200);
}