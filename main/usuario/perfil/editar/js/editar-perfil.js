import {
  atualizarUsuarioAtual,
  carregarUsuarioAtual,
  lerSessaoUsuario
} from '../../../../../shared/api/usuario.js';

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
const currentPasswordInput = document.getElementById('senha-atual');
const newPasswordInput = document.getElementById('nova-senha');
const confirmPasswordInput = document.getElementById('confirmar-senha');
const strengthBar = document.getElementById('barra-forca-senha');
const strengthText = document.getElementById('texto-forca-senha');
const message = document.getElementById('mensagem-formulario');
const discardButton = document.getElementById('descartar-alteracoes');
const saveButton = form.querySelector('button[type="submit"]');

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
  const level = levels[Math.min(score, 5)];

  strengthBar.style.width = level.width + '%';
  strengthBar.style.backgroundColor = level.color;
  strengthText.textContent = level.label;
}

function previewPhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    message.textContent = 'Selecione um arquivo de imagem válido.';
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    avatarImage.src = reader.result;
    avatarImage.hidden = false;
    avatarFallback.hidden = true;
    message.textContent = 'Prévia da foto carregada. A foto ainda não é armazenada no banco.';
  });
  reader.addEventListener('error', () => {
    message.textContent = 'Não foi possível carregar a prévia da foto.';
  });
  reader.readAsDataURL(file);
}

function formatBirthDate(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  event.target.value = parts.join('/');
}

async function fillProfile() {
  if (!lerSessaoUsuario()) {
    window.location.href = '../../../entrar/index.html';
    return;
  }

  try {
    const user = await carregarUsuarioAtual();
    const session = lerSessaoUsuario() || {};
    nameInput.value = user.nome_usuario || '';
    emailInput.value = user.email_usuario || '';
    phoneInput.value = user.numero_usuario || '';
    birthInput.value = session.birthDate || '';
    genderSelect.value = user.genero_usuario || '';
    nameSummary.textContent = user.nome_usuario || '';
  } catch (error) {
    message.textContent = error.message;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const newPassword = newPasswordInput.value;
  if (newPassword && newPassword !== confirmPasswordInput.value) {
    confirmPasswordInput.setCustomValidity('As senhas precisam ser iguais.');
    confirmPasswordInput.reportValidity();
    return;
  }
  if (newPassword && !currentPasswordInput.value) {
    currentPasswordInput.setCustomValidity('Informe sua senha atual para alterá-la.');
    currentPasswordInput.reportValidity();
    return;
  }

  confirmPasswordInput.setCustomValidity('');
  currentPasswordInput.setCustomValidity('');

  const updates = {
    nome_usuario: nameInput.value.trim(),
    email_usuario: emailInput.value.trim(),
    numero_usuario: phoneInput.value,
    genero_usuario: genderSelect.value
  };
  if (newPassword) {
    updates.senha_atual = currentPasswordInput.value;
    updates.senha_usuario = newPassword;
  }

  saveButton.disabled = true;
  message.textContent = 'Salvando alterações...';
  try {
    const updatedUser = await atualizarUsuarioAtual(updates);
    const session = lerSessaoUsuario() || {};
    localStorage.setItem('keeperhub-auth-session', JSON.stringify({
      ...session,
      birthDate: birthInput.value.trim()
    }));
    nameSummary.textContent = updatedUser.nome_usuario;
    message.textContent = 'Perfil atualizado no banco. A data de nascimento fica salva neste dispositivo.';
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';
    currentPasswordInput.value = '';
    updatePasswordStrength();
    window.setTimeout(() => {
      window.location.href = '../index.html';
    }, 900);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
}

document.querySelectorAll('[data-alternar-senha]').forEach((button) => {
  button.addEventListener('click', () => togglePassword(button));
});
nameInput.addEventListener('input', () => {
  nameSummary.textContent = nameInput.value.trim();
});
birthInput.addEventListener('input', formatBirthDate);
newPasswordInput.addEventListener('input', updatePasswordStrength);
confirmPasswordInput.addEventListener('input', () => confirmPasswordInput.setCustomValidity(''));
currentPasswordInput.addEventListener('input', () => currentPasswordInput.setCustomValidity(''));
photoInput.addEventListener('change', previewPhoto);
form.addEventListener('submit', saveProfile);
discardButton.addEventListener('click', () => {
  form.reset();
  window.location.href = '../index.html';
});

fillProfile();
updatePasswordStrength();
