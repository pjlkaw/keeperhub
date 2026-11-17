import { enviarMensagem } from '../shared/services/groq.js';
import { dadosTransacao } from './modulos/financas-api.js';
import { validarProduto, validarItemLista, CATEGORIAS } from './modulos/despensa-api.js';
import { validarDadosMedicamento } from './modulos/medicamentos-api.js';
import { validarPet } from './modulos/pets-api.js';
import { origemDaRequisicaoValida, usuarioDaSessao } from '../server/auth-session.js';
import { listarAcessosUsuario } from '../server/repositories/modulos.js';
import { criarPet, listarPets } from '../server/repositories/pets/animais.js';
import { criarMedicamento, listarMedicamentos } from '../server/repositories/medicamentos/medicamentos.js';
import { criarConta, listarContas, normalizarTipoConta } from '../server/repositories/financas/contas.js';
import { criarTransacao, listarTransacoes } from '../server/repositories/financas/transacoes.js';
import { criarProduto, listarProdutos } from '../server/repositories/despensa/produtos.js';
import { adicionarItem, listarItensDaListaAberta } from '../server/repositories/despensa/checklist.js';
import {
  dadosDespensaParaContexto,
  dadosFinancasParaContexto,
  dadosMedicamentosParaContexto,
  dadosPetsParaContexto,
  detectarModulosDaMensagem,
} from '../server/services/keeper-context.js';

const LIMITE_MENSAGENS_HISTORICO = 8;
const LIMITE_CARACTERES_HISTORICO = 2000;
const CAMPOS_PET = [
  { chave: 'nome', limite: 60, pergunta: 'Qual é o nome do pet?' },
  {
    chave: 'especie',
    limite: 30,
    pergunta: 'Qual é o tipo de animal? Pode responder cachorro, gato, pássaro, cavalo, réptil, pequeno mamífero, peixe, animal de fazenda, anfíbio ou exótico.',
  },
  { chave: 'raca', limite: 80, pergunta: 'Qual é a raça? Se não souber, escreva SRD.' },
  {
    chave: 'dataNascimento',
    limite: 10,
    pergunta: 'Qual é a data de nascimento? Use DD/MM/AAAA.',
  },
  { chave: 'peso', limite: 20, pergunta: 'Qual é o peso em quilogramas? Pode usar vírgula ou ponto.' },
  { chave: 'genero', limite: 10, pergunta: 'O pet é macho ou fêmea?' },
];

const CAMPOS_CADASTRO = {
  pet: CAMPOS_PET,
  transacao: [
    { chave: 'tipo', limite: 10, pergunta: 'É uma receita ou uma despesa?' },
    { chave: 'valor', limite: 20, pergunta: 'Qual é o valor? Ex.: R$ 1.234,56.' },
    { chave: 'descricao', limite: 180, pergunta: 'Qual é a descrição da transação?' },
    { chave: 'contaId', limite: 12, pergunta: '' },
    { chave: 'data', limite: 10, pergunta: 'Qual é a data? Use DD/MM/AAAA ou responda hoje.' },
  ],
  conta: [
    { chave: 'nome', limite: 100, pergunta: 'Qual será o nome da conta?' },
    {
      chave: 'tipo',
      limite: 30,
      pergunta: 'Qual é o tipo: conta corrente, poupança, carteira ou cartão?',
    },
  ],
  produto: [
    { chave: 'nome', limite: 150, pergunta: 'Qual é o nome do produto?' },
    { chave: 'categoria', limite: 30, pergunta: `Qual categoria? ${CATEGORIAS.join(', ')}.` },
    { chave: 'quantidade', limite: 10, pergunta: 'Qual é a quantidade inteira que está no estoque?' },
    {
      chave: 'validade',
      limite: 10,
      pergunta: 'Qual é a validade? Use DD/MM/AAAA ou responda pular.',
    },
  ],
  itemLista: [
    { chave: 'nome', limite: 150, pergunta: 'Qual item você quer colocar na lista de compras?' },
    { chave: 'categoria', limite: 30, pergunta: `Qual categoria? ${CATEGORIAS.join(', ')}.` },
    { chave: 'quantidade', limite: 10, pergunta: 'Qual é a quantidade inteira?' },
  ],
  medicamento: [
    { chave: 'nome', limite: 150, pergunta: 'Qual é o nome do medicamento?' },
    {
      chave: 'tipoUso',
      limite: 20,
      pergunta: 'O uso é contínuo, temporário ou eventual?',
    },
    {
      chave: 'unidade',
      limite: 30,
      pergunta: 'Qual unidade de estoque: comprimidos, cápsulas, ml, gotas ou unidades?',
    },
    {
      chave: 'dose',
      limite: 100,
      pergunta: 'Se quiser, informe a dose exatamente como foi orientada; ou responda pular. Não vou sugerir dose.',
    },
    {
      chave: 'frequencia',
      limite: 20,
      pergunta: 'Qual frequência: todos os dias, dias específicos ou um intervalo (ex.: 8 horas)?',
    },
    { chave: 'intervaloHoras', limite: 3, pergunta: 'A cada quantas horas? Informe de 1 a 48.' },
    {
      chave: 'dias',
      limite: 40,
      pergunta: 'Quais dias da semana? Ex.: segunda, quarta e sexta.',
    },
    {
      chave: 'horarios',
      limite: 80,
      pergunta: 'Quais horários? Ex.: 08:00 e 20:00; ou responda pular.',
    },
  ],
};

