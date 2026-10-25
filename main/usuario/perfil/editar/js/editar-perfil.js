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
const MAX_PHOTO_SIZE = 15 * 1024 * 1024;
// A foto vai em JSON como Base64; manter o resultado abaixo de 2.5 MB deixa
// margem para a expansao Base64 dentro do limite de requisicao da Vercel.
const MAX_COMPRESSED_PHOTO_SIZE = 2.5 * 1024 * 1024;
const MAX_PHOTO_DIMENSION = 1800;
const MAX_SOURCE_DIMENSION = 6000;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
let photoData = '';
let isProcessingPhoto = false;

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
  const saveButton = form.querySelector('.botao-salvar');
  const saveButtonText = saveButton?.querySelector('.botao-salvar__texto');
  let isSaving = false;

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

  function lerComoDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), { once: true });
      reader.addEventListener('error', () => reject(new Error('Não foi possível ler a imagem.')), { once: true });
      reader.readAsDataURL(blob);
    });
  }

  async function prepararFoto(file) {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width > MAX_SOURCE_DIMENSION || bitmap.height > MAX_SOURCE_DIMENSION) {
        throw new Error('A foto nao pode ultrapassar 6000x6000 pixels.');
      }
      const escala = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));
      const contexto = canvas.getContext('2d');
      if (!contexto) throw new Error('Não foi possível preparar a imagem.');
      contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
      if (!blob) throw new Error('Este navegador não conseguiu comprimir a imagem.');
      if (blob.size > MAX_COMPRESSED_PHOTO_SIZE) {
        throw new Error('A imagem continua muito grande após a compressão. Escolha outra foto.');
      }
      return await lerComoDataUrl(blob);
    } finally {
      bitmap.close?.();
    }
  }

  async function previewPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      event.target.value = '';
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
      photoData = '';
      alertShared('Escolha uma imagem JPG, PNG ou WebP.');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      event.target.value = '';
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
      photoData = '';
      alertShared('A imagem original deve ter no máximo 15 MB.');
      return;
    }

    isProcessingPhoto = true;
    if (saveButton) saveButton.disabled = true;
    message.textContent = 'Preparando imagem...';
    try {
      photoData = await prepararFoto(file);
      avatarImage.src = photoData;
      avatarImage.hidden = false;
      avatarFallback.hidden = true;
      message.textContent = 'Imagem pronta para salvar.';
    } catch (error) {
      photoData = '';
      event.target.value = '';
      avatarImage.hidden = true;
      avatarFallback.hidden = false;
      message.textContent = error.message || 'Não foi possível preparar a imagem.';
    } finally {
      isProcessingPhoto = false;
      if (saveButton) saveButton.disabled = false;
    }
  }

  function formatBirthDate(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
    event.target.value = parts.join('/');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (isSaving || isProcessingPhoto) return;

    if (!form.reportValidity()) return;

    if (newPasswordInput.value && newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.setCustomValidity('As senhas precisam ser iguais.');
      confirmPasswordInput.reportValidity();
      return;
    }

    confirmPasswordInput.setCustomValidity('');
    isSaving = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.setAttribute('aria-busy', 'true');
    }
    if (saveButtonText) saveButtonText.textContent = 'Salvando...';

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
      if (saveButtonText) saveButtonText.textContent = 'Salvo!';
      nameSummary.textContent = nameInput.value.trim();
      window.setTimeout(() => {
        window.location.href = '../index.html';
      }, 450);
    } catch (error) {
      message.textContent = error.message || 'Não foi possível salvar as alterações.';
      isSaving = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.removeAttribute('aria-busy');
      }
      if (saveButtonText) saveButtonText.textContent = 'Salvar alterações';
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
    if (error.status === 401) {
      window.location.replace('../../../entrar/index.html');
      return;
    }
    message.textContent = error.message || 'Não foi possível carregar o perfil.';
  });
  updatePasswordStrength();
