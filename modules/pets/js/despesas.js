// Resumo mensal, metas por pet e extrato local das despesas.
import { atualizarPet, listarPets } from './armazenamento.js';
import { listarDespesas, excluirDespesa as excluirDespesaDoRepositorio } from './despesas-repositorio.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';

// Os dados principais dos pets vêm da API; carrega antes de montar a página.
// Se falhar, listarPets() lança o erro e a página mostra a mensagem.
await carregarPetsDoServidor();


const main = document.getElementById('conteudo-principal');
const seletorPet = document.getElementById('pet-despesas');
const secaoSeletor = seletorPet.closest('.seletor-pet-despesas');
const statusPet = document.getElementById('status-pet-despesas');
const conteudo = document.querySelector('.despesas-conteudo');
const botaoAdicionar = document.getElementById('btn-add-section');
const formularioMeta = document.getElementById('formulario-meta-despesas');
const botaoEditarMeta = document.getElementById('editar-meta-despesas');
const botaoCancelarMeta = document.getElementById('cancelar-meta-despesas');
const campoPetMeta = document.getElementById('campo-pet-meta');
const seletorPetMeta = document.getElementById('pet-meta-despesas');
const campoValorMeta = document.getElementById('valor-meta-despesas');
const rotuloMeta = document.getElementById('rotulo-meta-despesas');
const rotuloValorMeta = document.getElementById('rotulo-valor-meta');
const mensagemMeta = document.getElementById('mensagem-meta-despesas');
const avisoMeta = document.getElementById('aviso-meta-despesas');
const grupoProgresso = document.getElementById('grupo-progresso-orcamento');
const linhaSaldo = document.getElementById('linha-saldo-orcamento');
const listaVazia = document.getElementById('despesas-vazias');
const observadorBotaoAdicionar = new MutationObserver(() => {
    const link = botaoAdicionar.querySelector('#btn-add');
    if (link && window.keeperhubModuleConfig?.addUrl) {
        link.href = window.keeperhubModuleConfig.addUrl;
    }
});
observadorBotaoAdicionar.observe(botaoAdicionar, { childList: true, subtree: true });

const CATEGORIAS = ['alimentacao', 'saude', 'higiene', 'lazer'];
const META_GERAL_STORAGE_KEY = 'keeperhub-pets-despesas-meta-geral';
let pets = [];
let petAtual = null;
let todosPetsSelecionados = false;
let mesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const exclusoesPendentes = new Set();
const categoriaExclusaoPendentePorId = new Map();
const despesasRemoviveis = new Map();
let renderizacaoAtual = 0;
let timerFeedbackDespesa = null;
let timerFeedbackMeta = null;

const mesInformado = new URLSearchParams(window.location.search).get('mes');
if (/^\d{4}-(0[1-9]|1[0-2])$/.test(mesInformado ?? '')) {
    const [ano, mes] = mesInformado.split('-').map(Number);
    mesAtual = new Date(ano, mes - 1, 1);
}

