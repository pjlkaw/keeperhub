// Alternância de tema claro/escuro — compartilhado entre hub e módulos
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

    themeToggle?.addEventListener('click', () => {
        const current = root.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

document.addEventListener('DOMContentLoaded', initTheme);