const MODULO_POR_CADASTRO = {
  pet: 'pets',
  transacao: 'financas',
  conta: 'financas',
  produto: 'despensa',
  itemLista: 'despensa',
  medicamento: 'medicamentos',
};

const ESPECIES_PET = {
  cachorro: 'cachorro',
  cao: 'cachorro',
  gato: 'gato',
  passaro: 'passaro',
  cavalo: 'cavalo',
  reptil: 'reptil',
  'pequeno mamifero': 'pequeno-mamifero',
  'pequeno-mamifero': 'pequeno-mamifero',
  peixe: 'peixe',
  'animal de fazenda': 'animal-fazenda',
  'animal-fazenda': 'animal-fazenda',
  anfibio: 'anfibio',
  exotico: 'exotico',
};

const ROTULOS_ESPECIE_PET = {
  cachorro: 'cachorro',
  gato: 'gato',
  passaro: 'pássaro',
  cavalo: 'cavalo',
  reptil: 'réptil',
  'pequeno-mamifero': 'pequeno mamífero',
  peixe: 'peixe',
  'animal-fazenda': 'animal de fazenda',
  anfibio: 'anfíbio',
  exotico: 'exótico',
};

const ROTULOS_TIPO_CONTA = {
  corrente: 'conta corrente',
  investimento: 'poupança',
  carteira: 'carteira',
  credito: 'cartão',
};
const ROTULOS_MODULO = {
  pets: 'Pets',
  financas: 'Finanças',
  despensa: 'Despensa',
  medicamentos: 'Medicamentos',
};

function validarHistorico(historicoRecebido) {
  if (historicoRecebido === undefined) return [];
  if (
    !Array.isArray(historicoRecebido) ||
    historicoRecebido.length > LIMITE_MENSAGENS_HISTORICO
  ) {
    return null;
  }

  const historico = [];
  for (const mensagem of historicoRecebido) {
    if (
      !mensagem ||
      !['user', 'assistant'].includes(mensagem.role) ||
      typeof mensagem.content !== 'string'
    ) {
      return null;
    }

    const content = mensagem.content.trim();
    if (!content || content.length > LIMITE_CARACTERES_HISTORICO) {
      return null;
    }

    historico.push({ role: mensagem.role, content });
  }

  return historico;
}

function normalizarTexto(valor) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ');
}

function validarEstadoCadastro(estadoRecebido) {
  if (estadoRecebido == null) return null;
  if (
    typeof estadoRecebido !== 'object' ||
    Array.isArray(estadoRecebido) ||
    !['selecionando', 'coletando', 'confirmando'].includes(estadoRecebido.etapa) ||
    !estadoRecebido.dados ||
    typeof estadoRecebido.dados !== 'object' ||
    Array.isArray(estadoRecebido.dados) ||
    Object.keys(estadoRecebido).some((chave) =>
      !['tipo', 'modulo', 'etapa', 'dados'].includes(chave))
  ) {
    return null;
  }

  if (
    estadoRecebido.tipo === 'selecaoModulo' &&
    estadoRecebido.modulo === null &&
    estadoRecebido.etapa === 'selecionando' &&
    Object.keys(estadoRecebido.dados).length === 0
  ) {
    return { tipo: 'selecaoModulo', modulo: null, etapa: 'selecionando', dados: {} };
  }

  const modulo = MODULO_POR_CADASTRO[estadoRecebido.tipo];
  if (
    !modulo ||
    estadoRecebido.modulo !== modulo ||
    estadoRecebido.etapa === 'selecionando'
  ) {
    return null;
  }

  const campos = new Map(
    CAMPOS_CADASTRO[estadoRecebido.tipo].map(({ chave, limite }) => [chave, limite])
  );
  const dados = {};
  for (const [chave, valor] of Object.entries(estadoRecebido.dados)) {
    const limite = campos.get(chave);
    if (limite === undefined || typeof valor !== 'string' || valor.trim().length > limite) {
      return null;
    }
    dados[chave] = valor.trim();
  }

  const cadastro = {
    tipo: estadoRecebido.tipo,
    modulo,
    etapa: estadoRecebido.etapa,
    dados,
  };
  if (
    (estadoRecebido.etapa === 'confirmando' && proximoCampoCadastro(cadastro)) ||
    (estadoRecebido.etapa === 'coletando' && !proximoCampoCadastro(cadastro))
  ) {
    return null;
  }

  return cadastro;
}

function pedidoDeCadastro(mensagem) {
  const texto = normalizarTexto(mensagem);
  const verbo = /\b(?:cadastrar|cadastre|cadastra|adicionar|adicione|adiciona|incluir|inclua|inclui|registrar|registre|registra|lancar|lance|anotar|anote|criar|crie)\b/;
  const fraseGenerica = /\b(?:cadastro|cadastrar)\s+(?:pelo chat|via chat|por aqui)\b/.test(texto);
  const temNegacao = /\b(?:nao|sem)\b/.test(texto);
  const intencaoNegada =
    /\b(?:nao|sem)\s+(?:(?:quero|preciso|vou|posso|desejo|pretendo|fazer|iniciar)\s+)?(?:cadastrar|cadastre|cadastra|adicionar|adicione|adiciona|incluir|inclua|inclui|registrar|registre|registra|lancar|lance|anotar|anote|criar|crie|cadastro)\b/.test(texto) ||
    (fraseGenerica && temNegacao) ||
    (/\bnao\s+(?:funciona|consigo|permite|pode)\b/.test(texto) && verbo.test(texto));
  return !intencaoNegada && (verbo.test(texto) || fraseGenerica);
}

