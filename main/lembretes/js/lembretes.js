/**
 * Página inicial de Lembretes.
 * A interface começa sem dados. A integração com a API/banco será feita
 * quando o fluxo de notificações estiver definido no backend.
 */

(function () {
  'use strict';

  const listas = [];
  const modal = document.getElementById('modal-nova-lista');
  const formulario = document.getElementById('formulario-nova-lista');
  const inputNome = document.getElementById('nome-nova-lista');
  const estadoVazio = document.getElementById('estado-vazio');
  const listasUsuario = document.getElementById('listas-usuario');
  const resultadoFiltro = document.getElementById('resultado-filtro');
  const tituloFiltro = document.getElementById('titulo-filtro');
  const mensagemFiltro = document.getElementById('mensagem-filtro');
  const busca = document.getElementById('buscar-lembretes');

  function abrirModal() {
    formulario.reset();
    modal.showModal();
    inputNome.focus();
  }

  function fecharModal() {
    modal.close();
  }

  function atualizarListas() {
    listasUsuario.replaceChildren();
    estadoVazio.hidden = listas.length > 0;

    listas.forEach((lista) => {
      const item = document.createElement('li');
      const icone = document.createElement('span');
      const nome = document.createElement('strong');
      const contador = document.createElement('span');
      const seta = document.createElement('i');

      item.className = 'lista-usuario';
      icone.className = 'lista-usuario__icone';
      contador.className = 'lista-usuario__contador';
      seta.className = 'fa-solid fa-chevron-right';
      seta.setAttribute('aria-hidden', 'true');
      icone.innerHTML = '<i class="fa-solid fa-list-ul" aria-hidden="true"></i>';
      nome.textContent = lista.nome;
      contador.textContent = '0';
      item.append(icone, nome, contador, seta);
      listasUsuario.append(item);
    });
  }

  function mostrarResultado(nome) {
    tituloFiltro.textContent = nome;
    mensagemFiltro.textContent = 'Nenhum lembrete encontrado.';
    resultadoFiltro.hidden = false;
    resultadoFiltro.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  document.querySelectorAll('[id^="abrir-nova-lista"]').forEach((botao) => {
    botao.addEventListener('click', abrirModal);
  });

  document.getElementById('fechar-modal').addEventListener('click', fecharModal);
  document.getElementById('cancelar-nova-lista').addEventListener('click', fecharModal);
  document.getElementById('fechar-filtro').addEventListener('click', () => {
    resultadoFiltro.hidden = true;
  });

  document.querySelectorAll('[data-filtro]').forEach((botao) => {
    botao.addEventListener('click', () => {
      mostrarResultado(botao.querySelector('strong').textContent);
    });
  });

  busca.addEventListener('input', () => {
    const termo = busca.value.trim();
    if (!termo) {
      resultadoFiltro.hidden = true;
      return;
    }

    tituloFiltro.textContent = 'Resultado da busca';
    mensagemFiltro.textContent = 'Nenhum lembrete encontrado para “' + termo + '”.';
    resultadoFiltro.hidden = false;
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const nome = inputNome.value.trim();
    if (!nome) return;

    listas.push({ id: Date.now(), nome });
    atualizarListas();
    fecharModal();
  });
})();
