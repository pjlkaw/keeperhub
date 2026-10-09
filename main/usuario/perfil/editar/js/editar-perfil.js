/**
 * KEEPERHUB — EDIÇÃO DO PERFIL
 * Interações locais da prévia. Senhas nunca são armazenadas no navegador.
 * PROVISÓRIO: os dados demonstrativos e o salvamento em localStorage devem
 * ser substituídos pela integração com o banco de dados/backend.
 */

(function () {
  'use strict';

  const AUTH_STORAGE_KEY = 'keeperhub-auth-session';
  const FALLBACK_PROFILE = {
    name: 'Gabriel Santos',
    email: 'gabriel.santos@email.com',
    phone: '+55 (11) 98765-4321',
    birthDate: '14/08/1994',
    gender: 'masculino',
  };

  const form = document.getElementById('formulario-perfil');
  const nameInput = document.getElementById('nome-completo');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('telefone');
  const birthInput = document.getElementById('nascimento');
  const genderSelect = document.getElementById('genero');
  const nameSummary = document.getElementById('nome-resumo');
  const photoInput = document.getElementById('foto-perfil');
  const avatarImage = document.getElementById('avatar-imagem');
  const avatarFallback = document.getElementById('avatar-substituto');
  const newPasswordInput = document.getElementById('nova-senha');
  const confirmPasswordInput = document.getElementById('confirmar-senha');
  const strengthBar = document.getElementById('barra-forca-senha');
  const strengthText = document.getElementById('texto-forca-senha');
  const message = document.getElementById('mensagem-formulario');
  const discardButton = document.getElementById('descartar-alteracoes');

  function readSession() {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  function fillProfile() {
    const user = readSession() || {};
    const profile = {
      name: user.name || FALLBACK_PROFILE.name,
      email: user.email || FALLBACK_PROFILE.email,
      phone: user.phone || user.telefone || FALLBACK_PROFILE.phone,
      birthDate: user.birthDate || user.nascimento || FALLBACK_PROFILE.birthDate,
      gender: user.gender || user.sexo || FALLBACK_PROFILE.gender,
    };

    nameInput.value = profile.name;
    emailInput.value = profile.email;
    phoneInput.value = profile.phone;
    birthInput.value = profile.birthDate;
    genderSelect.value = profile.gender;
    nameSummary.textContent = profile.name;
  }

  function togglePassword(button) {
    const input = document.getElementById(button.dataset.alternarSenha);
    if (!input) return;

    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    const icon = button.querySelector('i');
    icon.className = showing ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    button.setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
  }

  function passwordScore(value) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (value.length >= 12) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^a-zA-Z0-9]/.test(value)) score += 1;
    return score;
  }

  function updatePasswordStrength() {
    const score = passwordScore(newPasswordInput.value);
    const levels = [
      { label: 'Muito fraca', width: 15, color: '#dc2626' },
      { label: 'Fraca', width: 30, color: '#e35d26' },
      { label: 'Média', width: 52, color: '#d9a400' },
      { label: 'Boa', width: 72, color: '#62a92f' },
      { label: 'Forte', width: 88, color: 'var(--edicao-texto)' },
      { label: 'Muito forte', width: 100, color: 'var(--edicao-acento)' },
    ];
    const level = levels[Math.min(score, 4)];

    strengthBar.style.width = level.width + '%';
    strengthBar.style.backgroundColor = level.color;
    strengthText.textContent = level.label;
  }

  function previewPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      avatarImage.src = reader.result;
      avatarImage.hidden = false;
      avatarFallback.hidden = true;
    });
    reader.readAsDataURL(file);
  }

  function formatBirthDate(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    event.target.value = parts.join('/');
  }

  function saveProfile(event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (newPasswordInput.value && newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity('As senhas precisam ser iguais.');
      confirmPasswordInput.reportValidity();
      return;
    }

    confirmPasswordInput.setCustomValidity('');

    const current = readSession() || {};
    const publicProfile = {
      ...current,
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      birthDate: birthInput.value.trim(),
      gender: genderSelect.value,
    };

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(publicProfile));
      message.textContent = 'Alterações salvas neste dispositivo.';
      nameSummary.textContent = publicProfile.name;
      window.setTimeout(() => {
        window.location.href = '../index.html';
      }, 450);
    } catch (error) {
      message.textContent = 'Não foi possível salvar as alterações.';
    }
  }

  document.querySelectorAll('[data-alternar-senha]').forEach((button) => {
    button.addEventListener('click', () => togglePassword(button));
  });

  nameInput.addEventListener('input', () => {
    nameSummary.textContent = nameInput.value.trim() || FALLBACK_PROFILE.name;
  });
  birthInput.addEventListener('input', formatBirthDate);
  newPasswordInput.addEventListener('input', updatePasswordStrength);
  confirmPasswordInput.addEventListener('input', () => confirmPasswordInput.setCustomValidity(''));
  photoInput.addEventListener('change', previewPhoto);
  form.addEventListener('submit', saveProfile);
  discardButton.addEventListener('click', () => {
    form.reset();
    window.location.href = '../index.html';
  });

  fillProfile();
  updatePasswordStrength();
})();
