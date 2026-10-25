/**
 * KEEPERHUB — EDIÇÃO DO PERFIL
 * Carrega e salva os dados do usuário pela API.
 */

import { atualizarUsuarioAtual, carregarUsuarioAtual } from '../../../../../shared/api/usuario.js';
import { alertShared } from '../../../../../shared/services/interface.js';

const FALLBACK_PROFILE = {
  name: '',
  birthDate: '',
};
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
let photoData = '';

const form = document.getElementById('formulario-perfil');
  const nameInput = document.getElementById('nome-completo');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('telefone');
  const birthInput = document.getElementById('nascimento');
  const genderSelect = document.getElementById('genero');
  const nameSummary = document.getElementById('nome-resumo');
  const photoInput = document.getElementById('foto-perfil');
  const avatarImage = document.getElementById('avatar-imagem');
  const avatarFallback = document.getElementById('userIcon');
  const newPasswordInput = document.getElementById('nova-senha');
  const confirmPasswordInput = document.getElementById('confirmar-senha');
  const strengthBar = document.getElementById('barra-forca-senha');
  const strengthText = document.getElementById('texto-forca-senha');
  const message = document.getElementById('mensagem-formulario');
  const discardButton = document.getElementById('descartar-alteracoes');

async function fillProfile() {
    const user = await carregarUsuarioAtual();
    const profile = {
      name: user.nome_usuario,
      email: user.email_usuario,
      phone: user.numero_usuario || '',
      birthDate: FALLBACK_PROFILE.birthDate,
      gender: user.genero_usuario,
    };

    nameInput.value = profile.name;
    emailInput.value = profile.email;
    phoneInput.value = profile.phone;
    birthInput.value = profile.birthDate;
    genderSelect.value = profile.gender;
    nameSummary.textContent = profile.name;
    if (user.foto_usuario) {
      avatarImage.src = user.foto_usuario;
      avatarImage.hidden = false;
      avatarFallback.hidden = true;
    }
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
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      event.target.value = '';
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
      alertShared('Escolha uma imagem JPG, PNG ou WebP.');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      event.target.value = '';
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
     alertShared('A imagem deve ter no máximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      photoData = reader.result;
      avatarImage.src = reader.result;
      avatarImage.hidden = false;
      avatarFallback.hidden = true;
      message.textContent = 'Imagem carregada';
    });
    reader.readAsDataURL(file);
  }

  function formatBirthDate(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    event.target.value = parts.join('/');
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (newPasswordInput.value && newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity('As senhas precisam ser iguais.');
      confirmPasswordInput.reportValidity();
      return;
    }

    confirmPasswordInput.setCustomValidity('');

    try {
      await atualizarUsuarioAtual({
        nome_usuario: nameInput.value.trim(),
        email_usuario: emailInput.value.trim(),
        numero_usuario: phoneInput.value.trim(),
        genero_usuario: genderSelect.value,
        ...(photoData ? { foto_usuario: photoData } : {}),
        ...(newPasswordInput.value
          ? {
              senha_atual: document.getElementById('senha-atual').value,
              senha_usuario: newPasswordInput.value,
            }
          : {}),
      });
      message.textContent = 'Alterações salvas.';
      nameSummary.textContent = nameInput.value.trim();
      window.setTimeout(() => {
        window.location.href = '../index.html';
      }, 450);
    } catch (error) {
      message.textContent = error.message || 'Não foi possível salvar as alterações.';
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

  fillProfile().catch((error) => {
    message.textContent = error.message || 'Não foi possível carregar o perfil.';
  });
  updatePasswordStrength();
