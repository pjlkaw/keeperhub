const LIMITE_REGISTROS_CONTEXTO = 20;
const LIMITE_TRANSACOES_RECENTES = 12;

function valorNumerico(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function arredondarMoeda(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function mesAtualEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const ano = partes.find((parte) => parte.type === 'year')?.value;
  const mes = partes.find((parte) => parte.type === 'month')?.value;
  return `${ano}-${mes}`;
}

export function detectarModulosDaMensagem(mensagem) {
  const texto = String(mensagem || '');
  const modulos = [];

  if (/\b(finanças?|financeir[oa]s?|saldo|dinheiro|gastos?|gastei|despesas?|orçamento|faturas?|boletos?|transações?|lançamentos?|contas?\s+bancárias?)\b/i.test(texto)) {
    modulos.push('financas');
  }
  if (/\b(despensa|alimentos?|comidas?|estoque|lista de compras|validade|vencendo)\b/i.test(texto)) {
    modulos.push('despensa');
  }
  if (/\b(pets?|animais?|cachorros?|cadelas?|gatos?|gatas?)\b/i.test(texto)) {
    modulos.push('pets');
  }
  if (/\b(medicamentos?|rem[eé]dios?|medica[cç][aã]o|doses?|tratamentos?)\b/i.test(texto)) {
    modulos.push('medicamentos');
  }

  return modulos;
}

export function dadosPetsParaContexto(pets) {
  const animais = (Array.isArray(pets) ? pets : []).slice(0, LIMITE_REGISTROS_CONTEXTO)
    .map((pet) => ({
      nome: pet.nome,
      especie: pet.especie,
      raca: pet.raca,
      genero: pet.genero,
      dataNascimento: pet.dataNascimento,
      peso: pet.peso,
    }));

  return {
    animais,
    totalDeAnimais: Array.isArray(pets) ? pets.length : 0,
    listaLimitada: Array.isArray(pets) && pets.length > LIMITE_REGISTROS_CONTEXTO,
  };
}

export function dadosMedicamentosParaContexto(medicamentos) {
  const itens = Array.isArray(medicamentos) ? medicamentos : [];
  return {
    medicamentos: itens.slice(0, LIMITE_REGISTROS_CONTEXTO).map((medicamento) => ({
      nome: medicamento.nome,
      unidade: medicamento.unidade,
      tipoUso: medicamento.tipoUso,
      status: medicamento.status,
      dose: medicamento.dose,
      frequencia: medicamento.frequencia,
      intervaloHoras: medicamento.intervaloHoras,
      dataInicio: medicamento.dataInicio,
      dataFim: medicamento.dataFim,
      dias: medicamento.dias,
      horarios: medicamento.horarios,
      quantidade: medicamento.quantidade,
      estoqueCadastrado: medicamento.estoqueCadastrado,
      validade: medicamento.validade,
    })),
    totalDeMedicamentos: itens.length,
    listaLimitada: itens.length > LIMITE_REGISTROS_CONTEXTO,
  };
}

export function dadosFinancasParaContexto(contas, transacoes, mesReferencia = mesAtualEmSaoPaulo()) {
  const contasUsuario = Array.isArray(contas) ? contas : [];
  const lancamentos = Array.isArray(transacoes) ? transacoes : [];
  const lancamentosDoMes = lancamentos.filter((lancamento) =>
    typeof lancamento.data === 'string' && lancamento.data.startsWith(mesReferencia));
  const receitas = lancamentosDoMes
    .filter((lancamento) => lancamento.tipo === 'receita')
    .reduce((total, lancamento) => total + valorNumerico(lancamento.valor), 0);
  const despesas = lancamentosDoMes
    .filter((lancamento) => lancamento.tipo === 'despesa')
    .reduce((total, lancamento) => total + valorNumerico(lancamento.valor), 0);
  const pendentes = lancamentos.filter((lancamento) => lancamento.status === 'pending');

  return {
    moeda: 'BRL',
    mesReferencia,
    contas: contasUsuario.slice(0, LIMITE_REGISTROS_CONTEXTO).map((conta) => ({
      nome: conta.nome,
      tipo: conta.tipo,
      saldoAtual: arredondarMoeda(valorNumerico(conta.saldo_atual)),
    })),
    resumoDoMes: {
      receitas: arredondarMoeda(receitas),
      despesas: arredondarMoeda(despesas),
      saldo: arredondarMoeda(receitas - despesas),
    },
    pendencias: {
      quantidade: pendentes.length,
      total: arredondarMoeda(pendentes.reduce((total, lancamento) =>
        total + valorNumerico(lancamento.valor), 0)),
    },
    transacoesRecentes: lancamentos.slice(0, LIMITE_TRANSACOES_RECENTES).map((lancamento) => ({
      tipo: lancamento.tipo,
      valor: arredondarMoeda(valorNumerico(lancamento.valor)),
      descricao: typeof lancamento.descricao === 'string' ? lancamento.descricao.trim().slice(0, 100) : '',
      categoria: lancamento.categoria || '',
      data: lancamento.data,
      vencimento: lancamento.vencimento || '',
      status: lancamento.status,
    })),
    totalDeTransacoes: lancamentos.length,
    transacoesRecentesLimitadas: lancamentos.length > LIMITE_TRANSACOES_RECENTES,
  };
}

export function dadosDespensaParaContexto(produtos, itens) {
  const produtosUsuario = Array.isArray(produtos) ? produtos : [];
  const itensPendentes = (Array.isArray(itens) ? itens : []).filter((item) => !item.comprado);

  return {
    estoque: produtosUsuario.slice(0, LIMITE_REGISTROS_CONTEXTO).map((produto) => ({
      nome: produto.nome,
      categoria: produto.categoria,
      quantidade: valorNumerico(produto.quantidade),
      validade: produto.validade || '',
    })),
    totalDeProdutos: produtosUsuario.length,
    estoqueLimitado: produtosUsuario.length > LIMITE_REGISTROS_CONTEXTO,
    itensPendentes: itensPendentes.slice(0, LIMITE_REGISTROS_CONTEXTO).map((item) => ({
      nome: item.nome,
      quantidade: valorNumerico(item.quantidade),
      categoria: item.categoria,
    })),
    totalDeItensPendentes: itensPendentes.length,
    listaLimitada: itensPendentes.length > LIMITE_REGISTROS_CONTEXTO,
  };
}
