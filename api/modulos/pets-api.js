// Organização do módulo Pets: administrar animais e os dados do tutor.
// Vacinas, consultas, exames e receitas (com anexos no Vercel Blob), medicações, despesas, rotinas
// (higiene, lazer e alimentar) e notas de comportamento também vêm do banco.
// Cada despesa de pet é também um lançamento em Finanças (conta e categoria "Pets").
// O orçamento mensal das despesas fica em pet_orcamento (um valor por pet e mês) e a meta
// conjunta de todos os pets em pet_orcamento_geral (um valor por usuário e mês).
import {
  atualizarPet,
  buscarPet,
  criarPet,
  desativarPet,
  listarPets,
  salvarTutor,
} from '../../server/repositories/pets/animais.js';
import {
  CODIGOS_VACINA,
  cadastrarVacina,
  listarVacinasPorPet,
  atualizarVacinas,
  marcarVacinasAplicadas,
  desfazerVacinasAplicadas,
  excluirVacinas,
} from '../../server/repositories/pets/vacinas.js';
import {
  CODIGOS_ESPECIALIDADE,
  alterarLembreteConsulta,
  cadastrarConsulta,
  atualizarConsultas,
  excluirConsultas,
  listarConsultasPorPet,
  registrarConsultaRealizada,
  registrarConsultasRealizadas,
} from '../../server/repositories/pets/consultas.js';
import {
  TIPOS_USO,
  atualizarMedicacoes,
  cadastrarMedicacao,
  concluirMedicacoes,
  excluirMedicacoes,
  listarMedicacoesPorPet,
} from '../../server/repositories/pets/medicacoes.js';
import {
  CATEGORIAS_DESPESA,
  atualizarDespesas,
  cadastrarDespesa,
  excluirDespesas,
  listarDespesasPorPet,
} from '../../server/repositories/pets/despesas.js';
import {
  TIPOS_ROTINA,
  atualizarRotinas,
  cadastrarRotina,
  excluirRotinas,
  listarRotinasPorPet,
} from '../../server/repositories/pets/rotinas.js';
import {
  TAMANHO_MAXIMO_OBSERVACAO,
  atualizarObservacao,
  cadastrarObservacao,
  excluirObservacao,
  listarObservacoesPorPet,
} from '../../server/repositories/pets/observacoes.js';
import {
  LIMITES_EXAME,
  TIPOS_REGISTRO_EXAME,
  atualizarExame,
  cadastrarExame,
  excluirExame,
  listarExamesPorPet,
  validarAnexoExame,
} from '../../server/repositories/pets/exames.js';
import {
  MES_VALIDO,
  ORCAMENTO_MAXIMO_CENTAVOS,
  listarOrcamentoGeral,
  listarOrcamentosPorPet,
  salvarOrcamento,
  salvarOrcamentoGeral,
} from '../../server/repositories/pets/orcamentos.js';
import {
  LIMITES_RECEITA,
  atualizarReceita,
  cadastrarReceita,
  concluirReceita,
  excluirReceita,
  listarReceitasPorPet,
} from '../../server/repositories/pets/receitas.js';
import { LIMITES_ANEXOS, validarAnexo } from '../../server/repositories/pets/anexos.js';
import {
  origemDaRequisicaoValida,
  usuarioDaSessao,
} from '../../server/auth-session.js';
import { usuarioTemAcesso } from '../../server/repositories/modulos.js';