// Converte uma data para a chave AAAA-MM usada no filtro mensal e nos orçamentos.
function chaveMes(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

// Gera uma data local no formato AAAA-MM-DD sem conversão de fuso horário.
function dataLocalISO(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

// Exibe valores armazenados em centavos como moeda brasileira.
function formatarMoeda(centavos) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(centavos / 100);
}

// Lê as metas mensais que valem para todos os pets em conjunto.
function metasGeraisDeDespesas() {
    try {
        const metas = JSON.parse(localStorage.getItem(META_GERAL_STORAGE_KEY) ?? '{}');
        return metas && typeof metas === 'object' && !Array.isArray(metas) ? metas : {};
    } catch {
        return {};
    }
}

function metaGeralDoMes(mes) {
    const valor = Number(metasGeraisDeDespesas()[mes]);
    return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

function salvarMetaGeral(mes, valorCentavos) {
    try {
        localStorage.setItem(META_GERAL_STORAGE_KEY, JSON.stringify({
            ...metasGeraisDeDespesas(),
            [mes]: valorCentavos
        }));
        return true;
    } catch {
        return false;
    }
}

// Converte uma data ISO válida em uma data curta para os lançamentos.
function formatarData(dataISO) {
    if (!validarData(dataISO)) return 'Data não informada';
    const data = new Date(`${dataISO}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(data).replace('.', '');
}

// Atualiza a mensagem relacionada ao pet selecionado ou ao escopo da consulta.
function informarSelecao(mensagem, erro = false) {
    statusPet.hidden = !mensagem;
    statusPet.textContent = mensagem;
    statusPet.dataset.estado = erro ? 'erro' : 'informativo';
    statusPet.setAttribute('role', erro ? 'alert' : 'status');
}

// Mantém o pet selecionado na URL sem recarregar a página.
function atualizarUrlPet(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
    if (todosPetsSelecionados) url.searchParams.set('todos', '1');
    else url.searchParams.delete('todos');
    url.searchParams.set('mes', chaveMes(mesAtual));
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function atualizarDestinoBotaoAdicionar() {
    const parametros = new URLSearchParams({ mes: chaveMes(mesAtual) });
    if (petAtual) parametros.set('petId', petAtual.id);
    else if (todosPetsSelecionados) parametros.set('todos', '1');
    const destino = '/modules/pets/components/cadastrar-despesa.html?' + parametros;
    window.keeperhubModuleConfig.addUrl = destino;
    const link = botaoAdicionar.querySelector('#btn-add');
    if (link) link.href = destino;
}

// Descarta registros corrompidos ou incompatíveis antes de usá-los nos cálculos.
function despesaValida(despesa) {
    return despesa &&
        typeof despesa === 'object' &&
        !exclusoesPendentes.has(String(despesa.id)) &&
        validarData(despesa.data) &&
        CATEGORIAS.includes(despesa.categoria) &&
        Number.isSafeInteger(Number(despesa.valorCentavos)) &&
        Number(despesa.valorCentavos) > 0;
}

// Lê os lançamentos associados ao escopo atual pelo repositório de despesas.
async function despesasDoEscopo() {
    const idsPets = escopoAtual().map(pet => pet.id);
    if (!idsPets.length) return [];
    return (await listarDespesas(idsPets)).filter(despesaValida);
}

// Filtra os lançamentos do mês selecionado.
async function despesasDoMes(mes = chaveMes(mesAtual)) {
    return (await despesasDoEscopo()).filter(despesa => despesa.data.slice(0, 7) === mes);
}

// Retorna o orçamento definido para o pet e mês, ou o valor padrão em centavos.
function orcamentoDoPet(pet, mes) {
    const orcamentos = pet.orcamentosDespesas &&
        typeof pet.orcamentosDespesas === 'object'
        ? pet.orcamentosDespesas
        : {};
    const valor = Number(orcamentos[mes]);
    return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

// Obtém os pets que participam dos totais e do extrato atuais.
function escopoAtual() {
    return todosPetsSelecionados ? pets : petAtual ? [petAtual] : [];
}

// Soma os valores de uma categoria dentro da lista recebida.
function totalPorCategoria(despesas, categoria) {
    return despesas
        .filter(despesa => despesa.categoria === categoria)
        .reduce((total, despesa) => total + Number(despesa.valorCentavos), 0);
}

function categoriaTemExclusaoPendente(categoria) {
    return [...categoriaExclusaoPendentePorId.values()].includes(categoria);
}

// Atualiza o resumo, o orçamento, o saldo e os totais de cada categoria.
function atualizarResumo(despesas) {
    const totais = Object.fromEntries(CATEGORIAS.map(categoria => [
        categoria,
        totalPorCategoria(despesas, categoria)
    ]));
    const total = Object.values(totais).reduce((soma, valor) => soma + valor, 0);
    const mes = chaveMes(mesAtual);
    const escopo = escopoAtual();
    const metas = escopo.map(pet => orcamentoDoPet(pet, mes));
    const metasIndividuaisCompletas = metas.length > 0 && metas.every(meta => meta !== null);
    const metaConjunta = todosPetsSelecionados ? metaGeralDoMes(mes) : null;
    const orcamento = todosPetsSelecionados
        ? (metaConjunta ?? (metasIndividuaisCompletas ? metas.reduce((soma, meta) => soma + meta, 0) : null))
        : (metas[0] ?? null);
    const tipoMeta = todosPetsSelecionados
        ? (metaConjunta !== null ? 'conjunta' : metasIndividuaisCompletas ? 'individual-combinada' : null)
        : (orcamento !== null ? 'individual' : null);
    const saldo = orcamento === null ? null : orcamento - total;
    const percentual = orcamento > 0 ? total / orcamento * 100 : 0;

    // Atualiza o mês apresentado no cabeçalho e no elemento semântico <time>.
    const nomeMes = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).format(mesAtual);
    const titulo = document.getElementById('titulo-total-despesas');
    titulo.textContent = 'Total em ' + nomeMes.charAt(0).toLocaleUpperCase('pt-BR') + nomeMes.slice(1);

    const tempoMes = document.querySelector('.resumo-despesas__mes time');
    tempoMes.dateTime = mes;
    const [mesTexto, anoTexto] = nomeMes.split(' de ');
    const spanMes = document.createElement('span');
    spanMes.textContent = mesTexto;
    const spanAno = document.createElement('span');
    spanAno.textContent = anoTexto || String(mesAtual.getFullYear());
    tempoMes.replaceChildren(spanMes, spanAno);

    const valorTotal = document.querySelector('.resumo-despesas__valor');
    valorTotal.value = (total / 100).toFixed(2);
    valorTotal.textContent = formatarMoeda(total);

    const resumoMetaValor = document.getElementById('resumo-meta-valor');
    const resumoMetaStatus = document.getElementById('resumo-meta-status');
    const temMeta = orcamento !== null && orcamento > 0;
    rotuloMeta.textContent = tipoMeta === 'conjunta'
        ? 'Meta conjunta'
        : tipoMeta === 'individual-combinada'
            ? 'Metas individuais'
            : 'Meta mensal';
    resumoMetaValor.hidden = !temMeta;
    resumoMetaValor.textContent = temMeta ? `/ ${formatarMoeda(orcamento)} de meta` : '';
    resumoMetaStatus.textContent = temMeta
        ? formatarMoeda(orcamento)
        : todosPetsSelecionados && metas.some(meta => meta !== null)
            ? `Metas individuais definidas para ${metas.filter(meta => meta !== null).length} de ${metas.length} pets`
            : 'Nenhuma meta definida';
    botaoEditarMeta.textContent = todosPetsSelecionados
        ? (metaConjunta !== null ? 'Editar meta conjunta' : 'Definir meta para todos')
        : (metas[0] !== null ? 'Editar meta' : 'Definir meta');
    avisoMeta.hidden = temMeta;
    avisoMeta.textContent = todosPetsSelecionados
        ? 'Defina uma meta conjunta ou configure uma meta para cada pet.'
        : 'Defina um limite para acompanhar os gastos deste mês.';
    grupoProgresso.hidden = !temMeta;
    linhaSaldo.hidden = !temMeta;
    if (temMeta) {
        const percentualExibido = Math.min(percentual, 100);
        document.getElementById('percentual-orcamento').textContent =
            `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percentualExibido)}% consumido`;
    }

    const progresso = document.getElementById('progresso-orcamento');
    progresso.max = orcamento || 1;
    progresso.value = Math.min(total, orcamento || 1);
    progresso.textContent = `${Math.round(percentual)}%`;
    const saldoElement = document.getElementById('saldo-orcamento');
    saldoElement.textContent = saldo >= 0
        ? `${formatarMoeda(saldo)} livres`
        : `${formatarMoeda(Math.abs(saldo))} acima da meta`;
    linhaSaldo.dataset.estourado = saldo < 0 ? 'true' : 'false';

    // Atualiza o percentual e o valor de cada cartão de categoria.
    document.querySelectorAll('.categoria-despesa').forEach(card => {
        const categoria = card.getAttribute('href').replace('#despesas-', '');
        const valor = totais[categoria] || 0;
        const percentagemCategoria = total > 0 ? valor / total * 100 : 0;
        card.querySelector('.categoria-despesa__percentual').textContent =
            `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percentagemCategoria)}%`;
        const valorCategoria = card.querySelector('.categoria-despesa__valor');
        valorCategoria.value = (valor / 100).toFixed(2);
        valorCategoria.textContent = formatarMoeda(valor);
    });

    document.querySelector('.secao-despesas__contador').textContent =
        `${CATEGORIAS.filter(categoria => totais[categoria] > 0).length} categorias com gastos`;
    document.querySelector('.historico-despesas .secao-despesas__contador').textContent =
        `${despesas.length} ${despesas.length === 1 ? 'lançamento' : 'lançamentos'}`;
}

// Associa cada categoria ao ícone correspondente do Font Awesome.
function classeIcone(categoria) {
    return {
        alimentacao: 'fa-bowl-food',
        saude: 'fa-heart-pulse',
        higiene: 'fa-soap',
        lazer: 'fa-bone'
    }[categoria] || 'fa-receipt';
}

function urlFormularioDespesa(despesa) {
    const url = new URL('/modules/pets/components/cadastrar-despesa.html', window.location.origin);
    url.searchParams.set('id', despesa.id);
    url.searchParams.set('mes', chaveMes(mesAtual));
    if (todosPetsSelecionados) url.searchParams.set('todos', '1');
    else if (petAtual) url.searchParams.set('petId', petAtual.id);
    return url.pathname + url.search;
}

// Monta um item do extrato usando elementos de texto para não interpretar dados como HTML.
function criarLancamento(despesa) {
    const item = document.createElement('li');
    const artigo = document.createElement('article');
    artigo.className = 'lancamento';
    artigo.dataset.categoria = despesa.categoria;

    const icone = document.createElement('span');
    icone.className = 'despesa-icone lancamento__icone';
    const iconeCategoria = document.createElement('i');
    iconeCategoria.className = `fa-solid icone-despesa ${classeIcone(despesa.categoria)}`;
    iconeCategoria.setAttribute('aria-hidden', 'true');
    icone.append(iconeCategoria);

    const informacoes = document.createElement('div');
    informacoes.className = 'lancamento__informacoes';
    const titulo = document.createElement('h4');
    titulo.className = 'lancamento__titulo';
    titulo.textContent = despesa.descricao;

    // Identifica os pets associados ao lançamento com a etiqueta comum.
    if (despesa.petNome) {
        const pet = document.createElement('span');
        pet.className = 'etiqueta-pets-registro';
        pet.textContent = despesa.petNome;
        titulo.append(' ', pet);
    }

    const detalhes = document.createElement('p');
    detalhes.className = 'lancamento__detalhes';
    const data = document.createElement('time');
    data.dateTime = despesa.data;
    data.textContent = formatarData(despesa.data);
    detalhes.append(data);
    if (despesa.estabelecimento) {
        detalhes.append(document.createTextNode(` · ${despesa.estabelecimento}`));
    }
    if (despesa.observacoes) {
        detalhes.append(document.createTextNode(` · ${despesa.observacoes}`));
    }
    informacoes.append(titulo, detalhes);

    const valor = document.createElement('data');
    valor.className = 'lancamento__valor';
    valor.value = (Number(despesa.valorCentavos) / 100).toFixed(2);
    valor.textContent = formatarMoeda(Number(despesa.valorCentavos));

    artigo.append(icone, informacoes, valor);
    const chaveExclusao = String(despesa.id);
    despesasRemoviveis.set(chaveExclusao, despesa);
    const editar = document.createElement('a');
    editar.className = 'botao-texto';
    editar.href = urlFormularioDespesa(despesa);
    editar.textContent = 'Editar';
    const excluir = document.createElement('button');
    excluir.type = 'button';
    excluir.className = 'botao-texto';
    excluir.dataset.excluirDespesa = chaveExclusao;
    excluir.textContent = 'Excluir';
    const acoes = document.createElement('div');
    acoes.className = 'acoes-cartao-registro';
    acoes.append(editar, excluir);
    informacoes.append(acoes);
    item.append(artigo);
    return item;
}

// Agrupa os lançamentos por categoria e atualiza subtotais e estados vazios.
function renderizarGrupos(despesas) {
    despesasRemoviveis.clear();
    CATEGORIAS.forEach(categoria => {
        const grupo = document.getElementById(`despesas-${categoria}`);
        const lista = grupo.querySelector('.lista-lancamentos');
        const linhas = despesas
            .filter(despesa => despesa.categoria === categoria)
            .sort((a, b) => `${b.data}${b.criadaEm ?? ''}`.localeCompare(`${a.data}${a.criadaEm ?? ''}`));
        const subtotal = totalPorCategoria(despesas, categoria);
        const valorSubtotal = grupo.querySelector('.grupo-despesas__subtotal data');
        valorSubtotal.value = (subtotal / 100).toFixed(2);
        valorSubtotal.textContent = formatarMoeda(subtotal);
        lista.replaceChildren();

        if (!linhas.length) {
            if (categoriaTemExclusaoPendente(categoria)) {
                lista.hidden = true;
            } else {
                const vazio = document.createElement('li');
                vazio.className = 'lancamentos-vazios';
                vazio.textContent = 'Nenhum lançamento neste mês.';
                lista.append(vazio);
                lista.hidden = false;
            }
        } else {
            lista.append(...linhas.map(criarLancamento));
            lista.hidden = false;
        }
    });
}

// Renderiza o mês e mantém o resumo acessível mesmo antes do primeiro lançamento.
async function renderizarMes() {
    const renderizacao = ++renderizacaoAtual;
    const escopo = escopoAtual();
    if (!escopo.length) {
        conteudo.hidden = true;
        secaoSeletor.hidden = true;
        botaoAdicionar.hidden = true;
        atualizarNoContent(false);
        return;
    }

    conteudo.hidden = false;
    secaoSeletor.hidden = pets.length < 2;
    botaoAdicionar.hidden = pets.length === 0;
    informarSelecao('');
    atualizarNoContent(true);

    const mes = chaveMes(mesAtual);
    try {
        const despesas = await despesasDoMes(mes);
        if (renderizacao !== renderizacaoAtual) return;

        const temExclusaoPendente = exclusoesPendentes.size > 0;
        atualizarResumo(despesas);
        renderizarGrupos(despesas);
        listaVazia.hidden = despesas.length > 0 || temExclusaoPendente;
        document.querySelector('.despesas-conteudo > section[aria-labelledby="titulo-resumo-categorias"]').hidden = !despesas.length;
        document.querySelector('.historico-despesas').hidden = !despesas.length && !temExclusaoPendente;
        document.querySelectorAll('.despesas-navegar').forEach(botao => {
            botao.disabled = false;
            botao.removeAttribute('title');
        });
    } catch (erro) {
        if (renderizacao === renderizacaoAtual) {
            informarSelecao(erro.message || 'Não foi possível carregar as despesas.', true);
        }
    }
}

// Seleciona um pet e atualiza a página para mostrar somente os dados dele.
function selecionarPet(pet, atualizarUrl = true) {
    formularioMeta.hidden = true;
    petAtual = pet;
    todosPetsSelecionados = false;
    seletorPet.value = pet?.id ?? '';
    main.dataset.petId = pet?.id ?? '';
    if (atualizarUrl) atualizarUrlPet(pet?.id);
    atualizarDestinoBotaoAdicionar();
    void renderizarMes();
}

// Alterna para a visão agregada, reunindo os dados de todos os pets.
function selecionarTodosPets() {
    formularioMeta.hidden = true;
    petAtual = null;
    todosPetsSelecionados = true;
    seletorPet.value = '__todos__';
    main.dataset.petId = '';
    atualizarUrlPet(null);
    atualizarDestinoBotaoAdicionar();
    void renderizarMes();
}

// Carrega os pets, monta as opções do seletor e escolhe o escopo inicial.
function prepararSelecao() {
    pets = listarPets();
    seletorPet.replaceChildren();

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet para acompanhar despesas';
    inicial.disabled = true;
    inicial.hidden = true;
    seletorPet.append(inicial);

    if (pets.length > 1) {
        const todos = document.createElement('option');
        todos.value = '__todos__';
        todos.textContent = 'Todos os pets';
        seletorPet.append(todos);
    }
    pets.forEach(pet => {
        const opcao = document.createElement('option');
        opcao.value = pet.id;
        opcao.textContent = pet.nome;
        seletorPet.append(opcao);
    });

    seletorPet.disabled = pets.length === 0;
    botaoAdicionar.hidden = pets.length === 0;

    // Prioriza o pet da URL; sem filtro, mostra todos ou o único pet.
    const parametros = new URLSearchParams(window.location.search);
    const idDaUrl = parametros.get('petId');
    const petDaUrl = pets.find(pet => pet.id === idDaUrl);
    if (petDaUrl) {
        selecionarPet(petDaUrl, false);
    } else if (pets.length > 1) {
        selecionarTodosPets();
    } else if (pets.length === 1) {
        selecionarPet(pets[0], false);
    } else {
        petAtual = null;
        todosPetsSelecionados = false;
        main.dataset.petId = '';
        atualizarDestinoBotaoAdicionar();
        void renderizarMes();
    }
}

// Muda o mês selecionado e redesenha o resumo.
function mudarMes(diferenca) {
    mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + diferenca, 1);
    atualizarUrlPet(petAtual?.id);
    atualizarDestinoBotaoAdicionar();
    formularioMeta.hidden = true;
    void renderizarMes();
}

function mostrarFeedbackDeCadastro() {
    const url = new URL(window.location.href);
    const resultado = url.searchParams.get('resultado');
    if (resultado !== 'criada' && resultado !== 'atualizada') return;

    const feedback = document.getElementById('feedback-despesas');
    feedback.textContent = resultado === 'atualizada'
        ? 'Despesa atualizada com sucesso.'
        : 'Despesa registrada com sucesso.';
    feedback.hidden = false;
    if (timerFeedbackDespesa) window.clearTimeout(timerFeedbackDespesa);
    timerFeedbackDespesa = window.setTimeout(() => {
        feedback.hidden = true;
        timerFeedbackDespesa = null;
    }, 3000);
    url.searchParams.delete('resultado');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function destinoDaMeta() {
    if (todosPetsSelecionados && seletorPetMeta.value === '__todos__') {
        return { conjunta: true, pet: null };
    }
    const pet = todosPetsSelecionados
        ? pets.find(item => item.id === seletorPetMeta.value) ?? null
        : petAtual;
    return { conjunta: false, pet };
}

function carregarValorMeta() {
    const destino = destinoDaMeta();
    const valor = destino.conjunta
        ? metaGeralDoMes(chaveMes(mesAtual))
        : destino.pet ? orcamentoDoPet(destino.pet, chaveMes(mesAtual)) : null;
    campoValorMeta.value = valor ? (valor / 100).toFixed(2) : '';
    rotuloValorMeta.textContent = destino.conjunta
        ? 'Limite conjunto deste mês (R$)'
        : 'Limite mensal para este pet (R$)';
}

function abrirEditorMeta() {
    campoPetMeta.hidden = !todosPetsSelecionados;
    seletorPetMeta.required = todosPetsSelecionados;
    seletorPetMeta.replaceChildren();

    if (todosPetsSelecionados) {
        seletorPetMeta.append(
            new Option('Todos os pets juntos', '__todos__'),
            ...pets.map(pet => new Option(pet.nome, pet.id))
        );
        seletorPetMeta.value = '__todos__';
        carregarValorMeta();
    } else {
        carregarValorMeta();
    }

    if (timerFeedbackMeta) window.clearTimeout(timerFeedbackMeta);
    timerFeedbackMeta = null;
    mensagemMeta.hidden = true;
    formularioMeta.hidden = false;
    (todosPetsSelecionados ? seletorPetMeta : campoValorMeta).focus();
}

function salvarMeta(event) {
    event.preventDefault();
    const destino = destinoDaMeta();
    const valor = Number(campoValorMeta.value);
    const valorCentavos = Math.round(valor * 100);

    if (!destino.conjunta && !destino.pet) {
        mensagemMeta.textContent = 'Selecione para quem vale esta meta.';
        mensagemMeta.dataset.estado = 'erro';
        mensagemMeta.hidden = false;
        seletorPetMeta.focus();
        return;
    }
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(valorCentavos)) {
        mensagemMeta.textContent = 'Informe uma meta mensal maior que zero.';
        mensagemMeta.dataset.estado = 'erro';
        mensagemMeta.hidden = false;
        campoValorMeta.focus();
        return;
    }

    const mes = chaveMes(mesAtual);
    const salvou = destino.conjunta
        ? salvarMetaGeral(mes, valorCentavos)
        : atualizarPet(destino.pet.id, {
            orcamentosDespesas: {
                ...(destino.pet.orcamentosDespesas && typeof destino.pet.orcamentosDespesas === 'object'
                    ? destino.pet.orcamentosDespesas
                    : {}),
                [mes]: valorCentavos
            }
        });
    if (!salvou) {
        mensagemMeta.textContent = 'Não foi possível salvar a meta neste navegador.';
        mensagemMeta.dataset.estado = 'erro';
        mensagemMeta.hidden = false;
        return;
    }

    pets = listarPets();
    if (petAtual) petAtual = pets.find(item => item.id === petAtual.id) ?? null;
    formularioMeta.hidden = false;
    campoPetMeta.hidden = !todosPetsSelecionados;
    mensagemMeta.textContent = destino.conjunta
        ? 'Meta conjunta salva neste navegador.'
        : 'Meta mensal salva neste navegador.';
    mensagemMeta.dataset.estado = 'sucesso';
    mensagemMeta.hidden = false;
    campoValorMeta.value = (valorCentavos / 100).toFixed(2);
    if (timerFeedbackMeta) window.clearTimeout(timerFeedbackMeta);
    timerFeedbackMeta = window.setTimeout(() => {
        if (mensagemMeta.dataset.estado === 'sucesso') mensagemMeta.hidden = true;
        timerFeedbackMeta = null;
    }, 3000);
    void renderizarMes();
}

// Confirma o formato e a existência real da data informada.
function validarData(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    const valor = new Date(`${data}T12:00:00`);
    return !Number.isNaN(valor.getTime()) && dataLocalISO(valor) === data;
}

async function excluirDespesa(despesa) {
    const confirmado = await confirmarExclusao({
        titulo: 'Excluir despesa?',
        mensagem: `A despesa ${despesa.descricao} será removida do extrato.`
    });
    if (!confirmado) return;

    const grupo = document.getElementById(`despesas-${despesa.categoria}`);
    const id = String(despesa.id);
    const ids = [id];
    ids.forEach(id => {
        exclusoesPendentes.add(id);
        categoriaExclusaoPendentePorId.set(id, despesa.categoria);
    });
    void renderizarMes();
    // Mantém a categoria visível durante o prazo para desfazer, mesmo se era o último lançamento.
    document.querySelector('.historico-despesas').hidden = false;
    grupo.hidden = false;

    oferecerDesfazerExclusao({
        antesDe: grupo.querySelector('.lista-lancamentos'),
        mensagem: 'Despesa removida do extrato.',
        aoDesfazer() {
            ids.forEach(id => {
                exclusoesPendentes.delete(id);
                categoriaExclusaoPendentePorId.delete(id);
            });
            void renderizarMes();
        },
        async aoExcluir() {
            const excluida = await excluirDespesaDoRepositorio(id, despesa.petIds);
            if (!excluida) throw new Error('Não foi possível excluir a despesa.');
            ids.forEach(id => {
                exclusoesPendentes.delete(id);
                categoriaExclusaoPendentePorId.delete(id);
            });
            await renderizarMes();
        },
        aoFalhar(erro) {
            ids.forEach(id => {
                exclusoesPendentes.delete(id);
                categoriaExclusaoPendentePorId.delete(id);
            });
            void renderizarMes();
            informarSelecao(erro.message || 'Não foi possível excluir a despesa.', true);
        }
    });
}

// Troca entre um pet específico e a visão conjunta de todos os pets.
seletorPet.addEventListener('change', () => {
    if (seletorPet.value === '__todos__') {
        selecionarTodosPets();
        return;
    }
    selecionarPet(pets.find(pet => pet.id === seletorPet.value) ?? null);
});

// Navega um mês para trás ou para frente no extrato.
document.querySelector('[data-acao="mes-anterior"]')
    .addEventListener('click', () => mudarMes(-1));
document.querySelector('[data-acao="mes-seguinte"]')
    .addEventListener('click', () => mudarMes(1));

conteudo.addEventListener('click', event => {
    const botaoExcluir = event.target.closest('[data-excluir-despesa]');
    const despesa = botaoExcluir && despesasRemoviveis.get(botaoExcluir.dataset.excluirDespesa);
    if (despesa && botaoExcluir) void excluirDespesa(despesa);
});

botaoEditarMeta.addEventListener('click', () => {
    if (formularioMeta.hidden) abrirEditorMeta();
    else formularioMeta.hidden = true;
});
botaoCancelarMeta.addEventListener('click', () => {
    formularioMeta.hidden = true;
});
seletorPetMeta.addEventListener('change', carregarValorMeta);
formularioMeta.addEventListener('submit', salvarMeta);

// Atualiza os dados e o seletor se outra tela cadastrar ou alterar um pet.
window.addEventListener('keeperhub:pets-atualizados', () => {
    try {
        prepararSelecao();
    } catch (erro) {
        informarSelecao(erro.message || 'Não foi possível atualizar os pets.', true);
    }
});

// Prepara a tela e exibe erros sem apagar os dados existentes caso o carregamento falhe.
try {
    prepararSelecao();
    botaoAdicionar.inert = false;
    mostrarFeedbackDeCadastro();
} catch (erro) {
    seletorPet.disabled = true;
    conteudo.hidden = true;
    botaoAdicionar.hidden = true;
    atualizarNoContent(true);
    informarSelecao(erro.message || 'Não foi possível carregar os pets.', true);
}
