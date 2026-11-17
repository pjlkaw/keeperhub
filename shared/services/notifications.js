/**
 * Página de notificações.
 * Busca os avisos calculados no servidor (api/usuario?recurso=notificacoes) a partir dos
 * dados de Pets, Medicamentos, Finanças e Despensa, e permite marcar cada aviso como
 * visto ou concluído (com "Desfazer" por alguns segundos).
 */

(function () {
  'use strict';

  const URL_API = '/api/usuario?recurso=notificacoes';
  const TEMPO_DESFAZER = 4000;
  const FAIXAS = [
    ['atrasado', 'Atrasado'],
    ['hoje', 'Hoje'],
    ['proximos', 'Próximos 7 dias'],
  ];
  const NOMES = { pets: 'Pets', medicamentos: 'Medicamentos', financas: 'Finanças', despensa: 'Despensa', todos: 'Todos os avisos' };
  const LOGOS = {
    pets: '/shared/img/logo-pets-branco.png',
    medicamentos: '/shared/img/logo-medicamentos-branco.png',
    financas: '/shared/img/logo-financas-branco.png',
    despensa: '/shared/img/logo-despensa-branco.png',
  };

  const lista = document.getElementById('avisos-lista');
  const estado = document.getElementById('avisos-estado');
  const titulo = document.getElementById('titulo-avisos');
  const busca = document.getElementById('buscar-lembretes');
  const cartoes = [...document.querySelectorAll('.cartao-categoria[data-modulo]')];
  const toast = document.getElementById('aviso-desfazer');
  const toastTexto = document.getElementById('aviso-desfazer-texto');
  const toastBotao = document.getElementById('aviso-desfazer-botao');

  let avisos = [];
  let modulosLiberados = [];
  let filtro = 'todos';
  let pendente = null; // { aviso, indice, timer }

  async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opcoes,
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      const erro = new Error(corpo.erro || 'Não foi possível carregar os avisos agora.');
      erro.status = resposta.status;
      throw erro;
    }
    return corpo;
  }

  function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function avisosVisiveis() {
    const termo = normalizar(busca.value.trim());
    return avisos.filter((aviso) =>
      (filtro === 'todos' || aviso.modulo === filtro) &&
      (!termo || normalizar(`${aviso.titulo} ${aviso.detalhe}`).includes(termo)));
  }

  function atualizarCartoes() {
    for (const cartao of cartoes) {
      const modulo = cartao.dataset.modulo;
      const liberado = modulo === 'todos' || modulosLiberados.includes(modulo);
      cartao.hidden = !liberado;
      cartao.setAttribute('aria-pressed', String(modulo === filtro));
      cartao.classList.toggle('cartao-categoria--ativo', modulo === filtro);
      const contador = cartao.querySelector('[data-contador]');
      if (contador) {
        contador.textContent = String(modulo === 'todos'
          ? avisos.length
          : avisos.filter((aviso) => aviso.modulo === modulo).length);
      }
    }
  }

  function criarItem(aviso) {
    const item = document.createElement('li');
    item.className = `aviso aviso--${aviso.modulo}`;

    const icone = document.createElement('span');
    icone.className = 'aviso__icone';
    icone.setAttribute('aria-hidden', 'true');
    const logo = document.createElement('img');
    logo.src = LOGOS[aviso.modulo] || '';
    logo.alt = '';
    logo.width = 20;
    logo.height = 20;
    icone.append(logo);

    const link = document.createElement('a');
    link.className = 'aviso__texto';
    link.href = aviso.link || '#';
    const tituloAviso = document.createElement('strong');
    tituloAviso.textContent = aviso.titulo;
    const detalhe = document.createElement('span');
    detalhe.textContent = aviso.hora ? `${aviso.hora} · ${aviso.detalhe}` : aviso.detalhe;
    const modulo = document.createElement('small');
    modulo.textContent = NOMES[aviso.modulo] || '';
    link.append(tituloAviso, detalhe, modulo);

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'aviso__acao';
    const concluido = aviso.acao === 'concluido';
    botao.innerHTML = concluido
      ? '<i class="fa-solid fa-check" aria-hidden="true"></i><span>Concluído</span>'
      : '<i class="fa-regular fa-eye" aria-hidden="true"></i><span>Visto</span>';
    botao.setAttribute('aria-label', `${concluido ? 'Marcar como concluído' : 'Marcar como visto'}: ${aviso.titulo}`);
    botao.addEventListener('click', () => marcar(aviso));

    item.append(icone, link, botao);
    return item;
  }

  function renderizar() {
    atualizarCartoes();
    titulo.textContent = NOMES[filtro] || NOMES.todos;
    const visiveis = avisosVisiveis();
    lista.replaceChildren();

    if (!visiveis.length) {
      estado.textContent = busca.value.trim()
        ? `Nenhum aviso encontrado para “${busca.value.trim()}”.`
        : 'Nenhum aviso por aqui. Está tudo em dia!';
      estado.hidden = false;
      return;
    }
    estado.hidden = true;

    for (const [faixa, nome] of FAIXAS) {
      const daFaixa = visiveis.filter((aviso) => aviso.faixa === faixa);
      if (!daFaixa.length) continue;
      const grupo = document.createElement('section');
      grupo.className = `avisos__grupo avisos__grupo--${faixa}`;
      const cabecalho = document.createElement('h3');
      cabecalho.textContent = `${nome} (${daFaixa.length})`;
      const itens = document.createElement('ul');
      itens.append(...daFaixa.map(criarItem));
      grupo.append(cabecalho, itens);
      lista.append(grupo);
    }
  }

  function esconderToast() {
    toast.hidden = true;
  }

  // Confirma no servidor a marcação anterior antes de começar outra.
  function finalizarPendente() {
    if (!pendente) return;
    window.clearTimeout(pendente.timer);
    pendente = null;
    esconderToast();
  }

  async function marcar(aviso) {
    finalizarPendente();
    const indice = avisos.indexOf(aviso);
    if (indice === -1) return;
    avisos.splice(indice, 1);
    renderizar();

    try {
      await requisicao(`${URL_API}&acao=marcar`, {
        method: 'PUT',
        body: JSON.stringify({ chave: aviso.chave, acao: aviso.acao === 'concluido' ? 'concluida' : 'vista' }),
      });
    } catch (erro) {
      avisos.splice(indice, 0, aviso);
      renderizar();
      mostrarMensagem(erro.message || 'Não foi possível marcar o aviso.');
      return;
    }

    toastTexto.textContent = aviso.acao === 'concluido' ? 'Marcado como concluído.' : 'Marcado como visto.';
    toastBotao.hidden = false;
    toast.hidden = false;
    pendente = { aviso, indice, timer: window.setTimeout(finalizarPendente, TEMPO_DESFAZER) };
  }

  async function desfazer() {
    if (!pendente) return;
    const { aviso, indice } = pendente;
    finalizarPendente();
    try {
      await requisicao(`${URL_API}&acao=desfazer`, { method: 'PUT', body: JSON.stringify({ chave: aviso.chave }) });
      avisos.splice(Math.min(indice, avisos.length), 0, aviso);
      renderizar();
    } catch (erro) {
      mostrarMensagem(erro.message || 'Não foi possível desfazer.');
    }
  }

  function mostrarMensagem(texto) {
    toastTexto.textContent = texto;
    toastBotao.hidden = true;
    toast.hidden = false;
    window.setTimeout(esconderToast, TEMPO_DESFAZER);
  }

  function escolherFiltro(modulo) {
    filtro = modulo === 'todos' || modulosLiberados.includes(modulo) ? modulo : 'todos';
    const url = new URL(window.location.href);
    if (filtro === 'todos') url.searchParams.delete('modulo');
    else url.searchParams.set('modulo', filtro);
    window.history.replaceState(null, '', url);
    renderizar();
  }

  async function carregar() {
    estado.textContent = 'Carregando avisos...';
    estado.hidden = false;
    try {
      const resposta = await requisicao(URL_API);
      avisos = Array.isArray(resposta.avisos) ? resposta.avisos : [];
      modulosLiberados = Array.isArray(resposta.modulos) ? resposta.modulos : [];
      const pedido = (new URLSearchParams(window.location.search).get('modulo') || '').toLowerCase();
      filtro = modulosLiberados.includes(pedido) ? pedido : 'todos';
      renderizar();
    } catch (erro) {
      lista.replaceChildren();
      cartoes.forEach((cartao) => { cartao.hidden = cartao.dataset.modulo !== 'todos'; });
      estado.textContent = erro.status === 401
        ? 'Entre na sua conta para ver seus avisos.'
        : erro.message;
      estado.hidden = false;
    }
  }

  // O botão voltar do header volta para a tela anterior do próprio KeeperHub
  // (ex.: o módulo de onde a pessoa tocou no sino). Sem tela anterior, vai para o Hub.
  function voltarParaTelaAnterior(evento) {
    const botao = evento.target.closest('#btn-back-header');
    if (!botao) return;
    let anterior = null;
    try {
      anterior = document.referrer ? new URL(document.referrer) : null;
    } catch {
      anterior = null;
    }
    const mesmaOrigem = anterior && anterior.origin === window.location.origin &&
      anterior.pathname !== window.location.pathname;
    if (mesmaOrigem && window.history.length > 1) {
      evento.preventDefault();
      window.history.back();
    }
  }

  document.addEventListener('click', voltarParaTelaAnterior);
  cartoes.forEach((cartao) => {
    cartao.addEventListener('click', () => escolherFiltro(cartao.dataset.modulo));
  });
  busca.addEventListener('input', renderizar);
  busca.form?.addEventListener('submit', (evento) => evento.preventDefault());
  toastBotao.addEventListener('click', desfazer);

  carregar();
})();
