// Regras da página de notificações: transformam os dados já carregados de cada módulo
// em avisos. São funções puras (sem banco), com datas 'AAAA-MM-DD' no fuso de São Paulo.
//
// Cada aviso: { chave, modulo, tipo, titulo, detalhe, data, hora, link, acao, faixa }
//   faixa: 'atrasado' | 'hoje' | 'proximos'
//   acao:  'visto' (só informa) | 'concluido' (tarefa do dia)
// A chave identifica o aviso em notificacao_vista e sempre carrega a data, para que um
// aviso repetido (ex.: a refeição de cada dia) volte no dia seguinte.

export const DIAS_PROXIMOS = 7;
export const DIAS_ATRASO_MAXIMO = 30;
const FAIXAS = ['atrasado', 'hoje', 'proximos'];
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMES_ROTINA = {
  banho: 'Banho', banho_tosa: 'Banho e Tosa', corte_unha: 'Corte de Unha', escovacao: 'Escovação',
  passeio: 'Passeio', brincadeira: 'Brincadeira', parque: 'Parque ou praça',
  creche: 'Creche / Day care', adestramento: 'Adestramento', outro: 'Outro',
};
const DIAS_MEDICAMENTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

const LINKS = {
  pets: {
    vacina: id => `/modules/pets/components/vacinacoes.html?petId=${id}`,
    consulta: id => `/modules/pets/components/consultas-exames.html?petId=${id}`,
    medicacao: id => `/modules/pets/components/medicacoes.html?petId=${id}`,
    receita: id => `/modules/pets/components/receitas.html?petId=${id}`,
    rotina: id => `/modules/pets/components/rotina-diaria.html?petId=${id}`,
    despesa: id => (id ? `/modules/pets/components/despesas.html?petId=${id}` : '/modules/pets/components/despesas.html?todos=1'),
  },
  medicamentos: {
    medicamento: id => `/modules/medicamentos/components/detalhes-medicamento.html?id=${id}`,
    dose: () => '/modules/medicamentos/components/rotina.html',
    receita: () => '/modules/medicamentos/components/receitas.html',
  },
  financas: () => '/modules/financas/components/vencimentos.html',
  despensa: () => '/modules/despensa/components/vencimento.html',
};

// ---------- datas ----------

export function hojeEmSaoPaulo(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(agora);
}

