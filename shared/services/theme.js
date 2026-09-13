// theme.js
// Responsabilidade: aplicar e alternar o tema claro/escuro da interface.
// Usa localStorage para persistir a escolha do usuário e atua sobre o atributo data-theme
// do documento, com suporte ao botão com id="theme-toggle".
// Uso: <script src="shared/services/theme.js"></script>
// Precisa de um botão com id="theme-toggle" contendo um <i> (ícone) dentro.

function initTheme() {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcons = themeToggle ? themeToggle.querySelectorAll('.theme-icon') : [];

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        themeIcons.forEach((icon) => {
            const isSun = icon.classList.contains('theme-icon-sun');
            const isMoon = icon.classList.contains('theme-icon-moon');
            const shouldShow = theme === 'dark' ? isMoon : isSun;
            icon.style.display = shouldShow ? 'block' : 'none';
        });
        localStorage.setItem('keeperhub-theme', theme);
    }

    const savedTheme = localStorage.getItem('keeperhub-theme') || 'dark';
    applyTheme(savedTheme);

    document.addEventListener('click', (event) => {
        const themeToggle = event.target.closest('#theme-toggle');

        if (!themeToggle) return;

        const current = root.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

document.addEventListener('DOMContentLoaded', initTheme);