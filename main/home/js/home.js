/**
 * ==================================================
 * KEEPERHUB — HOME SCRIPT
 * Padrão Arquitetural Oficial: /main/home/js/home.js
 * Responsabilidade: Comportamento exclusivo da página Home
 * ==================================================
 */

function prepararFormularioTeste() {
  const formulario = document.querySelector('.formulario-teste');
  const campoEmail = document.getElementById('trial-email');
  const mensagemErro = document.getElementById('erro-email-teste');
  if (!formulario || !campoEmail || !mensagemErro) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  formulario.addEventListener('submit', (evento) => {
    if (usuarioAutenticadoNaHome) return;
    const email = campoEmail.value.trim();
    if (!email || !emailRegex.test(email)) {
      evento.preventDefault();
      mensagemErro.classList.add('is-visible');
      campoEmail.classList.add('has-error');
      campoEmail.setAttribute('aria-invalid', 'true');
      campoEmail.focus();
      return;
    }
    campoEmail.value = email;
  });

  campoEmail.addEventListener('input', () => {
    if (mensagemErro.classList.contains('is-visible')) {
      mensagemErro.classList.remove('is-visible');
      campoEmail.classList.remove('has-error');
      campoEmail.setAttribute('aria-invalid', 'false');
    }
  });

  // Mantém a validação nativa quando o JavaScript não está disponível.
  formulario.noValidate = true;
}

function setupHomeInteractions() {
  prepararFormularioTeste();
  const themeToggle = document.getElementById('theme-toggle');
  const headerCta = document.getElementById('btn-header-cta');

  let estadoConta = 'verificando';
  const verificacaoConta = carregarUsuarioAtual()
    .then(() => {
      estadoConta = 'autenticado';
      usuarioAutenticadoNaHome = true;
      const campoEmail = document.getElementById('trial-email');
      if (campoEmail) campoEmail.required = false;
      if (!headerCta) return;
      headerCta.textContent = 'Escolher módulos';
      headerCta.href = '../compra/index.html';
    })
    .catch((erro) => {
      estadoConta = erro.status === 401 ? 'anonimo' : 'erro';
      if (erro.status !== 401) console.error('[Home] Não foi possível validar a sessão:', erro);
    });

  const ativarTeste = async (evento) => {
    evento.preventDefault();
    const origem = evento.currentTarget;
    await verificacaoConta;
    if (estadoConta === 'anonimo') {
      if (origem instanceof HTMLFormElement) {
        if (!origem.reportValidity()) return;
        const destino = new URL(origem.action, window.location.href);
        new FormData(origem).forEach((valor, chave) => destino.searchParams.set(chave, String(valor)));
        window.location.href = destino.toString();
      } else {
        window.location.href = origem.href;
      }
      return;
    }
    if (estadoConta !== 'autenticado') {
      window.alert('Não foi possível validar sua sessão. Atualize a página e tente novamente.');
      return;
    }
    try {
      await ativarTesteGratis();
      window.location.href = '../hub/index.html';
    } catch (erro) {
      window.alert(erro.message || 'Não foi possível ativar o teste grátis.');
    }
  };
  document.querySelector('.formulario-teste')?.addEventListener('submit', ativarTeste);
  document.querySelectorAll('a[href*="modo=teste"]').forEach((link) => {
    link.addEventListener('click', ativarTeste);
  });

  function atualizarBotaoTema() {
    if (!themeToggle) return;
    const temaClaro = document.documentElement.getAttribute('data-theme') === 'light';
    const descricao = temaClaro ? 'Ativar tema escuro' : 'Ativar tema claro';
    themeToggle.setAttribute('aria-label', descricao);
    themeToggle.setAttribute('title', descricao);
    themeToggle.setAttribute('aria-pressed', String(temaClaro));
  }

  atualizarBotaoTema();
  new MutationObserver(atualizarBotaoTema).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  // Prevenção de navegação para links nulos ou âncoras placeholder
  const placeholderLinks = document.querySelectorAll('a[href="#"], a[href=""]');
  placeholderLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupHomeInteractions);
} else {
  setupHomeInteractions();
}

import { carregarUsuarioAtual, ativarTesteGratis } from '../../../shared/services/usuario.js';

let usuarioAutenticadoNaHome = false;

