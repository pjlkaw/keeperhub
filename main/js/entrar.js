/**
 * ==================================================
 * KEEPERHUB — AUTENTICAÇÃO / LOGIN
 * Padrão Arquitetural: /main/js/entrar.js
 * Responsabilidade: Interações, validações e fluxo de login da página /entrar/
 * ==================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var submitBtn = document.getElementById('btn-submit-login');
  var emailError = document.getElementById('email-error');
  var passwordError = document.getElementById('password-error');
  var togglePasswordBtn = document.getElementById('btn-toggle-password');
  var iconEyeOpen = togglePasswordBtn ? togglePasswordBtn.querySelector('.icon-eye-open') : null;
  var iconEyeClosed = togglePasswordBtn ? togglePasswordBtn.querySelector('.icon-eye-closed') : null;

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', function () {
      var isPassword = passwordInput.getAttribute('type') === 'password';
      var newType = isPassword ? 'text' : 'password';
      passwordInput.setAttribute('type', newType);

      var label = isPassword ? 'Ocultar senha' : 'Mostrar senha';
      togglePasswordBtn.setAttribute('aria-label', label);
      togglePasswordBtn.setAttribute('title', label);

      if (iconEyeOpen && iconEyeClosed) {
        iconEyeOpen.style.display = isPassword ? 'none' : 'block';
        iconEyeClosed.style.display = isPassword ? 'block' : 'none';
      }
    });
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkFormState() {
    var emailVal = emailInput ? emailInput.value.trim() : '';
    var passVal = passwordInput ? passwordInput.value : '';
    var isEmailValid = emailRegex.test(emailVal);
    var isPassValid = passVal.length >= 6;

    if (submitBtn) {
      submitBtn.disabled = !(isEmailValid && isPassValid);
    }
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

  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      checkFormState();
      if (passwordError && passwordError.classList.contains('is-visible')) {
        passwordError.classList.remove('is-visible');
        passwordInput.classList.remove('has-error');
      }
    });
  }

  var form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var emailVal = emailInput ? emailInput.value.trim() : '';
      var passVal = passwordInput ? passwordInput.value : '';
      var hasError = false;

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

      window.location.href = '/main/';
    });
  }
});
