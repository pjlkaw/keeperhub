import {
  carregarUsuarioAtual,
  salvarModulosUsuario
} from '../../../shared/services/usuario.js';

const formularioPlanos = document.querySelector('.formulario-modulos');

if (formularioPlanos) {
  const seletores = [...formularioPlanos.querySelectorAll('.seletor-modulo')];
  const periodos = [...formularioPlanos.querySelectorAll('input[name="periodo"]')];
  const valorSelecao = document.getElementById('valor-selecao');
  const textoResumo = document.getElementById('texto-resumo');
  const botaoContinuar = document.getElementById('continuar-compra');
  const avisoCompra = document.getElementById('aviso-compra');
  let estadoSessao = 'verificando';
  const formatarReais = valor => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);

  function atualizarResumo() {
    const periodo = periodos.find(opcao => opcao.checked)?.value || 'mensal';
    const selecionados = seletores.filter(seletor => seletor.checked);
    const todosSelecionados = selecionados.length === seletores.length;

    formularioPlanos.querySelectorAll('.preco-modulo').forEach(preco => {
      preco.textContent = preco.dataset[periodo === 'anual' ? 'priceAnnual' : 'priceMonthly'];
    });

    if (!selecionados.length) {
      valorSelecao.textContent = 'Selecione módulos';
      textoResumo.textContent = 'Escolha um ou mais módulos para ver o valor. Você pode começar com uma conta gratuita.';
      return;
    }

    const chavePreco = periodo === 'anual' ? 'annual' : 'monthly';
    const subtotal = selecionados.reduce((total, seletor) => total + Number(seletor.dataset[chavePreco]), 0);
    const precoPacote = periodo === 'anual' ? 299 : 29.90;
    const valor = todosSelecionados ? precoPacote : subtotal;
    const unidade = periodo === 'anual' ? '/ano' : '/mês';

    valorSelecao.textContent = `${formatarReais(valor)}${unidade}`;
    textoResumo.textContent = todosSelecionados
      ? `Pacote completo com os quatro módulos. Você economiza ${formatarReais(subtotal - precoPacote)}${unidade} em relação à soma dos planos individuais.`
      : `${selecionados.length} ${selecionados.length === 1 ? 'módulo selecionado' : 'módulos selecionados'}. Os valores exibidos são propostas para validação.`;
  }

  const verificacaoSessao = carregarUsuarioAtual()
    .then(() => {
      estadoSessao = 'autenticado';
      if (botaoContinuar) {
        botaoContinuar.textContent = 'Criar plano e liberar módulos';
      }
      if (avisoCompra) {
        avisoCompra.textContent = 'Ao confirmar, os módulos selecionados serão registrados no seu plano e liberados.';
      }
    })
    .catch((erro) => {
      if (erro.status === 401) {
        estadoSessao = 'anonimo';
        return;
      }
      estadoSessao = 'erro';
      console.error('[Compra] Não foi possível validar a sessão:', erro);
      if (botaoContinuar) botaoContinuar.disabled = true;
      if (avisoCompra) avisoCompra.textContent = 'Não foi possível validar sua sessão. Atualize a página e tente novamente.';
    });

  formularioPlanos.addEventListener('submit', async (event) => {
    event.preventDefault();
    const selecionados = seletores
      .filter((seletor) => seletor.checked)
      .map((seletor) => seletor.value);
    if (!selecionados.length) {
      event.preventDefault();
      textoResumo.textContent = 'Escolha pelo menos um módulo para continuar.';
      return;
    }
    const periodo = periodos.find((opcao) => opcao.checked)?.value || 'mensal';
    await verificacaoSessao;
    if (estadoSessao === 'autenticado') {
      event.preventDefault();
      if (botaoContinuar) {
        botaoContinuar.disabled = true;
        botaoContinuar.textContent = 'Salvando plano...';
      }
      try {
        await salvarModulosUsuario(selecionados, periodo);
        window.location.href = '../hub/index.html';
      } catch (erro) {
        console.error('[Compra] Falha ao salvar o plano:', erro);
        if (avisoCompra) avisoCompra.textContent = erro.message || 'Não foi possível salvar o plano selecionado.';
        if (botaoContinuar) {
          botaoContinuar.disabled = false;
          botaoContinuar.textContent = 'Criar plano e liberar módulos';
        }
      }
      return;
    }
    if (estadoSessao !== 'anonimo') {
      event.preventDefault();
      return;
    }

    const destino = new URL(formularioPlanos.action, window.location.href);
    destino.searchParams.set('modulos', selecionados.join(','));
    destino.searchParams.set('periodo', periodo);
    destino.searchParams.set('modo', 'compra');
    event.preventDefault();
    window.location.href = destino.toString();
  });

  formularioPlanos.addEventListener('change', atualizarResumo);
  atualizarResumo();
}
