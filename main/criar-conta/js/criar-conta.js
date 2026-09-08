/**
 * ==================================================
 * KEEPERHUB — CRIAR CONTA JAVASCRIPT
 * Padrão Arquitetural Oficial: /main/criar-conta/js/criar-conta.js
 * Responsabilidade: Interações, validações e fluxo de cadastro da página /criar-conta/
 * ==================================================
 */

function setupSignupForm() {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const telefoneInput = document.getElementById('telefone');
  const sexoSelect = document.getElementById('sexo');
  const passwordInput = document.getElementById('password');
  const passwordConfirmInput = document.getElementById('password-confirm');
  const submitBtn = document.getElementById('btn-submit-signup');

  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const telefoneError = document.getElementById('telefone-error');
  const sexoError = document.getElementById('sexo-error');
  const passwordError = document.getElementById('password-error');
  const passwordConfirmError = document.getElementById('password-confirm-error');

  const togglePasswordBtn = document.getElementById('btn-toggle-password');
  const togglePasswordConfirmBtn = document.getElementById('btn-toggle-password-confirm');

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
    if (digits.length <= 10) {
      return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
    }
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
  }

  function setupPasswordToggle(button, inputField) {
    if (!button || !inputField) return;
    const iconEyeOpen = button.querySelector('.icon-eye-open');
    const iconEyeClosed = button.querySelector('.icon-eye-closed');

    button.addEventListener('click', () => {
      const isPassword = inputField.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      inputField.setAttribute('type', newType);

      const label = isPassword ? 'Ocultar senha' : 'Mostrar senha';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);

      if (iconEyeOpen && iconEyeClosed) {
        iconEyeOpen.style.display = isPassword ? 'none' : 'block';
        iconEyeClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  setupPasswordToggle(togglePasswordBtn, passwordInput);
  setupPasswordToggle(togglePasswordConfirmBtn, passwordConfirmInput);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkFormState() {
    const nameVal = nameInput ? nameInput.value.trim() : '';
    const emailVal = emailInput ? emailInput.value.trim() : '';
    const phoneDigits = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : '';
    const sexoVal = sexoSelect ? sexoSelect.value : '';
    const passVal = passwordInput ? passwordInput.value : '';
    const passConfirmVal = passwordConfirmInput ? passwordConfirmInput.value : '';

    const isNameValid = nameVal.length > 0;
    const isEmailValid = emailRegex.test(emailVal);
    const isPhoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
    const isSexoValid = sexoVal === 'masculino' || sexoVal === 'feminino';
    const isPassValid = passVal.length >= 8;
    const isPassConfirmValid = passConfirmVal.length >= 8 && passConfirmVal === passVal;

    const isFormComplete =
      isNameValid &&
      isEmailValid &&
      isPhoneValid &&
      isSexoValid &&
      isPassValid &&
      isPassConfirmValid;

    if (submitBtn) {
      submitBtn.disabled = !isFormComplete;
    }
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      checkFormState();
      if (nameError && nameError.classList.contains('is-visible')) {
        nameError.classList.remove('is-visible');
        nameInput.classList.remove('has-error');
      }
    });
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

  if (telefoneInput) {
    telefoneInput.addEventListener('input', () => {
      const formatted = formatPhone(telefoneInput.value);
      telefoneInput.value = formatted;
      checkFormState();
      if (telefoneError && telefoneError.classList.contains('is-visible')) {
        telefoneError.classList.remove('is-visible');
        telefoneInput.classList.remove('has-error');
      }
    });
  }

  if (sexoSelect) {
    sexoSelect.addEventListener('change', () => {
      checkFormState();
      if (sexoError && sexoError.classList.contains('is-visible')) {
        sexoError.classList.remove('is-visible');
        sexoSelect.classList.remove('has-error');
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
      if (passwordConfirmError && passwordConfirmError.classList.contains('is-visible')) {
        if (passwordConfirmInput && passwordConfirmInput.value === passwordInput.value) {
          passwordConfirmError.classList.remove('is-visible');
          passwordConfirmInput.classList.remove('has-error');
        }
      }
    });
  }

  if (passwordConfirmInput) {
    passwordConfirmInput.addEventListener('input', () => {
      checkFormState();
      if (passwordConfirmError && passwordConfirmError.classList.contains('is-visible')) {
        passwordConfirmError.classList.remove('is-visible');
        passwordConfirmInput.classList.remove('has-error');
      }
    });
  }

  const form = document.getElementById('signup-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const phoneDigits = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : '';
      const sexoVal = sexoSelect ? sexoSelect.value : '';
      const passVal = passwordInput ? passwordInput.value : '';
      const passConfirmVal = passwordConfirmInput ? passwordConfirmInput.value : '';
      let hasError = false;

      if (!nameVal) {
        if (nameError) nameError.classList.add('is-visible');
        if (nameInput) nameInput.classList.add('has-error');
        hasError = true;
      }

      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailError) emailError.classList.add('is-visible');
        if (emailInput) emailInput.classList.add('has-error');
        hasError = true;
      }

      if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
        if (telefoneError) telefoneError.classList.add('is-visible');
        if (telefoneInput) telefoneInput.classList.add('has-error');
        hasError = true;
      }

      if (sexoVal !== 'masculino' && sexoVal !== 'feminino') {
        if (sexoError) sexoError.classList.add('is-visible');
        if (sexoSelect) sexoSelect.classList.add('has-error');
        hasError = true;
      }

      if (!passVal || passVal.length < 8) {
        if (passwordError) passwordError.classList.add('is-visible');
        if (passwordInput) passwordInput.classList.add('has-error');
        hasError = true;
      }

      if (!passConfirmVal || passConfirmVal !== passVal) {
        if (passwordConfirmError) passwordConfirmError.classList.add('is-visible');
        if (passwordConfirmInput) passwordConfirmInput.classList.add('has-error');
        hasError = true;
      }

      if (hasError) return;

      // Redirecionamento seguro pós-cadastro para a área autenticada
      window.location.href = '../hub/index.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSignupForm);
} else {
  setupSignupForm();
}
