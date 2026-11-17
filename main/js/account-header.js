import { carregarUsuarioAtual, lerSessaoUsuario, ativarTesteGratis } from '../../shared/services/usuario.js';

// Botão "Criar" do topo: para quem já está logado ele deixa de oferecer o cadastro.
// Na página de compra leva para a área do usuário; nas demais, para a escolha de módulos.
const botaoCriar = document.querySelector('#btn-header-cta, .acesso a.botao-criar, a.botao-criar[href*="criar-conta"]');
const botaoCriarOriginal = botaoCriar
  ? { texto: botaoCriar.textContent, href: botaoCriar.getAttribute('href') }
  : null;

function mostrarBotaoLogado() {
  if (!botaoCriar) return;
  const naCompra = window.location.pathname.startsWith('/main/compra/');
  botaoCriar.textContent = naCompra ? 'Minha área' : 'Escolher módulos';
  botaoCriar.href = naCompra ? '/main/hub/index.html' : '/main/compra/index.html';
}

function mostrarBotaoAnonimo() {
  if (!botaoCriar || !botaoCriarOriginal) return;
  botaoCriar.textContent = botaoCriarOriginal.texto;
  botaoCriar.setAttribute('href', botaoCriarOriginal.href);
}

// Usa a sessão guardada para trocar o botão já no carregamento (sem piscar "Criar")
// e confirma com o servidor logo depois.
if (lerSessaoUsuario()) mostrarBotaoLogado();

let estadoSessao = 'verificando';
const sessaoConfirmada = carregarUsuarioAtual()
  .then(() => {
    estadoSessao = 'autenticado';
    mostrarBotaoLogado();
  })
  .catch((erro) => {
    estadoSessao = erro.status === 401 ? 'anonimo' : 'erro';
    if (estadoSessao === 'anonimo') mostrarBotaoAnonimo();
  });

// "Experimentar por 30 dias": sem conta leva ao cadastro; logado ativa o teste e abre a área do usuário.
document.querySelectorAll('a[href*="modo=teste"]').forEach((link) => {
  link.addEventListener('click', async (evento) => {
    evento.preventDefault();
    await sessaoConfirmada;
    if (estadoSessao === 'anonimo') {
      window.location.href = link.href;
      return;
    }
    if (estadoSessao !== 'autenticado') {
      window.alert('Não foi possível validar sua sessão. Atualize a página e tente novamente.');
      return;
    }
    try {
      await ativarTesteGratis();
      window.location.href = '/main/hub/index.html';
    } catch (erro) {
      window.alert(erro.message || 'Não foi possível ativar o teste grátis.');
    }
  });
});

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
