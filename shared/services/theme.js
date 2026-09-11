// theme.js
// Responsabilidade: aplicar e alternar o tema claro/escuro da interface.
// Usa localStorage para persistir a escolha do usuário e atua sobre o atributo data-theme
// do documento, com suporte ao botão com id="theme-toggle".
// Uso: <script src="shared/services/theme.js"></script>
// Precisa de um botão com id="theme-toggle" contendo um <i> (ícone) dentro.

function initTheme() {
    const root = document.documentElement;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle?.querySelector('i');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
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