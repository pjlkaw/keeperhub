/**
 * ==================================================
 * KEEPERHUB — CADASTRO / CRIAR CONTA
 * Padrão Arquitetural: /main/js/criar-conta.js
 * Responsabilidade: Interações, validações e fluxo de cadastro da página /criar-conta/
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var telefoneInput = document.getElementById('telefone');
  var sexoSelect = document.getElementById('sexo');
  var passwordInput = document.getElementById('password');
  var passwordConfirmInput = document.getElementById('password-confirm');
  var submitBtn = document.getElementById('btn-submit-signup');

  var nameError = document.getElementById('name-error');
  var emailError = document.getElementById('email-error');
  var telefoneError = document.getElementById('telefone-error');
  var sexoError = document.getElementById('sexo-error');
  var passwordError = document.getElementById('password-error');
  var passwordConfirmError = document.getElementById('password-confirm-error');

  var togglePasswordBtn = document.getElementById('btn-toggle-password');
  var togglePasswordConfirmBtn = document.getElementById('btn-toggle-password-confirm');

  function formatPhone(value) {
    var digits = value.replace(/\D/g, '').slice(0, 11);
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
    var iconEyeOpen = button.querySelector('.icon-eye-open');
    var iconEyeClosed = button.querySelector('.icon-eye-closed');

    button.addEventListener('click', function () {
      var isPassword = inputField.getAttribute('type') === 'password';
      var newType = isPassword ? 'text' : 'password';
      inputField.setAttribute('type', newType);

      var label = isPassword ? 'Ocultar senha' : 'Mostrar senha';
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

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkFormState() {
    var nameVal = nameInput ? nameInput.value.trim() : '';
    var emailVal = emailInput ? emailInput.value.trim() : '';
    var phoneDigits = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : '';
    var sexoVal = sexoSelect ? sexoSelect.value : '';
    var passVal = passwordInput ? passwordInput.value : '';
    var passConfirmVal = passwordConfirmInput ? passwordConfirmInput.value : '';

    var isNameValid = nameVal.length > 0;
    var isEmailValid = emailRegex.test(emailVal);
    var isPhoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
    var isSexoValid = sexoVal === 'masculino' || sexoVal === 'feminino';
    var isPassValid = passVal.length >= 8;
    var isPassConfirmValid = passConfirmVal.length >= 8 && passConfirmVal === passVal;

    var isFormComplete =
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
    nameInput.addEventListener('input', function () {
      checkFormState();
      if (nameError && nameError.classList.contains('is-visible')) {
        nameError.classList.remove('is-visible');
        nameInput.classList.remove('has-error');
      }
    });
  }

  if (emailInput) {
    emailInput.addEventListener('input', function () {
      checkFormState();
      if (emailError && emailError.classList.contains('is-visible')) {
        emailError.classList.remove('is-visible');
        emailInput.classList.remove('has-error');
      }
    });
  }

  if (telefoneInput) {
    telefoneInput.addEventListener('input', function () {
      var formatted = formatPhone(telefoneInput.value);
      telefoneInput.value = formatted;
      checkFormState();
      if (telefoneError && telefoneError.classList.contains('is-visible')) {
        telefoneError.classList.remove('is-visible');
        telefoneInput.classList.remove('has-error');
      }
    });
  }

  if (sexoSelect) {
    sexoSelect.addEventListener('change', function () {
      checkFormState();
      if (sexoError && sexoError.classList.contains('is-visible')) {
        sexoError.classList.remove('is-visible');
        sexoSelect.classList.remove('has-error');
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
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
    passwordConfirmInput.addEventListener('input', function () {
      checkFormState();
      if (passwordConfirmError && passwordConfirmError.classList.contains('is-visible')) {
        passwordConfirmError.classList.remove('is-visible');
        passwordConfirmInput.classList.remove('has-error');
      }
    });
  }

  var form = document.getElementById('signup-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameVal = nameInput ? nameInput.value.trim() : '';
      var emailVal = emailInput ? emailInput.value.trim() : '';
      var phoneDigits = telefoneInput ? telefoneInput.value.replace(/\D/g, '') : '';
      var sexoVal = sexoSelect ? sexoSelect.value : '';
      var passVal = passwordInput ? passwordInput.value : '';
      var passConfirmVal = passwordConfirmInput ? passwordConfirmInput.value : '';
      var hasError = false;

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

      window.location.href = '/main/';
    });
  }
});
