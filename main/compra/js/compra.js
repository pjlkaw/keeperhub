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
  let usuarioConectado = false;
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
      usuarioConectado = true;
      if (botaoContinuar) botaoContinuar.textContent = 'Ativar módulos selecionados';
    })
    .catch((erro) => {
      if (erro.status !== 401) console.error('[Compra] Não foi possível validar a sessão:', erro);
    });

  formularioPlanos.addEventListener('submit', async (event) => {
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
    if (usuarioConectado) {
      event.preventDefault();
      if (botaoContinuar) {
        botaoContinuar.disabled = true;
        botaoContinuar.textContent = 'Salvando seleção...';
      }
      try {
        await salvarModulosUsuario(selecionados, periodo);
        window.location.href = '../home/index.html';
      } catch (erro) {
        console.error('[Compra] Falha ao salvar módulos:', erro);
        textoResumo.textContent = erro.message || 'Não foi possível salvar os módulos selecionados.';
        if (botaoContinuar) {
          botaoContinuar.disabled = false;
          botaoContinuar.textContent = 'Ativar módulos selecionados';
        }
      }
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