function tipoPadraoPorModulo(modulo) {
  return {
    pets: 'pet',
    medicamentos: 'medicamento',
    financas: 'transacao',
    despensa: 'produto',
  }[modulo] || null;
}

function detectarTipoCadastro(mensagem, historico) {
  if (!pedidoDeCadastro(mensagem)) return null;
  const texto = normalizarTexto(mensagem);

  if (/\b(medicamentos?|remedios?|medicacao|doses?|tratamentos?)\b/.test(texto)) {
    return 'medicamento';
  }
  if (/\bconta de (?:luz|agua|gas|internet)\b/.test(texto)) return 'transacao';
  if (/\b(conta bancaria|conta corrente|carteira|poupanca|cartao)\b/.test(texto) ||
      /\b(?:criar|crie|cadastrar|cadastre|adicionar|adicione)\s+(?:uma\s+)?conta\b/.test(texto)) {
    return 'conta';
  }
  if (/\b(financas?|financeiro|transacao|despesa|receita|gasto|renda|compra|pagamento|boleto|conta de luz|conta de agua)\b/.test(texto)) {
    return 'transacao';
  }
  if (/\b(lista de compras|lista)\b/.test(texto)) return 'itemLista';
  if (/\b(despensa|produto|estoque|alimentos?|comidas?)\b/.test(texto)) return 'produto';
  if (/\b(pets?|animais?|cachorros?|cachorras?|gatos?|gatas?|passaros?|cavalos?|repteis?|peixes?|coelhos?|hamsters?)\b/.test(texto)) {
    return 'pet';
  }

  const ultimaMensagemDoKeeper = [...historico].reverse()
    .find((mensagemAnterior) => mensagemAnterior.role === 'assistant');
  const modulosAnteriores = detectarModulosDaMensagem(ultimaMensagemDoKeeper?.content || '');
  if (modulosAnteriores.length === 1) return tipoPadraoPorModulo(modulosAnteriores[0]);
  return 'selecaoModulo';
}

function tipoCadastroPelaEscolha(mensagem) {
  const texto = normalizarTexto(mensagem);
  if (/\b(medicamentos?|remedios?|medicacao)\b/.test(texto)) return 'medicamento';
  if (/\b(lista de compras|lista)\b/.test(texto)) return 'itemLista';
  if (/\b(conta bancaria|conta corrente|carteira|poupanca|cartao)\b/.test(texto)) return 'conta';
  if (/\b(financas?|financeiro|transacao|despesa|receita|gasto|renda)\b/.test(texto)) return 'transacao';
  if (/\b(despensa|produto|estoque|alimentos?)\b/.test(texto)) return 'produto';
  if (/\b(pets?|animais?|cachorros?|gatos?)\b/.test(texto)) return 'pet';
  return null;
}

function introducaoCadastro(tipo) {
  return {
    pet: 'Vamos cadastrar um novo pet.',
    transacao: 'Vamos registrar uma transação financeira.',
    conta: 'Vamos cadastrar uma conta financeira.',
    produto: 'Vamos adicionar um produto ao estoque da Despensa.',
    itemLista: 'Vamos adicionar um item à lista de compras.',
    medicamento: 'Vamos cadastrar um medicamento. Informe somente os dados que você já tem; não vou sugerir dose ou frequência.',
  }[tipo];
}

function proximoCampoCadastro(cadastro) {
  const dados = cadastro.dados;
  return CAMPOS_CADASTRO[cadastro.tipo].find(({ chave }) => {
    if (cadastro.tipo === 'medicamento') {
      if (dados.tipoUso === 'eventual' &&
          ['frequencia', 'intervaloHoras', 'dias', 'horarios'].includes(chave)) {
        return false;
      }
      if (chave === 'intervaloHoras' && dados.frequencia !== 'intervalo') return false;
      if (chave === 'dias' && dados.frequencia !== 'especifico') return false;
    }
    return !Object.hasOwn(dados, chave);
  });
}

function normalizarValorPet(campo, valor) {
  const texto = valor.trim();
  if (!texto) return null;

  if (campo === 'nome' || campo === 'raca') {
    const limite = CAMPOS_PET.find(({ chave }) => chave === campo).limite;
    return texto.length <= limite ? texto : null;
  }

  const comparacao = normalizarTexto(texto);
  if (campo === 'especie') return ESPECIES_PET[comparacao] || null;
  if (campo === 'genero') {
    if (['macho', 'masculino'].includes(comparacao)) return 'macho';
    if (['femea', 'feminino', 'feminina'].includes(comparacao)) return 'femea';
    return null;
  }
  if (campo === 'dataNascimento') {
    const dataBrasileira = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const dataISO = /^\d{4}-\d{2}-\d{2}$/.test(texto)
      ? texto
      : dataBrasileira
        ? `${dataBrasileira[3]}-${dataBrasileira[2].padStart(2, '0')}-${dataBrasileira[1].padStart(2, '0')}`
        : '';
    const data = new Date(`${dataISO}T00:00:00.000Z`);
    return dataISO && !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === dataISO
      ? dataISO
      : null;
  }
  if (campo === 'peso') {
    const peso = texto.replace(/\s/g, '').replace(',', '.');
    return /^\d+(?:\.\d+)?$/.test(peso) ? peso : null;
  }

  return null;
}

function dataISOValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function dataHojeSaoPaulo() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function dataISODeTexto(valor, aceitarHoje = false) {
  const texto = valor.trim();
  if (aceitarHoje && normalizarTexto(texto) === 'hoje') return dataHojeSaoPaulo();
  const brasileira = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ? texto
    : brasileira
      ? `${brasileira[3]}-${brasileira[2].padStart(2, '0')}-${brasileira[1].padStart(2, '0')}`
      : '';
  return dataISOValida(iso) ? iso : null;
}

function respostaCadastro(res, resposta, cadastroEmAndamento = null) {
  return res.status(200).json({
    resposta,
    modulo: cadastroEmAndamento?.modulo || null,
    cadastroEmAndamento,
  });
}

function estadoInicialCadastro(tipo) {
  return {
    tipo,
    modulo: MODULO_POR_CADASTRO[tipo],
    etapa: 'coletando',
    dados: {},
  };
}

function valorOpcionalIgnorado(valor) {
  return ['pular', 'ignorar', 'sem', 'nao informado', 'nao informada']
    .includes(normalizarTexto(valor));
}

function diasDaSemana(valor) {
  const aliases = {
    dom: 'dom', domingo: 'dom',
    seg: 'seg', segunda: 'seg', 'segunda-feira': 'seg',
    ter: 'ter', terca: 'ter', 'terca-feira': 'ter',
    qua: 'qua', quarta: 'qua', 'quarta-feira': 'qua',
    qui: 'qui', quinta: 'qui', 'quinta-feira': 'qui',
    sex: 'sex', sexta: 'sex', 'sexta-feira': 'sex',
    sab: 'sab', sabado: 'sab',
  };
  const tokens = normalizarTexto(valor).replace(/\be\b/g, ',').split(/[,\s;]+/).filter(Boolean);
  const dias = [...new Set(tokens.map((token) => aliases[token]).filter(Boolean))];
  return dias.length && dias.length === tokens.length ? dias : null;
}

async function normalizarValorCadastro(cadastro, campo, valor, usuarioId) {
  const texto = valor.trim();
  if (cadastro.tipo === 'pet') return normalizarValorPet(campo, texto);
  if (cadastro.tipo === 'transacao') {
    if (campo === 'tipo') {
      const tipo = normalizarTexto(texto);
      return ['receita', 'renda', 'entrada'].includes(tipo)
        ? 'receita'
        : ['despesa', 'gasto', 'saida'].includes(tipo)
          ? 'despesa'
          : null;
    }
    if (campo === 'valor') {
      const valorTexto = texto
        .replace(/^R\$\s*/i, '')
        .replace(/\s/g, '');
      const valorNormalizado = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(valorTexto)
        ? valorTexto.replace(/\./g, '').replace(',', '.')
        : /^\d+(?:,\d{1,2})?$/.test(valorTexto)
          ? valorTexto.replace(',', '.')
          : /^\d+(?:\.\d{1,2})?$/.test(valorTexto)
            ? valorTexto
            : '';
      if (!valorNormalizado) return null;
      const valorNumerico = Number(valorNormalizado);
      return Number.isFinite(valorNumerico) && valorNumerico > 0
        ? String(Math.round((valorNumerico + Number.EPSILON) * 100) / 100)
        : null;
    }
    if (campo === 'descricao') return texto.length <= 180 ? texto : null;
    if (campo === 'data') return dataISODeTexto(texto, true);
    if (campo === 'contaId') {
      const contas = await listarContas(usuarioId);
      const indice = Number(texto);
      if (Number.isInteger(indice) && indice >= 1 && indice <= contas.length) {
        return String(contas[indice - 1].id);
      }
      const correspondentes = contas.filter(
        (conta) => normalizarTexto(conta.nome) === normalizarTexto(texto)
      );
      return correspondentes.length === 1 ? String(correspondentes[0].id) : null;
    }
  }
  if (cadastro.tipo === 'conta') {
    if (campo === 'nome') return texto.length <= 100 ? texto : null;
    if (campo === 'tipo') {
      const tipo = {
        corrente: 'corrente',
        'conta corrente': 'corrente',
        investimento: 'investimento',
        poupanca: 'investimento',
        carteira: 'carteira',
        credito: 'credito',
        cartao: 'credito',
      }[normalizarTexto(texto)];
      return tipo || normalizarTipoConta(texto);
    }
  }
  if (cadastro.tipo === 'produto' || cadastro.tipo === 'itemLista') {
    if (campo === 'nome') return texto.length <= 150 ? texto : null;
    if (campo === 'categoria') {
      return CATEGORIAS.find((categoria) =>
        normalizarTexto(categoria) === normalizarTexto(texto)) || null;
    }
    if (campo === 'quantidade') {
      return /^\d+$/.test(texto) && Number(texto) >= 1 && Number(texto) <= 100000
        ? String(Number(texto))
        : null;
    }
    if (campo === 'validade') {
      return valorOpcionalIgnorado(texto) ? '' : dataISODeTexto(texto);
    }
  }
  if (cadastro.tipo === 'medicamento') {
    if (campo === 'nome') return texto.length <= 150 ? texto : null;
    if (campo === 'tipoUso') {
      const tipo = normalizarTexto(texto);
      return ['continuo', 'uso continuo'].includes(tipo)
        ? 'continuo'
        : ['temporario', 'tratamento temporario'].includes(tipo)
          ? 'temporario'
          : ['eventual', 'uso eventual'].includes(tipo)
            ? 'eventual'
            : null;
    }
    if (campo === 'unidade') {
      const unidade = {
        comprimido: 'comprimidos',
        comprimidos: 'comprimidos',
        capsula: 'capsulas',
        capsulas: 'capsulas',
        ml: 'ml',
        gota: 'gotas',
        gotas: 'gotas',
        unidade: 'unidades',
        unidades: 'unidades',
      }[normalizarTexto(texto)];
      return unidade || null;
    }
    if (campo === 'dose') {
      return valorOpcionalIgnorado(texto) ? '' : texto.length <= 100 ? texto : null;
    }
    if (campo === 'frequencia') {
      const frequencia = normalizarTexto(texto);
      const intervalo = frequencia.match(/^(?:(?:a cada|de)\s*)?(\d{1,2})(?:\s+em\s+\d{1,2}|\/\s*\d{1,2})?\s*horas?$/);
      if (intervalo && Number(intervalo[1]) >= 1 && Number(intervalo[1]) <= 48) {
        return `intervalo:${Number(intervalo[1])}`;
      }
      return ['diario', 'todos os dias', 'diariamente'].includes(frequencia)
        ? 'diario'
        : ['especifico', 'dias especificos'].includes(frequencia)
          ? 'especifico'
          : ['intervalo', 'intervalo de horas', 'a cada x horas'].includes(frequencia)
            ? 'intervalo'
            : null;
    }
    if (campo === 'intervaloHoras') {
      return /^\d{1,2}$/.test(texto) && Number(texto) >= 1 && Number(texto) <= 48
        ? String(Number(texto))
        : null;
    }
    if (campo === 'dias') {
      const dias = diasDaSemana(texto);
      return dias ? dias.join(',') : null;
    }
    if (campo === 'horarios') {
      if (valorOpcionalIgnorado(texto)) return '';
      const horarios = texto.split(/[,;]|\s+e\s+/i).map((horario) => horario.trim());
      return horarios.length > 0 &&
        horarios.every((horario) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(horario))
        ? [...new Set(horarios)].join(',')
        : null;
    }
  }
  return null;
}