const ESPECIES = [
  'cachorro', 'gato', 'passaro', 'cavalo', 'reptil',
  'pequeno-mamifero', 'peixe', 'animal-fazenda', 'anfibio', 'exotico',
];
const GENEROS = ['macho', 'femea'];
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const PESO_MAXIMO = 9999.99; // coluna DECIMAL(6,2)
const FREQUENCIAS_VACINA = ['reforco_anual', 'doses_fracionadas', 'dose_unica'];
const HORARIO_VALIDO = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function dataISOValida(valor) {
  if (!DATA_VALIDA.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// Data e hora atuais de Brasília no formato do MySQL ('AAAA-MM-DD HH:MM:SS').
export function agoraEmSaoPaulo(agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(agora).map(parte => [parte.type, parte.value])
  );
  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}:${partes.second}`;
}

// Dados de um exame (o pet é conferido na rota de cadastro). Anexos viram buffers.
export function validarExame(body) {
  const tipoRegistro = texto(body.tipoRegistro) || 'exame';
  const nome = texto(body.nome);
  const data = texto(body.data);
  const resultado = texto(body.resultado);
  const observacao = texto(body.observacao);
  if (!TIPOS_REGISTRO_EXAME.includes(tipoRegistro)) {
    return { erro: 'Selecione se o registro é um exame ou laudo.' };
  }
  if (!nome || nome.length > LIMITES_EXAME.nome) {
    return { erro: `Informe o nome do ${tipoRegistro} (até ${LIMITES_EXAME.nome} caracteres).` };
  }
  if (data && (!dataISOValida(data) || data < '1900-01-01' || data > hojeEmSaoPaulo())) {
    return { erro: `Informe uma data válida para o ${tipoRegistro}, que não seja no futuro.` };
  }
  if (resultado.length > LIMITES_EXAME.resultado) {
    return { erro: `O resultado pode ter até ${LIMITES_EXAME.resultado} caracteres.` };
  }
  if (observacao.length > LIMITES_EXAME.observacao) {
    return { erro: `A observação pode ter até ${LIMITES_EXAME.observacao} caracteres.` };
  }
  const brutos = Array.isArray(body.anexos) ? body.anexos : [];
  if (brutos.length > LIMITES_EXAME.anexos) {
    return { erro: `O ${tipoRegistro} pode ter até ${LIMITES_EXAME.anexos} anexos.` };
  }
  let anexos;
  try {
    anexos = brutos.map(validarAnexoExame);
  } catch (erro) {
    return { erro: erro.message };
  }
  const removerAnexos = Array.isArray(body.removerAnexos)
    ? [...new Set(body.removerAnexos.map(Number))].filter(valor => Number.isSafeInteger(valor) && valor > 0)
    : [];
  return { dados: { tipoRegistro, nome, data, resultado, observacao }, anexos, removerAnexos };
}

// Dados de uma receita (o pet é conferido na rota de cadastro). Anexos viram buffers.
export function validarReceita(body, hoje = hojeEmSaoPaulo()) {
  const nome = texto(body.nome);
  const veterinario = texto(body.veterinario);
  const dataEmissao = texto(body.dataEmissao);
  const dataValidade = texto(body.dataValidade);
  const observacao = texto(body.observacao);
  if (!nome || nome.length > LIMITES_RECEITA.nome) {
    return { erro: `Informe o nome da receita ou do medicamento (até ${LIMITES_RECEITA.nome} caracteres).` };
  }
  if (veterinario.length > LIMITES_RECEITA.veterinario) {
    return { erro: `O nome do veterinário pode ter até ${LIMITES_RECEITA.veterinario} caracteres.` };
  }
  if (dataEmissao && (!dataISOValida(dataEmissao) || dataEmissao < '1900-01-01' || dataEmissao > hoje)) {
    return { erro: 'Informe uma data de emissão válida, que não seja no futuro.' };
  }
  if (dataValidade && (!dataISOValida(dataValidade) || dataValidade < '1900-01-01')) {
    return { erro: 'Informe uma validade válida.' };
  }
  if (dataEmissao && dataValidade && dataValidade < dataEmissao) {
    return { erro: 'A validade não pode ser antes da emissão.' };
  }
  if (observacao.length > LIMITES_RECEITA.observacao) {
    return { erro: `A observação pode ter até ${LIMITES_RECEITA.observacao} caracteres.` };
  }
  const brutos = Array.isArray(body.anexos) ? body.anexos : [];
  if (brutos.length > LIMITES_ANEXOS.quantidade) {
    return { erro: `A receita pode ter até ${LIMITES_ANEXOS.quantidade} anexos.` };
  }
  let anexos;
  try {
    anexos = brutos.map(validarAnexo);
  } catch (erro) {
    return { erro: erro.message };
  }
  const removerAnexos = Array.isArray(body.removerAnexos)
    ? [...new Set(body.removerAnexos.map(Number))].filter(valor => Number.isSafeInteger(valor) && valor > 0)
    : [];
  return { dados: { nome, veterinario, dataEmissao, dataValidade, observacao }, anexos, removerAnexos };
}

// Meta conjunta de todos os pets num mês: { mes: 'AAAA-MM', valorCentavos (inteiro >= 0) }.
export function validarOrcamentoGeral(body) {
  const mes = texto(body.mes);
  const valorCentavos = Number(body.valorCentavos);
  if (!MES_VALIDO.test(mes) || mes < '1900-01') return { erro: 'Informe um mês válido.' };
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 0 || valorCentavos > ORCAMENTO_MAXIMO_CENTAVOS) {
    return { erro: 'Informe um valor de orçamento válido (zero ou mais).' };
  }
  return { mes, valorCentavos };
}

// Orçamento de um pet num mês: { petId, mes: 'AAAA-MM', valorCentavos (inteiro >= 0) }.
export function validarOrcamento(body) {
  const petId = Number(body.petId);
  if (!Number.isSafeInteger(petId) || petId <= 0) return { erro: 'Selecione um pet válido.' };
  const validacao = validarOrcamentoGeral(body);
  return validacao.erro ? validacao : { petId, ...validacao };
}

// Texto de uma nota de comportamento: obrigatório e com limite.
export function validarTextoObservacao(body) {
  const textoNota = texto(body.texto);
  if (!textoNota) return { erro: 'Escreva a observação antes de enviar.' };
  if (textoNota.length > TAMANHO_MAXIMO_OBSERVACAO) {
    return { erro: `A observação pode ter até ${TAMANHO_MAXIMO_OBSERVACAO} caracteres.` };
  }
  return { texto: textoNota };
}

// Mesmas regras de modules/pets/js/validacao-pet.js, repetidas no servidor.
export function validarPet(body, hoje = hojeEmSaoPaulo()) {
  const nome = texto(body.nome);
  const especie = texto(body.especie);
  const raca = texto(body.raca);
  const dataNascimento = texto(body.dataNascimento);
  const genero = texto(body.genero);
  const pesoTexto = body.peso == null ? '' : String(body.peso).trim().replace(',', '.');
  const peso = pesoTexto === '' ? NaN : Number(pesoTexto);

  if (!nome || nome.length > 60) return { erro: 'Informe o nome do pet (até 60 caracteres).' };
  if (!ESPECIES.includes(especie)) return { erro: 'Selecione um tipo de animal.' };
  if (!raca || raca.length > 80) return { erro: 'Informe a raça do pet (até 80 caracteres).' };
  if (!dataISOValida(dataNascimento) || dataNascimento < '1900-01-01' || dataNascimento > hoje) {
    return { erro: 'Informe uma data de nascimento válida, que não esteja no futuro.' };
  }
  if (!Number.isFinite(peso) || peso < 0 || peso > PESO_MAXIMO) {
    return { erro: 'Informe um peso válido em quilogramas, sem valores negativos.' };
  }
  if (!GENEROS.includes(genero)) return { erro: 'Selecione o gênero do pet.' };

  return {
    dados: {
      nome, especie, raca, dataNascimento,
      peso: Math.round(peso * 100) / 100,
      genero,
    },
  };
}

export function validarTutor(body) {
  const nomeTutor = texto(body.nomeTutor);
  const telefone = texto(body.telefone);
  if (nomeTutor.length > 150) return { erro: 'O nome do tutor pode ter até 150 caracteres.' };
  if (telefone.length > 30) return { erro: 'O telefone pode ter até 30 caracteres.' };
  if (telefone && !nomeTutor) return { erro: 'Informe o nome do tutor.' };
  return { dados: { nomeTutor, telefone } };
}

// Valida uma vacina e define se é aplicação (hoje ou passado) ou agendamento (futuro).
export function validarVacina(body, hoje = hojeEmSaoPaulo()) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const codigo = texto(body.nome);
  const nome = codigo === 'outra' ? texto(body.nomePersonalizado) : codigo;
  const data = texto(body.data);
  const frequencia = texto(body.frequencia);
  const proximaDose = texto(body.proximaDose);
  const clinica = texto(body.clinica);
  const horario = texto(body.horario);
  const observacao = texto(body.observacao);

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (codigo !== 'outra' && !CODIGOS_VACINA.includes(codigo)) {
    return { erro: 'Selecione a vacina.' };
  }
  if (!nome || nome.length > 100) return { erro: 'Informe o nome da vacina (até 100 caracteres).' };
  if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  if (!FREQUENCIAS_VACINA.includes(frequencia)) return { erro: 'Selecione a frequência.' };
  if (frequencia === 'dose_unica' && proximaDose) {
    return { erro: 'Dose única não tem próxima dose.' };
  }
  if (frequencia !== 'dose_unica' && (!dataISOValida(proximaDose) || proximaDose < data)) {
    return { erro: 'A próxima dose deve ser na data de aplicação ou depois.' };
  }
  if (clinica.length > 150) return { erro: 'A clínica pode ter até 150 caracteres.' };
  if (horario && !HORARIO_VALIDO.test(horario)) return { erro: 'Informe o horário no formato HH:mm.' };
  if (observacao.length > 2000) return { erro: 'A observação pode ter até 2000 caracteres.' };

  return {
    petIds,
    dados: {
      nome,
      status: data > hoje ? 'agendada' : 'aplicada',
      data,
      frequencia,
      proximaDose: frequencia === 'dose_unica' ? '' : proximaDose,
      clinica,
      horario,
      observacao,
    },
  };
}

// Valida uma consulta. Data passada já entra como realizada; hoje ou futura, como agendada
// (mesma regra da tela).
export function validarConsulta(body, hoje = hojeEmSaoPaulo()) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const codigo = texto(body.especialidade);
  const especialidade = codigo === 'outra' ? texto(body.especialidadePersonalizada) : codigo;
  const medico = texto(body.medico);
  const clinica = texto(body.clinica);
  const data = texto(body.data);
  const horario = texto(body.horario);

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (medico.length > 150) return { erro: 'O nome do veterinário pode ter até 150 caracteres.' };
  if (codigo && codigo !== 'outra' && !CODIGOS_ESPECIALIDADE.includes(codigo)) {
    return { erro: 'Selecione a especialidade.' };
  }
  if (codigo === 'outra' && !especialidade) {
    return { erro: 'Informe a especialidade.' };
  }
  if (especialidade.length > 120) return { erro: 'A especialidade pode ter até 120 caracteres.' };
  if (clinica.length > 150) return { erro: 'A clínica pode ter até 150 caracteres.' };
  if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  if (!HORARIO_VALIDO.test(horario)) return { erro: 'Informe o horário no formato HH:mm.' };

  return {
    petIds,
    dados: {
      medico: medico || null,
      especialidade: especialidade || null,
      clinica: clinica || null,
      data, horario,
      lembrar: body.lembrar === true,
      status: data < hoje ? 'realizada' : 'agendada',
    },
  };
}

// Valida uma medicação. Horário só vale para uso contínuo; frequência e data final, para temporário.
export function validarMedicacao(body) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const nome = texto(body.nome);
  const tipoUso = texto(body.tipoUso);
  const dosagem = texto(body.dosagem);
  const horarioDose = texto(body.horarioDose);
  const frequencia = texto(body.frequencia);
  const dataFim = texto(body.dataFim);
  const observacao = texto(body.observacao);
  const estoque = body.quantidadeEstoque;

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (!nome || nome.length > 150) return { erro: 'Informe o nome do medicamento (até 150 caracteres).' };
  if (!TIPOS_USO.includes(tipoUso)) return { erro: 'Selecione o tipo de uso.' };
  if (!dosagem || dosagem.length > 100) return { erro: 'Informe a dosagem (até 100 caracteres).' };
  if (tipoUso === 'continuo' && !HORARIO_VALIDO.test(horarioDose)) {
    return { erro: 'Informe o horário da dose no formato HH:mm.' };
  }
  if (tipoUso === 'temporario') {
    if (!frequencia || frequencia.length > 80) return { erro: 'Informe a frequência (até 80 caracteres).' };
    if (!dataISOValida(dataFim)) return { erro: 'Informe até quando vai o tratamento.' };
  }
  const quantidadeEstoque = estoque === null || estoque === undefined || estoque === ''
    ? null
    : Number(estoque);
  if (quantidadeEstoque !== null &&
      (!Number.isFinite(quantidadeEstoque) || quantidadeEstoque < 0 || quantidadeEstoque > 1000000)) {
    return { erro: 'Informe uma quantidade em estoque válida.' };
  }
  if (observacao.length > 2000) return { erro: 'A observação pode ter até 2000 caracteres.' };

  return {
    petIds,
    dados: {
      nome, tipoUso, dosagem,
      horarioDose: tipoUso === 'continuo' ? horarioDose : '',
      frequencia: tipoUso === 'temporario' ? frequencia : '',
      dataFim: tipoUso === 'temporario' ? dataFim : '',
      quantidadeEstoque: quantidadeEstoque === null ? null : Math.round(quantidadeEstoque * 100) / 100,
      observacao,
    },
  };
}

// Valida uma despesa. O valor chega em centavos e é o total (dividido entre os pets ao gravar).
export function validarDespesa(body) {
  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  const descricao = texto(body.descricao);
  const categoria = texto(body.categoria);
  const data = texto(body.data);
  const estabelecimento = texto(body.estabelecimento);
  const observacoes = texto(body.observacoes);
  const valorCentavos = Number(body.valorCentavos);

  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }
  if (!descricao || descricao.length > 100) return { erro: 'Informe uma descrição com até 100 caracteres.' };
  if (!CATEGORIAS_DESPESA.includes(categoria)) return { erro: 'Selecione uma categoria válida.' };
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0 || valorCentavos > 999999999999) {
    return { erro: 'Informe um valor válido maior que zero.' };
  }
  if (valorCentavos < petIds.length) return { erro: 'O valor é pequeno demais para dividir entre os pets.' };
  if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  if (estabelecimento.length > 100 || observacoes.length > 500) {
    return { erro: 'Confira o limite de caracteres dos campos opcionais.' };
  }

  return { petIds, dados: { descricao, categoria, valorCentavos, data, estabelecimento, observacoes } };
}

// Mesmos catálogos de modules/pets/js/rotinas.js, repetidos no servidor.
const CATALOGO_ROTINAS = {
  higiene: {
    atividades: {
      banho: 'Banho',
      banho_tosa: 'Banho e Tosa',
      corte_unha: 'Corte de Unha',
      escovacao: 'Escovação',
    },
    frequencias: ['semanal', 'quinzenal', 'mensal'],
  },
  lazer: {
    atividades: {
      passeio: 'Passeio',
      brincadeira: 'Brincadeira',
      parque: 'Parque ou praça',
      creche: 'Creche / Day care',
      adestramento: 'Adestramento',
      outro: 'Outro',
    },
    frequencias: ['diaria', 'dias_semana', 'uma_vez'],
  },
};
const DURACAO_MAXIMA = 65535; // coluna SMALLINT UNSIGNED

// Mesmas regras de validarRotina (modules/pets/js/rotinas.js). Recebe o registro já validado na tela.
// Para higiene e lazer, "nome" guarda o texto mostrado: o rótulo da atividade ou o nome digitado em "Outro".
export function validarRotinaApi(body) {
  const tipo = texto(body.tipo);
  if (!TIPOS_ROTINA.includes(tipo)) return { erro: 'Tipo de rotina inválido.' };

  const petIds = Array.isArray(body.petIds)
    ? [...new Set(body.petIds.map(Number))]
    : [];
  if (!petIds.length || petIds.length > 50 || petIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    return { erro: 'Selecione ao menos um pet válido.' };
  }

  const horario = texto(body.horario);
  const observacao = texto(body.observacao);
  if (!HORARIO_VALIDO.test(horario)) return { erro: 'Informe um horário válido (HH:MM).' };
  if (observacao.length > 500) return { erro: 'A observação pode ter até 500 caracteres.' };

  if (tipo === 'alimentar') {
    const nome = texto(body.nome);
    if (!nome || nome.length > 120) return { erro: 'Informe o nome da refeição com até 120 caracteres.' };
    return { tipo, petIds, dados: { nome, horario, observacao } };
  }

  const catalogo = CATALOGO_ROTINAS[tipo];
  const atividade = texto(body.atividade);
  if (!Object.hasOwn(catalogo.atividades, atividade)) return { erro: 'Escolha a atividade.' };
  let nome = catalogo.atividades[atividade];
  if (atividade === 'outro') {
    nome = texto(body.atividadeOutra);
    if (!nome || nome.length > 120) return { erro: 'Informe qual é a atividade com até 120 caracteres.' };
  }

  const frequencia = texto(body.frequencia);
  if (!catalogo.frequencias.includes(frequencia)) return { erro: 'Escolha a frequência.' };

  let data = '';
  if (tipo === 'higiene' || frequencia === 'uma_vez') {
    data = texto(body.data);
    if (!dataISOValida(data) || data < '1900-01-01') return { erro: 'Informe uma data válida.' };
  }

  let diasSemana = [];
  if (tipo === 'lazer' && frequencia === 'dias_semana') {
    const dias = Array.isArray(body.diasSemana) ? body.diasSemana.map(Number) : [];
    diasSemana = [...new Set(dias)].filter(dia => Number.isInteger(dia) && dia >= 0 && dia <= 6)
      .sort((a, b) => a - b);
    if (!diasSemana.length) return { erro: 'Escolha pelo menos um dia da semana.' };
  }

  let duracaoMin = null;
  if (tipo === 'lazer' && body.duracaoMin != null && String(body.duracaoMin).trim() !== '') {
    duracaoMin = Number(body.duracaoMin);
    if (!Number.isInteger(duracaoMin) || duracaoMin < 1) {
      return { erro: 'Informe a duração em minutos (maior que zero).' };
    }
    if (duracaoMin > DURACAO_MAXIMA) {
      return { erro: `A duração pode ter no máximo ${DURACAO_MAXIMA} minutos.` };
    }
  }

  return {
    tipo,
    petIds,
    dados: { atividade, nome, frequencia, data, diasSemana, horario, duracaoMin, observacao },
  };
}

// Campos de rotina que o front já usa em cada pet (rotinas.js / rotinas-armazenamento.js).
function camposDeRotina(rotinas) {
  return {
    rotinaHigiene: rotinas?.higiene || [],
    rotinaLazer: rotinas?.lazer || [],
    rotinaAlimentar: { refeicoes: rotinas?.refeicoes || [] },
  };
}

// IDs de registros vindos do corpo (ou do ?id=), sem repetição e com limite.
function idsDoCorpo(id, body) {
  const ids = id ? [id] : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
  return ids.length && ids.length <= 50 && ids.every(valor => Number.isSafeInteger(valor) && valor > 0)
    ? ids
    : null;
}

// A foto chega em Base64; é validada e enviada ao Vercel Blob. Só a URL vai para o banco.
// Os módulos de imagem são carregados sob demanda para não pesar nas demais requisições.
async function prepararFotoPadrao(foto) {
  const { validarFoto } = await import('../../server/image-validation.js');
  const { armazenarFoto } = await import('../../server/image-storage.js');
  const resultado = await validarFoto(foto);
  if (resultado.erro) {
    const erro = new Error(resultado.erro.replace('do perfil', 'do pet').replace('foto de perfil', 'foto do pet'));
    erro.statusCode = 400;
    throw erro;
  }
  return armazenarFoto(resultado, 'pets');
}

function idDaRequisicao(req) {
  const id = Number(req.query?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function requisicaoTemId(req) {
  return Object.prototype.hasOwnProperty.call(req.query || {}, 'id');
}

// Recebe as dependências para permitir testes sem banco; o export default usa as reais.
export function criarHandlerPets(deps) {
  const { repositorio, prepararFoto } = deps;

  // Inclui "foto" nos dados apenas quando o navegador enviou uma alteração.
  async function aplicarFoto(body, dados) {
    if (!Object.hasOwn(body, 'foto')) return dados;
    if (body.foto === null || body.foto === '') return { ...dados, foto: null };
    if (typeof body.foto === 'string' && body.foto.startsWith('data:')) {
      return { ...dados, foto: await prepararFoto(body.foto) };
    }
    return dados; // URL já salva: nada muda.
  }

  return async function handler(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const usuarioId = deps.usuarioDaSessao(req);
      if (!usuarioId) {
        return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
      }
      if (deps.verificarAcesso && !(await deps.verificarAcesso(usuarioId, 'pets'))) {
        return res.status(403).json({ erro: 'O módulo Pets não está ativo para esta conta.' });
      }

      const id = idDaRequisicao(req);
      if (requisicaoTemId(req) && !id) {
        return res.status(400).json({ erro: 'Informe um identificador válido.' });
      }

      if (req.method === 'GET') {
        if (req.query?.acao === 'orcamento-geral') {
          return res.status(200).json({ orcamentoGeral: await repositorio.listarOrcamentoGeral(usuarioId) });
        }
        if (id) {
          const pet = await repositorio.buscarPet(id, usuarioId);
          return pet
            ? res.status(200).json({ pet })
            : res.status(404).json({ erro: 'Pet não encontrado.' });
        }
        // A lista já leva as vacinas de cada pet, usadas pelas telas do módulo.
        const [
          pets, vacinasPorPet, consultasPorPet, medicacoesPorPet, despesasPorPet, rotinasPorPet, observacoesPorPet,
          examesPorPet, orcamentosPorPet, receitasPorPet,
        ] = await Promise.all([
          repositorio.listarPets(usuarioId),
          repositorio.listarVacinasPorPet(usuarioId),
          repositorio.listarConsultasPorPet(usuarioId),
          repositorio.listarMedicacoesPorPet(usuarioId),
          repositorio.listarDespesasPorPet(usuarioId),
          repositorio.listarRotinasPorPet(usuarioId),
          repositorio.listarObservacoesPorPet(usuarioId),
          repositorio.listarExamesPorPet(usuarioId),
          repositorio.listarOrcamentosPorPet(usuarioId),
          repositorio.listarReceitasPorPet(usuarioId),
        ]);
        return res.status(200).json({
          pets: pets.map(pet => ({
            ...pet,
            vacinas: vacinasPorPet.get(pet.id) || [],
            consultas: consultasPorPet.get(pet.id) || [],
            medicacoes: medicacoesPorPet.get(pet.id) || [],
            despesas: despesasPorPet.get(pet.id) || [],
            ...camposDeRotina(rotinasPorPet.get(pet.id)),
            observacoes: observacoesPorPet.get(pet.id) || [],
            exames: examesPorPet.get(pet.id) || [],
            orcamentosDespesas: orcamentosPorPet.get(pet.id) || {},
            receitas: receitasPorPet.get(pet.id) || [],
          })),
        });
      }

      if (!deps.origemDaRequisicaoValida(req)) {
        return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};

      if (req.method === 'POST' && req.query?.acao === 'vacina') {
        const validacao = validarVacina(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarVacina(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          vacinas: Object.fromEntries(resultado.vacinasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'vacina') {
        const validacao = validarVacina(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const petIdsOrigem = Array.isArray(body.petIdsOrigem)
          ? body.petIdsOrigem.map(Number)
          : validacao.petIds;
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às vacinas.' });
        }
        const resultado = await repositorio.atualizarVacinas(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              vacinas: Object.fromEntries(resultado.vacinasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Vacina não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'vacina-realizada') {
        const ids = id
          ? [id]
          : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const vacinasPorPet = await repositorio.marcarVacinasAplicadas(ids, usuarioId);
        return vacinasPorPet
          ? res.status(200).json({ vacinas: Object.fromEntries(vacinasPorPet) })
          : res.status(404).json({ erro: 'Vacina agendada não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'vacina-desfazer-realizada') {
        const anteriores = Array.isArray(body.anteriores) ? body.anteriores : [];
        const ids = anteriores.map(item => Number(item?.id));
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(ids).size !== ids.length || anteriores.some(item => !item || typeof item !== 'object' ||
              (item.dataAplicacao && !dataISOValida(item.dataAplicacao)) ||
              (item.proximaDose && !dataISOValida(item.proximaDose)))) {
          return res.status(400).json({ erro: 'Não foi possível restaurar o agendamento.' });
        }
        const anterioresValidadas = anteriores.map((item, indice) => ({
          id: ids[indice],
          dataAplicacao: item.dataAplicacao || '',
          proximaDose: item.proximaDose || '',
        }));
        const vacinasPorPet = await repositorio.desfazerVacinasAplicadas(ids, anterioresValidadas, usuarioId);
        return vacinasPorPet
          ? res.status(200).json({ vacinas: Object.fromEntries(vacinasPorPet) })
          : res.status(404).json({ erro: 'A vacinação não pode mais ser desfeita.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'vacina') {
        const ids = id ? [id] : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as vacinas válidas.' });
        }
        const vacinasPorPet = await repositorio.excluirVacinas(ids, usuarioId);
        return vacinasPorPet
          ? res.status(200).json({ vacinas: Object.fromEntries(vacinasPorPet) })
          : res.status(404).json({ erro: 'Vacina não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'despesa') {
        const validacao = validarDespesa(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarDespesa(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          despesas: Object.fromEntries(resultado.despesasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'despesa') {
        const validacao = validarDespesa(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = idsDoCorpo(null, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as despesas válidas.' });
        const petIdsOrigem = Array.isArray(body.petIdsOrigem) ? body.petIdsOrigem.map(Number) : [];
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às despesas.' });
        }
        const resultado = await repositorio.atualizarDespesas(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              despesas: Object.fromEntries(resultado.despesasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Despesa não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'despesa') {
        const ids = idsDoCorpo(id, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as despesas válidas.' });
        const despesasPorPet = await repositorio.excluirDespesas(ids, usuarioId);
        return despesasPorPet
          ? res.status(200).json({ despesas: Object.fromEntries(despesasPorPet) })
          : res.status(404).json({ erro: 'Despesa não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'receita') {
        const petId = Number(body.petId);
        if (!Number.isSafeInteger(petId) || petId <= 0) return res.status(400).json({ erro: 'Selecione um pet válido.' });
        const validacao = validarReceita(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarReceita(usuarioId, petId, validacao.dados, validacao.anexos);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          receitas: Object.fromEntries(resultado.receitasPorPet),
          criado: resultado.criado,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'receita') {
        if (!id) return res.status(400).json({ erro: 'Informe a receita.' });
        const validacao = validarReceita(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const receitasPorPet = await repositorio.atualizarReceita(
          id, usuarioId, validacao.dados, validacao.anexos, validacao.removerAnexos
        );
        return receitasPorPet
          ? res.status(200).json({ receitas: Object.fromEntries(receitasPorPet) })
          : res.status(404).json({ erro: 'Receita não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'receita-concluida') {
        if (!id) return res.status(400).json({ erro: 'Informe a receita.' });
        const data = body.concluida === false ? null : hojeEmSaoPaulo();
        const receitasPorPet = await repositorio.concluirReceita(id, usuarioId, data);
        return receitasPorPet
          ? res.status(200).json({ receitas: Object.fromEntries(receitasPorPet) })
          : res.status(404).json({ erro: 'Receita não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'receita') {
        if (!id) return res.status(400).json({ erro: 'Informe a receita.' });
        const receitasPorPet = await repositorio.excluirReceita(id, usuarioId);
        return receitasPorPet
          ? res.status(200).json({ receitas: Object.fromEntries(receitasPorPet) })
          : res.status(404).json({ erro: 'Receita não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'orcamento') {
        const validacao = validarOrcamento(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const orcamentosPorPet = await repositorio.salvarOrcamento(
          usuarioId, validacao.petId, validacao.mes, validacao.valorCentavos
        );
        return orcamentosPorPet
          ? res.status(200).json({ orcamentos: Object.fromEntries(orcamentosPorPet) })
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'orcamento-geral') {
        const validacao = validarOrcamentoGeral(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const orcamentoGeral = await repositorio.salvarOrcamentoGeral(
          usuarioId, validacao.mes, validacao.valorCentavos
        );
        return res.status(200).json({ orcamentoGeral });
      }

      if (req.method === 'POST' && req.query?.acao === 'exame') {
        const petId = Number(body.petId);
        if (!Number.isSafeInteger(petId) || petId <= 0) return res.status(400).json({ erro: 'Selecione um pet válido.' });
        const validacao = validarExame(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarExame(usuarioId, petId, validacao.dados, validacao.anexos);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          exames: Object.fromEntries(resultado.examesPorPet),
          criado: resultado.criado,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'exame') {
        if (!id) return res.status(400).json({ erro: 'Informe o exame.' });
        const validacao = validarExame(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const examesPorPet = await repositorio.atualizarExame(
          id, usuarioId, validacao.dados, validacao.anexos, validacao.removerAnexos
        );
        return examesPorPet
          ? res.status(200).json({ exames: Object.fromEntries(examesPorPet) })
          : res.status(404).json({ erro: 'Exame não encontrado.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'exame') {
        if (!id) return res.status(400).json({ erro: 'Informe o exame.' });
        const examesPorPet = await repositorio.excluirExame(id, usuarioId);
        return examesPorPet
          ? res.status(200).json({ exames: Object.fromEntries(examesPorPet) })
          : res.status(404).json({ erro: 'Exame não encontrado.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'observacao') {
        const petId = Number(body.petId);
        if (!Number.isSafeInteger(petId) || petId <= 0) return res.status(400).json({ erro: 'Selecione um pet válido.' });
        const validacao = validarTextoObservacao(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarObservacao(usuarioId, petId, validacao.texto, agoraEmSaoPaulo());
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          observacoes: Object.fromEntries(resultado.observacoesPorPet),
          criado: resultado.criado,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'observacao') {
        if (!id) return res.status(400).json({ erro: 'Informe a observação.' });
        const validacao = validarTextoObservacao(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const observacoesPorPet = await repositorio.atualizarObservacao(id, usuarioId, validacao.texto);
        return observacoesPorPet
          ? res.status(200).json({ observacoes: Object.fromEntries(observacoesPorPet) })
          : res.status(404).json({ erro: 'Observação não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'observacao') {
        if (!id) return res.status(400).json({ erro: 'Informe a observação.' });
        const observacoesPorPet = await repositorio.excluirObservacao(id, usuarioId);
        return observacoesPorPet
          ? res.status(200).json({ observacoes: Object.fromEntries(observacoesPorPet) })
          : res.status(404).json({ erro: 'Observação não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'rotina') {
        const validacao = validarRotinaApi(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarRotina(
          usuarioId, validacao.tipo, validacao.petIds, validacao.dados
        );
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          rotinas: Object.fromEntries(resultado.rotinasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'rotina') {
        const validacao = validarRotinaApi(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = idsDoCorpo(null, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as rotinas válidas.' });
        const petIdsOrigem = Array.isArray(body.petIdsOrigem) ? body.petIdsOrigem.map(Number) : [];
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às rotinas.' });
        }
        const resultado = await repositorio.atualizarRotinas(
          validacao.tipo, ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              rotinas: Object.fromEntries(resultado.rotinasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Rotina não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'rotina') {
        const tipo = texto(body.tipo);
        if (!TIPOS_ROTINA.includes(tipo)) return res.status(400).json({ erro: 'Tipo de rotina inválido.' });
        const ids = idsDoCorpo(id, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as rotinas válidas.' });
        const rotinasPorPet = await repositorio.excluirRotinas(tipo, ids, usuarioId);
        return rotinasPorPet
          ? res.status(200).json({ rotinas: Object.fromEntries(rotinasPorPet) })
          : res.status(404).json({ erro: 'Rotina não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'medicacao') {
        const validacao = validarMedicacao(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarMedicacao(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          medicacoes: Object.fromEntries(resultado.medicacoesPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'medicacao') {
        const validacao = validarMedicacao(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = idsDoCorpo(null, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as medicações válidas.' });
        const petIdsOrigem = Array.isArray(body.petIdsOrigem) ? body.petIdsOrigem.map(Number) : [];
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às medicações.' });
        }
        const resultado = await repositorio.atualizarMedicacoes(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              medicacoes: Object.fromEntries(resultado.medicacoesPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Medicação não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'medicacao-concluida') {
        const ids = idsDoCorpo(id, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as medicações válidas.' });
        // concluida = false desfaz a conclusão (botão "Desfazer" da tela de medicações).
        const medicacoesPorPet = await repositorio.concluirMedicacoes(ids, usuarioId, body.concluida !== false);
        return medicacoesPorPet
          ? res.status(200).json({ medicacoes: Object.fromEntries(medicacoesPorPet) })
          : res.status(404).json({ erro: 'Medicação não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'medicacao') {
        const ids = idsDoCorpo(id, body);
        if (!ids) return res.status(400).json({ erro: 'Informe as medicações válidas.' });
        const medicacoesPorPet = await repositorio.excluirMedicacoes(ids, usuarioId);
        return medicacoesPorPet
          ? res.status(200).json({ medicacoes: Object.fromEntries(medicacoesPorPet) })
          : res.status(404).json({ erro: 'Medicação não encontrada.' });
      }

      if (req.method === 'POST' && req.query?.acao === 'consulta') {
        const validacao = validarConsulta(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const resultado = await repositorio.cadastrarConsulta(usuarioId, validacao.petIds, validacao.dados);
        if (!resultado) return res.status(404).json({ erro: 'Pet não encontrado.' });
        return res.status(201).json({
          consultas: Object.fromEntries(resultado.consultasPorPet),
          criados: resultado.criados,
        });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta') {
        const validacao = validarConsulta(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as consultas válidas.' });
        }
        const petIdsOrigem = Array.isArray(body.petIdsOrigem)
          ? body.petIdsOrigem.map(Number)
          : validacao.petIds;
        if (petIdsOrigem.length !== ids.length ||
            petIdsOrigem.some(valor => !Number.isSafeInteger(valor) || valor <= 0) ||
            new Set(petIdsOrigem).size !== petIdsOrigem.length) {
          return res.status(400).json({ erro: 'A lista de pets de origem não corresponde às consultas.' });
        }
        const resultado = await repositorio.atualizarConsultas(
          ids, petIdsOrigem, validacao.petIds, usuarioId, validacao.dados
        );
        return resultado
          ? res.status(200).json({
              consultas: Object.fromEntries(resultado.consultasPorPet),
              grupoIds: resultado.grupoIds,
            })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'DELETE' && req.query?.acao === 'consulta') {
        const ids = id ? [id] : Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
        if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
          return res.status(400).json({ erro: 'Informe as consultas válidas.' });
        }
        const consultasPorPet = await repositorio.excluirConsultas(ids, usuarioId);
        return consultasPorPet
          ? res.status(200).json({ consultas: Object.fromEntries(consultasPorPet) })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta-lembrete') {
        if (!id) return res.status(400).json({ erro: 'Informe a consulta.' });
        if (typeof body.lembrar !== 'boolean') return res.status(400).json({ erro: 'Informe o lembrete.' });
        const consulta = await repositorio.alterarLembreteConsulta(id, usuarioId, body.lembrar);
        return consulta
          ? res.status(200).json({ consulta })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'consulta-realizada') {
        const resumo = texto(body.resumo);
        if (resumo.length > 2000) return res.status(400).json({ erro: 'O resumo pode ter até 2000 caracteres.' });
        if (!id) {
          const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
          if (!ids.length || ids.length > 50 || ids.some(valor => !Number.isSafeInteger(valor) || valor <= 0)) {
            return res.status(400).json({ erro: 'Informe as consultas válidas.' });
          }
          const consultasPorPet = await repositorio.registrarConsultasRealizadas(ids, usuarioId, resumo);
          return consultasPorPet
            ? res.status(200).json({ consultas: Object.fromEntries(consultasPorPet) })
            : res.status(404).json({ erro: 'Consulta não encontrada.' });
        }
        const consulta = await repositorio.registrarConsultaRealizada(id, usuarioId, resumo);
        return consulta
          ? res.status(200).json({ consulta })
          : res.status(404).json({ erro: 'Consulta não encontrada.' });
      }

      if (req.method === 'PUT' && req.query?.acao === 'tutor') {
        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        const validacao = validarTutor(body);
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });
        const pet = await repositorio.salvarTutor(id, usuarioId, validacao.dados);
        return pet
          ? res.status(200).json({ pet })
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const validacao = validarPet(body, deps.hoje?.());
        if (validacao.erro) return res.status(400).json({ erro: validacao.erro });

        if (req.method === 'POST') {
          const dados = await aplicarFoto(body, validacao.dados);
          const pet = await repositorio.criarPet(usuarioId, dados);
          return res.status(201).json({ pet });
        }

        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        const existente = await repositorio.buscarPet(id, usuarioId);
        if (!existente) return res.status(404).json({ erro: 'Pet não encontrado.' });
        const dados = await aplicarFoto(body, validacao.dados);
        const pet = await repositorio.atualizarPet(id, usuarioId, dados);
        return pet
          ? res.status(200).json({ pet })
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ erro: 'Informe o pet.' });
        return (await repositorio.desativarPet(id, usuarioId))
          ? res.status(204).end()
          : res.status(404).json({ erro: 'Pet não encontrado.' });
      }

      return res.status(405).json({ erro: 'Método não permitido.' });
    } catch (erro) {
      console.error('Erro na API de pets:', erro);
      return res.status(erro.statusCode || 500).json({
        erro: erro.statusCode ? erro.message : 'Erro ao acessar pets.',
      });
    }
  };
}

export default criarHandlerPets({
  repositorio: {
    atualizarPet, buscarPet, criarPet, desativarPet, listarPets, salvarTutor,
    listarVacinasPorPet, cadastrarVacina,
    atualizarVacinas, marcarVacinasAplicadas, desfazerVacinasAplicadas, excluirVacinas,
    listarConsultasPorPet, cadastrarConsulta, atualizarConsultas, excluirConsultas, alterarLembreteConsulta, registrarConsultaRealizada,
    registrarConsultasRealizadas,
    listarMedicacoesPorPet, cadastrarMedicacao, atualizarMedicacoes, concluirMedicacoes, excluirMedicacoes,
    listarDespesasPorPet, cadastrarDespesa, atualizarDespesas, excluirDespesas,
    listarRotinasPorPet, cadastrarRotina, atualizarRotinas, excluirRotinas,
    listarObservacoesPorPet, cadastrarObservacao, atualizarObservacao, excluirObservacao,
    listarExamesPorPet, cadastrarExame, atualizarExame, excluirExame,
    listarOrcamentosPorPet, salvarOrcamento, listarOrcamentoGeral, salvarOrcamentoGeral,
    listarReceitasPorPet, cadastrarReceita, atualizarReceita, concluirReceita, excluirReceita,
  },
  usuarioDaSessao,
  origemDaRequisicaoValida,
  verificarAcesso: usuarioTemAcesso,
  prepararFoto: prepararFotoPadrao,
});
