(function () {
	const THEME_KEY = 'keeperhub-financas-theme';
	const root = document.documentElement;
	const buttons = document.querySelectorAll('.preview-theme-button, .finance-theme-button');
	const savedTheme = localStorage.getItem(THEME_KEY);
	const initialTheme = savedTheme === 'light' ? 'light' : 'dark';

	const applyTheme = (theme) => {
		const isLight = theme === 'light';
		root.dataset.theme = theme;
		document.querySelector('.app-preview')?.classList.toggle('preview-light', isLight);

		buttons.forEach((button) => {
			button.setAttribute('aria-pressed', String(isLight));
			button.setAttribute('aria-label', isLight ? 'Ativar modo escuro' : 'Ativar modo claro');
			button.textContent = isLight ? '☾' : '☀';
		});
	};

	applyTheme(initialTheme);

	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			const nextTheme = root.dataset.theme === 'light' ? 'dark' : 'light';
			localStorage.setItem(THEME_KEY, nextTheme);
			applyTheme(nextTheme);
		});
	});
}());