function dadosValidadosCadastro(cadastro) {
  const dados = cadastro.dados;
  if (cadastro.tipo === 'pet') return validarPet(dados);
  if (cadastro.tipo === 'transacao') {
    try {
      const transacao = dadosTransacao({
        tipo: dados.tipo,
        valor: dados.valor,
        descricao: dados.descricao,
        conta_id: dados.contaId,
        data: dados.data,
        categoria: null,
        vencimento: null,
        status: 'pending',
        observacoes: null,
      });
      return transacao ? { dados: transacao } : { erro: 'Informe os dados válidos da transação.' };
    } catch (erro) {
      if (erro.status !== 400) throw erro;
      return { erro: erro.message };
    }
  }
  if (cadastro.tipo === 'conta') {
    const tipo = normalizarTipoConta(dados.tipo);
    return dados.nome && tipo
      ? { dados: { nome: dados.nome, tipo } }
      : { erro: 'Informe nome e tipo de conta válidos.' };
  }
  if (cadastro.tipo === 'produto') {
    return validarProduto({
      nome: dados.nome,
      categoria: dados.categoria,
      quantidade: dados.quantidade,
      validade: dados.validade,
    });
  }
  if (cadastro.tipo === 'itemLista') {
    return validarItemLista({
      nome: dados.nome,
      categoria: dados.categoria,
      quantidade: dados.quantidade,
    });
  }
  const medicamento = validarDadosMedicamento({
    nome: dados.nome,
    tipoUso: dados.tipoUso,
    unidade: dados.unidade,
    dose: dados.dose || '',
    frequencia: dados.frequencia || 'diario',
    intervaloHoras: dados.intervaloHoras || '',
    dias: dados.dias ? dados.dias.split(',') : [],
    horarios: dados.horarios ? dados.horarios.split(',') : [],
    dataInicio: '',
    dataFim: '',
    quantidadeInicial: 0,
    validade: '',
  });
  return medicamento;
}

function campoDoErroCadastro(tipo, erro) {
  const mensagem = normalizarTexto(erro);
  if (tipo === 'pet') {
    if (mensagem.includes('nome do pet')) return 'nome';
    if (mensagem.includes('tipo de animal')) return 'especie';
    if (mensagem.includes('raca')) return 'raca';
    if (mensagem.includes('data de nascimento')) return 'dataNascimento';
    if (mensagem.includes('peso')) return 'peso';
    if (mensagem.includes('genero')) return 'genero';
  }
  if (tipo === 'transacao') {
    if (mensagem.includes('data')) return 'data';
    if (mensagem.includes('valor')) return 'valor';
    if (mensagem.includes('conta')) return 'contaId';
    if (mensagem.includes('descricao')) return 'descricao';
    if (mensagem.includes('tipo')) return 'tipo';
  }
  if (tipo === 'conta') {
    if (mensagem.includes('nome')) return 'nome';
    if (mensagem.includes('tipo')) return 'tipo';
  }
  if (tipo === 'produto' || tipo === 'itemLista') {
    if (mensagem.includes('nome')) return 'nome';
    if (mensagem.includes('categoria')) return 'categoria';
    if (mensagem.includes('quantidade')) return 'quantidade';
    if (mensagem.includes('validade')) return 'validade';
  }
  if (tipo === 'medicamento') {
    if (mensagem.includes('nome')) return 'nome';
    if (mensagem.includes('unidade')) return 'unidade';
    if (mensagem.includes('tipo de uso')) return 'tipoUso';
    if (mensagem.includes('frequencia')) return 'frequencia';
    if (mensagem.includes('intervalo')) return 'intervaloHoras';
    if (mensagem.includes('dia')) return 'dias';
    if (mensagem.includes('horario')) return 'horarios';
    if (mensagem.includes('dose')) return 'dose';
  }
  return null;
}

