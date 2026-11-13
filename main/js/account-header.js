import { carregarUsuarioAtual } from '../../shared/services/usuario.js';

const linkConta = document.getElementById('btn-header-login');

if (linkConta) {
  const destinoEntrar = linkConta.getAttribute('href');
  let verificacaoConcluida = false;

  linkConta.setAttribute('aria-label', 'Entrar na sua conta');
  linkConta.setAttribute('title', 'Entrar na sua conta');
  linkConta.querySelector('i')?.setAttribute('aria-hidden', 'true');

  const verificacaoSessao = carregarUsuarioAtual()
    .then(() => {
      linkConta.href = '/main/usuario/perfil/index.html';
      linkConta.classList.add('is-account-link');
      linkConta.setAttribute('aria-label', 'Acessar meu perfil e editar minha conta');
      linkConta.setAttribute('title', 'Acessar meu perfil');

      const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icone.setAttribute('viewBox', '0 0 24 24');
      icone.setAttribute('aria-hidden', 'true');
      icone.setAttribute('focusable', 'false');

      const cabeca = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cabeca.setAttribute('cx', '12');
      cabeca.setAttribute('cy', '8');
      cabeca.setAttribute('r', '3.5');

      const corpo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      corpo.setAttribute('d', 'M5.5 20a6.5 6.5 0 0 1 13 0');
      icone.append(cabeca, corpo);
      linkConta.replaceChildren(icone);
    })
    .catch((erro) => {
      if (erro.status !== 401) {
        console.error('[Cabeçalho] Não foi possível validar a sessão:', erro);
      }
      if (destinoEntrar) linkConta.setAttribute('href', destinoEntrar);
    })
    .finally(() => {
      verificacaoConcluida = true;
    });

  linkConta.addEventListener('click', async (evento) => {
    if (verificacaoConcluida) return;
    evento.preventDefault();
    await verificacaoSessao;
    window.location.assign(linkConta.href);
  });
}
