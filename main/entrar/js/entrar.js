/**
 * ==================================================
 * KEEPERHUB — ENTRAR JAVASCRIPT
 * Padrão Arquitetural Oficial: /main/entrar/js/entrar.js
 * Responsabilidade: Interações, validações e fluxo de login da página /entrar/
 * ==================================================
 */

// Adição: reutiliza a função que autentica o usuário pela API.
import { loginUsuario } from '../../../shared/api/usuario.js';

function setupLoginForm() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('btn-submit-login');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const togglePasswordBtn = document.getElementById('btn-toggle-password');
  const iconEyeOpen = togglePasswordBtn ? togglePasswordBtn.querySelector('.icon-eye-open') : null;
  const iconEyeClosed = togglePasswordBtn ? togglePasswordBtn.querySelector('.icon-eye-closed') : null;

  // Alternância de visualização de senha (Mostrar / Ocultar)
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      passwordInput.setAttribute('type', newType);

      const label = isPassword ? 'Ocultar senha' : 'Mostrar senha';
      togglePasswordBtn.setAttribute('aria-label', label);
      togglePasswordBtn.setAttribute('title', label);

      if (iconEyeOpen && iconEyeClosed) {
        iconEyeOpen.style.display = isPassword ? 'none' : 'block';
        iconEyeClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkFormState() {
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const passVal = passwordInput ? passwordInput.value : '';
    const isEmailValid = emailRegex.test(emailVal);
    const isPassValid = passVal.length >= 6;

    if (submitBtn) {
      submitBtn.disabled = !(isEmailValid && isPassValid);
    }
  }

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      checkFormState();
      if (emailError && emailError.classList.contains('is-visible')) {
        emailError.classList.remove('is-visible');
        emailInput.classList.remove('has-error');
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      checkFormState();
      if (passwordError && passwordError.classList.contains('is-visible')) {
        passwordError.classList.remove('is-visible');
        passwordInput.classList.remove('has-error');
      }
    });
  }

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const passVal = passwordInput ? passwordInput.value : '';
      let hasError = false;

      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailError) emailError.classList.add('is-visible');
        if (emailInput) emailInput.classList.add('has-error');
        hasError = true;
      }

      if (!passVal || passVal.length < 6) {
        if (passwordError) passwordError.classList.add('is-visible');
        if (passwordInput) passwordInput.classList.add('has-error');
        hasError = true;
      }

      if (hasError) return;

      // Adição: mostra no console quando a tentativa de login começa, sem expor a senha.
      console.log('[Login] Tentativa de login:', emailVal);

      try {
        // Adição: só continua para o Hub depois que a API confirmar as credenciais.
        await loginUsuario(emailVal, passVal);
        console.log('[Login] Login realizado com sucesso:', emailVal);
        window.location.href = '../hub/index.html';
      } catch (erro) {
        // Adição: registra no console o motivo da falha retornado pela API.
        console.error('[Login] Falha ao realizar login:', erro);
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLoginForm);
} else {
  setupLoginForm();
}