function emUTC(data) {
  const [ano, mes, dia] = String(data).split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function paraTexto(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function somarDias(data, dias) {
  return paraTexto(emUTC(data) + dias * DIA_MS);
}

export function diferencaDias(de, ate) {
  return Math.round((emUTC(ate) - emUTC(de)) / DIA_MS);
}

function dataValida(data) {
  return typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data);
}

function diaDaSemana(data) {
  return new Date(emUTC(data)).getUTCDay(); // 0 = domingo
}

// Em que faixa a data cai. Atrasos com mais de 30 dias somem, salvo atrasoSemLimite (contas).
export function faixa(data, hoje, { atrasoSemLimite = false } = {}) {
  if (!dataValida(data)) return null;
  const dias = diferencaDias(hoje, data);
  if (dias === 0) return 'hoje';
  if (dias > 0) return dias <= DIAS_PROXIMOS ? 'proximos' : null;
  return atrasoSemLimite || -dias <= DIAS_ATRASO_MAXIMO ? 'atrasado' : null;
}

function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function quando(data, hoje) {
  const dias = diferencaDias(hoje, data);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias (${formatarData(data)})` : `há ${-dias} dias (${formatarData(data)})`;
}

function reais(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
}

// ---------- rotinas de pets ----------

// Próxima data (>= aPartirDe) de uma rotina de higiene semanal, quinzenal ou mensal.
export function proximaHigiene(rotina, aPartirDe) {
  const inicio = dataValida(rotina.data) ? rotina.data : aPartirDe;
  if (diferencaDias(aPartirDe, inicio) >= 0) return inicio;
  if (rotina.frequencia === 'mensal') {
    const [, , diaInicio] = inicio.split('-').map(Number);
    let [ano, mes] = aPartirDe.split('-').map(Number);
    for (let i = 0; i < 2; i += 1) {
      const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      const candidata = `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(diaInicio, ultimoDia)).padStart(2, '0')}`;
      if (diferencaDias(aPartirDe, candidata) >= 0) return candidata;
      mes += 1;
      if (mes > 12) { mes = 1; ano += 1; }
    }
  }
  const passo = rotina.frequencia === 'quinzenal' ? 14 : 7;
  const decorridos = diferencaDias(inicio, aPartirDe);
  const resto = decorridos % passo;
  return resto === 0 ? aPartirDe : somarDias(aPartirDe, passo - resto);
}

export function lazerCaiEm(rotina, dia) {
  if (rotina.frequencia === 'diaria') return true;
  if (rotina.frequencia === 'dias_semana') {
    return Array.isArray(rotina.diasSemana) && rotina.diasSemana.includes(diaDaSemana(dia));
  }
  if (rotina.frequencia === 'uma_vez') return rotina.data === dia;
  return false;
}

function nomeRotina(rotina) {
  return rotina.atividade === 'outro' && rotina.atividadeOutra
    ? rotina.atividadeOutra
    : NOMES_ROTINA[rotina.atividade] || rotina.atividade || 'Rotina';
}

// ---------- montagem dos avisos ----------

function aviso(dados) {
  return { hora: '', acao: 'visto', ...dados };
}

// Junta registros do mesmo cadastro (grupoId) feitos para vários pets: um aviso com os nomes.
function agrupar(itens) {
  const grupos = new Map();
  for (const item of itens) {
    const chave = `${item.tipo}|${item.registro.grupoId ? `g:${item.registro.grupoId}` : `r:${item.registro.id}`}|${item.data}|${item.hora || ''}`;
    const grupo = grupos.get(chave);
    if (grupo) grupo.pets.push(item.pet);
    else grupos.set(chave, { ...item, pets: [item.pet] });
  }
  return [...grupos.values()];
}

function nomesPets(pets) {
  return pets.map(pet => pet.nome).join(', ');
}

export function avisosPets(pets, hoje, orcamentoGeral = {}) {
  const lista = Array.isArray(pets) ? pets : [];
  const itens = [];
  const add = (pet, tipo, registro, data, extra = {}) => {
    const f = faixa(data, hoje);
    if (f) itens.push({ pet, tipo, registro, data, faixa: f, ...extra });
  };

  for (const pet of lista) {
    for (const vacina of pet.vacinas || []) {
      if (vacina.status === 'agendada') add(pet, 'vacina', vacina, vacina.dataAgendada, { hora: vacina.horario || '' });
      else if (vacina.proximaDose) add(pet, 'vacina', vacina, vacina.proximaDose, { proximaDose: true });
    }
    for (const consulta of pet.consultas || []) {
      if (consulta.status === 'agendada') add(pet, 'consulta', consulta, consulta.data, { hora: consulta.horario || '' });
    }
    for (const medicacao of pet.medicacoes || []) {
      if (medicacao.concluidaEm) continue;
      if (medicacao.tipoUso === 'continuo' && medicacao.horarioDose) {
        itens.push({ pet, tipo: 'dose', registro: medicacao, data: hoje, hora: medicacao.horarioDose, faixa: 'hoje' });
      }
      if (medicacao.dataFim && diferencaDias(hoje, medicacao.dataFim) >= 0) add(pet, 'fim-tratamento', medicacao, medicacao.dataFim);
    }
    for (const receita of pet.receitas || []) {
      if (!receita.concluidaEm && receita.dataValidade) add(pet, 'receita', receita, receita.dataValidade);
    }
    for (const rotina of pet.rotinaHigiene || []) {
      const proxima = proximaHigiene(rotina, hoje);
      add(pet, 'higiene', rotina, proxima, { hora: rotina.horario || '' });
    }
    for (const rotina of pet.rotinaLazer || []) {
      if (lazerCaiEm(rotina, hoje)) {
        itens.push({ pet, tipo: 'lazer', registro: rotina, data: hoje, hora: rotina.horario || '', faixa: 'hoje' });
      } else if (rotina.frequencia === 'uma_vez' && faixa(rotina.data, hoje) === 'proximos') {
        add(pet, 'lazer', rotina, rotina.data, { hora: rotina.horario || '' });
      }
    }
    for (const refeicao of pet.rotinaAlimentar?.refeicoes || []) {
      itens.push({ pet, tipo: 'refeicao', registro: refeicao, data: hoje, hora: refeicao.horario || '', faixa: 'hoje' });
    }
  }

  const avisos = agrupar(itens).map(item => avisoDePet(item, hoje));

  // Despesas do mês acima da meta (por pet e de todos os pets juntos).
  const mes = hoje.slice(0, 7);
  let totalGeral = 0;
  for (const pet of lista) {
    const total = (pet.despesas || [])
      .filter(despesa => String(despesa.data || '').startsWith(mes))
      .reduce((soma, despesa) => soma + (Number(despesa.valorCentavos) || 0), 0);
    totalGeral += total;
    const meta = Number(pet.orcamentosDespesas?.[mes]);
    if (meta > 0 && total > meta) {
      avisos.push(aviso({
        chave: `pets:meta:${pet.id}:${mes}`, modulo: 'pets', tipo: 'meta', faixa: 'hoje', data: hoje,
        titulo: `Despesas de ${pet.nome} acima da meta`,
        detalhe: `${reais(total)} de ${reais(meta)} neste mês`, link: LINKS.pets.despesa(pet.id),
      }));
    }
  }
  const metaGeral = Number(orcamentoGeral?.[mes]);
  if (metaGeral > 0 && totalGeral > metaGeral) {
    avisos.push(aviso({
      chave: `pets:meta-geral:${mes}`, modulo: 'pets', tipo: 'meta', faixa: 'hoje', data: hoje,
      titulo: 'Despesas dos pets acima da meta',
      detalhe: `${reais(totalGeral)} de ${reais(metaGeral)} neste mês (todos os pets)`, link: LINKS.pets.despesa(''),
    }));
  }
  return avisos;
}

function avisoDePet(item, hoje) {
  const { tipo, registro, data, hora, faixa: f, pets } = item;
  const nomes = nomesPets(pets);
  const petId = pets[0].id;
  const base = { modulo: 'pets', tipo, data, hora: hora || '', faixa: f, chave: `pets:${tipo}:${registro.id}:${data}` };
  switch (tipo) {
    case 'vacina': {
      const nome = (registro.nome === 'outra' ? registro.nomePersonalizado : registro.nome || '').toUpperCase() || 'Vacina';
      return aviso({ ...base, titulo: `${item.proximaDose ? 'Próxima dose' : 'Vacina'} ${nome}`, detalhe: `${nomes} · ${quando(data, hoje)}`, link: LINKS.pets.vacina(petId) });
    }
    case 'consulta':
      return aviso({ ...base, titulo: registro.medico ? `Consulta com ${registro.medico}` : 'Consulta agendada', detalhe: `${nomes} · ${quando(data, hoje)}`, link: LINKS.pets.consulta(petId) });
    case 'dose':
      return aviso({ ...base, chave: `pets:dose:${registro.id}:${data}`, acao: 'concluido', titulo: `${registro.nome}${registro.dosagem ? ` · ${registro.dosagem}` : ''}`, detalhe: `${nomes} · dose de hoje`, link: LINKS.pets.medicacao(petId) });
    case 'fim-tratamento':
      return aviso({ ...base, titulo: `Fim do tratamento: ${registro.nome}`, detalhe: `${nomes} · ${quando(data, hoje)}`, link: LINKS.pets.medicacao(petId) });
    case 'receita':
      return aviso({ ...base, titulo: `Receita ${registro.nome}`, detalhe: `${nomes} · ${f === 'atrasado' ? 'venceu' : 'vence'} ${quando(data, hoje)}`, link: LINKS.pets.receita(petId) });
    case 'higiene':
    case 'lazer':
      return aviso({ ...base, acao: f === 'hoje' ? 'concluido' : 'visto', titulo: nomeRotina(registro), detalhe: `${nomes} · ${f === 'hoje' ? 'hoje' : quando(data, hoje)}`, link: LINKS.pets.rotina(petId) });
    case 'refeicao':
      return aviso({ ...base, acao: 'concluido', titulo: registro.nome || 'Refeição', detalhe: `${nomes} · refeição de hoje`, link: LINKS.pets.rotina(petId) });
    default:
      return aviso({ ...base, titulo: tipo, detalhe: nomes, link: LINKS.pets.rotina(petId) });
  }
}

export function avisosMedicamentos(medicamentos, receitas, hoje) {
  const avisos = [];
  const diaHoje = DIAS_MEDICAMENTO[diaDaSemana(hoje)];
  for (const med of Array.isArray(medicamentos) ? medicamentos : []) {
    if (med.status !== 'ativo') continue;
    const link = LINKS.medicamentos.medicamento(med.id);
    const emTratamento = (!med.dataInicio || diferencaDias(med.dataInicio, hoje) >= 0) &&
      (!med.dataFim || diferencaDias(hoje, med.dataFim) >= 0);
    const tomaHoje = med.tipoUso !== 'eventual' && emTratamento &&
      (med.frequencia !== 'especifico' || (med.dias || []).includes(diaHoje));
    if (tomaHoje) {
      for (const hora of med.horarios || []) {
        avisos.push(aviso({
          chave: `medicamentos:dose:${med.id}:${hoje}:${hora}`, modulo: 'medicamentos', tipo: 'dose',
          faixa: 'hoje', data: hoje, hora, acao: 'concluido',
          titulo: `${med.nome}${med.dose ? ` · ${med.dose}` : ''}`, detalhe: 'dose de hoje', link: LINKS.medicamentos.dose(),
        }));
      }
    }
    const fValidade = med.estoqueCadastrado && med.quantidade > 0 ? faixa(med.validade, hoje) : null;
    if (fValidade) {
      avisos.push(aviso({
        chave: `medicamentos:validade:${med.id}:${med.validade}`, modulo: 'medicamentos', tipo: 'validade',
        faixa: fValidade, data: med.validade, titulo: `Validade: ${med.nome}`,
        detalhe: `${fValidade === 'atrasado' ? 'venceu' : 'vence'} ${quando(med.validade, hoje)}`, link,
      }));
    }
    if (med.dataFim && diferencaDias(hoje, med.dataFim) >= 0 && faixa(med.dataFim, hoje)) {
      avisos.push(aviso({
        chave: `medicamentos:fim-tratamento:${med.id}:${med.dataFim}`, modulo: 'medicamentos', tipo: 'fim-tratamento',
        faixa: faixa(med.dataFim, hoje), data: med.dataFim, titulo: `Fim do tratamento: ${med.nome}`,
        detalhe: quando(med.dataFim, hoje), link,
      }));
    }
  }
  for (const receita of Array.isArray(receitas) ? receitas : []) {
    const f = faixa(receita.validade, hoje);
    if (!f) continue;
    avisos.push(aviso({
      chave: `medicamentos:receita:${receita.id}:${receita.validade}`, modulo: 'medicamentos', tipo: 'receita',
      faixa: f, data: receita.validade, titulo: receita.titulo || 'Receita',
      detalhe: `${receita.medicamento ? `${receita.medicamento} · ` : ''}${f === 'atrasado' ? 'venceu' : 'vence'} ${quando(receita.validade, hoje)}`,
      link: LINKS.medicamentos.receita(),
    }));
  }
  // Uma receita pode vir repetida (uma linha por medicamento): mantém a primeira.
  const vistas = new Set();
  return avisos.filter(item => !vistas.has(item.chave) && vistas.add(item.chave));
}

export function avisosFinancas(transacoes, hoje) {
  return (Array.isArray(transacoes) ? transacoes : [])
    .filter(t => t.tipo === 'despesa' && t.status !== 'pago')
    .map(t => ({ t, f: faixa(t.vencimento, hoje, { atrasoSemLimite: true }) }))
    .filter(({ f }) => f)
    .map(({ t, f }) => aviso({
      chave: `financas:conta:${t.id}:${t.vencimento}`, modulo: 'financas', tipo: 'conta', faixa: f,
      data: t.vencimento, titulo: t.descricao || 'Conta a pagar',
      detalhe: `${reais(Math.round(Number(t.valor) * 100))} · ${f === 'atrasado' ? 'venceu' : 'vence'} ${quando(t.vencimento, hoje)}`,
      link: LINKS.financas(),
    }));
}

export function avisosDespensa(produtos, hoje) {
  const avisos = [];
  for (const produto of Array.isArray(produtos) ? produtos : []) {
    if (Number(produto.quantidade) <= 0) {
      avisos.push(aviso({
        chave: `despensa:acabou:${produto.id}`, modulo: 'despensa', tipo: 'acabou', faixa: 'hoje', data: hoje,
        titulo: `${produto.nome} acabou`, detalhe: 'sem estoque na despensa', link: '/modules/despensa/index.html',
      }));
      continue;
    }
    const f = faixa(produto.validade, hoje);
    if (f) {
      avisos.push(aviso({
        chave: `despensa:validade:${produto.id}:${produto.validade}`, modulo: 'despensa', tipo: 'validade', faixa: f,
        data: produto.validade, titulo: `Validade: ${produto.nome}`,
        detalhe: `${f === 'atrasado' ? 'venceu' : 'vence'} ${quando(produto.validade, hoje)}`, link: LINKS.despensa(),
      }));
    }
  }
  return avisos;
}

export function ordenarAvisos(avisos) {
  return [...avisos].sort((a, b) =>
    FAIXAS.indexOf(a.faixa) - FAIXAS.indexOf(b.faixa) ||
    String(a.data).localeCompare(String(b.data)) ||
    String(a.hora || '').localeCompare(String(b.hora || '')));
}