async function perguntaDoCampo(cadastro, campo, usuarioId) {
  if (cadastro.tipo !== 'transacao' || campo.chave !== 'contaId') return campo.pergunta;
  const contas = await listarContas(usuarioId);
  if (!contas.length) return null;
  return [
    'Qual conta deve receber essa transação? Responda com o número:',
    ...contas.map((conta, indice) => `${indice + 1}. ${conta.nome} (${conta.tipo})`),
  ].join('\n');
}

function dataParaBrasileiro(valor) {
  if (!valor) return 'não informada';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

async function resumoCadastro(cadastro, dadosValidados, usuarioId) {
  const dados = cadastro.dados;
  if (cadastro.tipo === 'pet') {
    const [ano, mes, dia] = dados.dataNascimento.split('-');
    const peso = Number(dados.peso).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const genero = dados.genero === 'femea' ? 'fêmea' : 'macho';
    return [
      'Confira os dados do novo pet:',
      `Nome: ${dados.nome}`,
      `Tipo: ${ROTULOS_ESPECIE_PET[dados.especie]}`,
      `Raça: ${dados.raca}`,
      `Nascimento: ${dia}/${mes}/${ano}`,
      `Peso: ${peso} kg`,
      `Gênero: ${genero}`,
    ].join('\n');
  }
  if (cadastro.tipo === 'conta') {
    return [
      'Confira a nova conta financeira:',
      `Nome: ${dadosValidados.nome}`,
      `Tipo: ${ROTULOS_TIPO_CONTA[dadosValidados.tipo]}`,
    ].join('\n');
  }
  if (cadastro.tipo === 'transacao') {
    const contas = await listarContas(usuarioId);
    const conta = contas.find((item) => String(item.id) === String(dadosValidados.conta_id));
    if (!conta) return null;
    const valor = Number(dadosValidados.valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return [
      'Confira a transação:',
      `Tipo: ${dadosValidados.tipo === 'receita' ? 'receita' : 'despesa'}`,
      `Valor: ${valor}`,
      `Descrição: ${dadosValidados.descricao}`,
      `Conta: ${conta.nome}`,
      `Data: ${dataParaBrasileiro(dadosValidados.data)}`,
      'Status inicial: pendente',
    ].join('\n');
  }
  if (cadastro.tipo === 'produto' || cadastro.tipo === 'itemLista') {
    const destino = cadastro.tipo === 'produto' ? 'estoque da Despensa' : 'lista de compras';
    return [
      `Confira o item para ${destino}:`,
      `Nome: ${dadosValidados.nome}`,
      `Categoria: ${dadosValidados.categoria}`,
      `Quantidade: ${dadosValidados.quantidade}`,
      ...(cadastro.tipo === 'produto'
        ? [`Validade: ${dataParaBrasileiro(dadosValidados.validade)}`]
        : []),
    ].join('\n');
  }

  const dadosMedicamento = dadosValidados;
  const frequencia = {
    diario: 'todos os dias',
    especifico: `dias específicos (${dadosMedicamento.dias.join(', ')})`,
    intervalo: `a cada ${dadosMedicamento.intervaloHoras} horas`,
  }[dadosMedicamento.frequencia] || 'uso eventual';
  return [
    'Confira o cadastro do medicamento:',
    `Nome: ${dadosMedicamento.nome}`,
    `Tipo de uso: ${dadosMedicamento.tipoUso}`,
    `Unidade: ${dadosMedicamento.unidade}`,
    `Dose: ${dadosMedicamento.dose || 'não informada'}`,
    `Frequência: ${dadosMedicamento.tipoUso === 'eventual' ? 'eventual' : frequencia}`,
    `Horários: ${dadosMedicamento.horarios.length ? dadosMedicamento.horarios.join(', ') : 'não informados'}`,
    'Estoque inicial: 0',
  ].join('\n');
}

async function continuarCadastro(res, cadastro, usuarioId) {
  const campo = proximoCampoCadastro(cadastro);
  if (campo) {
    const pergunta = await perguntaDoCampo(cadastro, campo, usuarioId);
    if (pergunta === null) {
      return respostaCadastro(
        res,
        'Não encontrei uma conta financeira ativa. Cadastre uma conta pelo chat ou no módulo Finanças antes de registrar a transação.',
      );
    }
    return respostaCadastro(res, pergunta, cadastro);
  }

  const validacao = dadosValidadosCadastro(cadastro);
  if (validacao.erro) {
    const campoInvalido = campoDoErroCadastro(cadastro.tipo, validacao.erro);
    if (!campoInvalido) throw new Error(`Falha na validação do cadastro: ${validacao.erro}`);
    delete cadastro.dados[campoInvalido];
    const campoParaRefazer = CAMPOS_CADASTRO[cadastro.tipo]
      .find((item) => item.chave === campoInvalido);
    return respostaCadastro(
      res,
      `${validacao.erro}\n${await perguntaDoCampo(cadastro, campoParaRefazer, usuarioId) || campoParaRefazer.pergunta}`,
      cadastro,
    );
  }

  const resumo = await resumoCadastro(cadastro, validacao.dados, usuarioId);
  if (!resumo) {
    delete cadastro.dados.contaId;
    const campoConta = CAMPOS_CADASTRO.transacao.find((item) => item.chave === 'contaId');
    const perguntaConta = await perguntaDoCampo(cadastro, campoConta, usuarioId);
    if (perguntaConta === null) {
      return respostaCadastro(
        res,
        'Não encontrei uma conta financeira ativa. Cadastre uma conta pelo chat ou no módulo Finanças antes de registrar a transação.',
      );
    }
    return respostaCadastro(
      res,
      `A conta selecionada não está mais disponível. Escolha uma conta ativa novamente.\n${perguntaConta}`,
      cadastro,
    );
  }
  return respostaCadastro(
    res,
    `${resumo}\nSe estiver tudo certo, responda Confirmar. Para desistir, responda Cancelar.`,
    { ...cadastro, etapa: 'confirmando' },
  );
}

function confirmacaoExplicita(mensagem) {
  return /^(sim|confirmar|confirmo|confirmar cadastro)[.!]?$/i.test(mensagem.trim());
}

function cancelamentoExplicito(mensagem) {
  return /^(não|nao|cancelar|cancelo|desistir)[.!]?$/i.test(mensagem.trim());
}

async function salvarCadastro(cadastro, usuarioId) {
  const validacao = dadosValidadosCadastro(cadastro);
  if (validacao.erro) throw new Error(`Cadastro inválido na confirmação: ${validacao.erro}`);
  if (cadastro.tipo === 'pet') {
    const pet = await criarPet(usuarioId, validacao.dados);
    if (!pet) throw new Error('O cadastro do Pet não retornou o registro criado.');
    return `${pet.nome} foi cadastrado com sucesso.`;
  }
  if (cadastro.tipo === 'conta') {
    const conta = await criarConta(usuarioId, validacao.dados);
    if (!conta?.id) throw new Error('O cadastro da conta não retornou o registro criado.');
    return `A conta ${validacao.dados.nome} foi cadastrada com sucesso.`;
  }
  if (cadastro.tipo === 'transacao') {
    const transacao = await criarTransacao(usuarioId, validacao.dados);
    if (!transacao?.id) throw new Error('O cadastro da transação não retornou o registro criado.');
    return `A transação "${validacao.dados.descricao}" foi registrada com sucesso.`;
  }
  if (cadastro.tipo === 'produto') {
    const produto = await criarProduto(usuarioId, validacao.dados.dados);
    if (!produto) throw new Error('O cadastro do produto não retornou o registro criado.');
    return `${produto.nome} foi adicionado ao estoque da Despensa.`;
  }
  if (cadastro.tipo === 'itemLista') {
    const item = await adicionarItem(usuarioId, validacao.dados.dados);
    if (!item) throw new Error('O cadastro do item não retornou o registro criado.');
    return `${item.nome} foi adicionado à lista de compras.`;
  }
  const medicamento = await criarMedicamento(usuarioId, validacao.dados);
  if (!medicamento) throw new Error('O cadastro do medicamento não retornou o registro criado.');
  return `${medicamento.nome} foi cadastrado com sucesso.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) {
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }

  const mensagem = typeof req.body?.mensagem === 'string'
    ? req.body.mensagem.trim()
    : '';

  if (!mensagem) {
    return res.status(400).json({ erro: 'Digite uma mensagem.' });
  }

  const historico = validarHistorico(req.body?.historico);
  if (!historico) {
    return res.status(400).json({ erro: 'O histórico da conversa é inválido. Recarregue o KeeperAI e tente novamente.' });
  }

  let cadastro = validarEstadoCadastro(req.body?.cadastroEmAndamento);
  if (req.body?.cadastroEmAndamento != null && !cadastro) {
    return res.status(400).json({ erro: 'O cadastro em andamento é inválido. Inicie o cadastro novamente.' });
  }

  try {
    let inicioDoCadastro = false;
    if (cadastro?.tipo === 'selecaoModulo') {
      if (cancelamentoExplicito(mensagem)) {
        return respostaCadastro(res, 'Cadastro cancelado. Nenhum dado foi gravado.');
      }
      const tipoEscolhido = tipoCadastroPelaEscolha(mensagem);
      if (!tipoEscolhido) {
        return respostaCadastro(
          res,
          'Escolha um módulo: Finanças, Despensa, Pets ou Medicamentos.',
          cadastro,
        );
      }
      cadastro = estadoInicialCadastro(tipoEscolhido);
      inicioDoCadastro = true;
    } else if (!cadastro) {
      const tipoDetectado = detectarTipoCadastro(mensagem, historico);
      if (tipoDetectado === 'selecaoModulo') {
        cadastro = {
          tipo: 'selecaoModulo',
          modulo: null,
          etapa: 'selecionando',
          dados: {},
        };
        return respostaCadastro(
          res,
          'Posso iniciar um cadastro em Finanças, Despensa, Pets ou Medicamentos. Qual módulo você quer usar?',
          cadastro,
        );
      }
      if (tipoDetectado) {
        cadastro = estadoInicialCadastro(tipoDetectado);
        inicioDoCadastro = true;
      }
    }

    const ultimaMensagemDoKeeper = [...historico].reverse()
      .find((mensagemAnterior) => mensagemAnterior.role === 'assistant');
    const modulosDaMensagem = detectarModulosDaMensagem(mensagem);
    const modulosSolicitados = cadastro
      ? [cadastro.modulo].filter(Boolean)
      : modulosDaMensagem.length
        ? modulosDaMensagem
        : detectarModulosDaMensagem(ultimaMensagemDoKeeper?.content || '');
    let modulosDisponiveis = new Set();

    if (modulosSolicitados.length) {
      const acessos = await listarAcessosUsuario(usuarioId);
      modulosDisponiveis = new Set(acessos.map((acesso) => acesso.codigo));
    }

    if (cadastro) {
      if (cadastro.modulo && !modulosDisponiveis.has(cadastro.modulo)) {
        return respostaCadastro(
          res,
          `O módulo ${ROTULOS_MODULO[cadastro.modulo]} não está ativo para esta conta. Não posso iniciar o cadastro.`,
        );
      }

      if (inicioDoCadastro) {
        const campo = proximoCampoCadastro(cadastro);
        const pergunta = await perguntaDoCampo(cadastro, campo, usuarioId);
        if (pergunta === null) {
          return respostaCadastro(
            res,
            'Não encontrei uma conta financeira ativa. Cadastre uma conta pelo chat ou no módulo Finanças antes de registrar a transação.',
          );
        }
        return respostaCadastro(res, `${introducaoCadastro(cadastro.tipo)}\n${pergunta}`, cadastro);
      }

      if (cancelamentoExplicito(mensagem)) {
        return respostaCadastro(res, 'Cadastro cancelado. Nenhum dado foi gravado.');
      }

      if (cadastro.etapa === 'confirmando') {
        if (!confirmacaoExplicita(mensagem)) {
          return respostaCadastro(
            res,
            'Para gravar, responda Confirmar. Para desistir, responda Cancelar.',
            cadastro,
          );
        }
        if (!origemDaRequisicaoValida(req)) {
          return res.status(403).json({ erro: 'A origem da solicitação não foi validada. Tente novamente pelo KeeperHub.' });
        }
        return respostaCadastro(res, await salvarCadastro(cadastro, usuarioId));
      }

      const campo = proximoCampoCadastro(cadastro);
      const valor = await normalizarValorCadastro(cadastro, campo.chave, mensagem, usuarioId);
      if (valor === null) {
        const pergunta = await perguntaDoCampo(cadastro, campo, usuarioId);
        if (pergunta === null) {
          return respostaCadastro(
            res,
            'Não encontrei uma conta financeira ativa. Cadastre uma conta pelo chat ou no módulo Finanças antes de registrar a transação.',
          );
        }
        return respostaCadastro(
          res,
          `Não consegui validar essa informação.\n${pergunta}`,
          cadastro,
        );
      }
      if (campo.chave === 'frequencia' && valor.startsWith('intervalo:')) {
        cadastro.dados.frequencia = 'intervalo';
        cadastro.dados.intervaloHoras = valor.slice('intervalo:'.length);
      } else {
        cadastro.dados[campo.chave] = valor;
      }
      return continuarCadastro(res, cadastro, usuarioId);
    }

    let contextoConsulta = null;

    if (modulosSolicitados.length) {
      const contexto = {
        modulosDisponiveis: [...modulosDisponiveis],
        modulosSemAcesso: modulosSolicitados.filter((modulo) => !modulosDisponiveis.has(modulo)),
      };

      if (modulosSolicitados.includes('pets') && modulosDisponiveis.has('pets')) {
        contexto.pets = dadosPetsParaContexto(await listarPets(usuarioId));
      }

      if (modulosSolicitados.includes('medicamentos') && modulosDisponiveis.has('medicamentos')) {
        contexto.medicamentos = dadosMedicamentosParaContexto(await listarMedicamentos(usuarioId));
      }

      if (modulosSolicitados.includes('financas') && modulosDisponiveis.has('financas')) {
        const [contas, transacoes] = await Promise.all([
          listarContas(usuarioId),
          listarTransacoes(usuarioId),
        ]);
        contexto.financas = dadosFinancasParaContexto(contas, transacoes);
      }

      if (modulosSolicitados.includes('despensa') && modulosDisponiveis.has('despensa')) {
        const [produtos, itens] = await Promise.all([
          listarProdutos(usuarioId),
          listarItensDaListaAberta(usuarioId),
        ]);
        contexto.despensa = dadosDespensaParaContexto(produtos, itens);
      }

      contextoConsulta = contexto;
    }

    const resposta = await enviarMensagem(mensagem, contextoConsulta, historico);
    const modulo = modulosSolicitados.length === 1 ? modulosSolicitados[0] : null;
    return res.status(200).json({ resposta, modulo });
  } catch (erro) {
    console.error('Erro na API do chatbot:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder agora.' });
  }
}
