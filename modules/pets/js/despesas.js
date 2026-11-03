// Cadastro, resumo mensal e extrato local das despesas dos pets.
import { atualizarPet, listarPets } from './armazenamento.js';
import { atualizarNoContent } from '/shared/services/no-content.js';

const main = document.getElementById('conteudo-principal');
const seletorPet = document.getElementById('pet-despesas');
const secaoSeletor = seletorPet.closest('.seletor-pet-despesas');
const statusPet = document.getElementById('status-pet-despesas');
const conteudo = document.querySelector('.despesas-conteudo');
const botaoAdicionar = document.querySelector('.despesas-adicionar');
const popover = document.getElementById('nova-despesa');
const form = document.getElementById('formulario-despesa');
const statusForm = document.getElementById('mensagem-despesa');
const botaoSalvar = form.querySelector('[data-acao="salvar-despesa"]');
const campoData = document.getElementById('data-despesa');
const destinoDespesa = document.getElementById('destino-despesa');
const seletorDestino = document.getElementById('pet-destino-despesa');

const CATEGORIAS = ['alimentacao', 'saude', 'higiene', 'lazer'];
const ORCAMENTO_MENSAL_PADRAO = 60000;
let pets = [];
let petAtual = null;
let todosPetsSelecionados = false;
let mesAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let salvando = false;

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
    statusPet.dataset.estado = erro ? 'erro' : 'sucesso';
    statusPet.setAttribute('role', erro ? 'alert' : 'status');
}

// Atualiza o aviso exibido dentro do formulário de despesa.
function informarFormulario(mensagem, erro = false) {
    statusForm.textContent = mensagem;
    statusForm.dataset.estado = erro ? 'erro' : 'sucesso';
    statusForm.setAttribute('role', erro ? 'alert' : 'status');
}

// Mantém o pet selecionado na URL sem recarregar a página.
function atualizarUrlPet(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Descarta registros corrompidos ou incompatíveis antes de usá-los nos cálculos.
function despesasValidas(pet) {
    if (!Array.isArray(pet?.despesas)) return [];
    return pet.despesas.filter(despesa =>
        despesa &&
        typeof despesa === 'object' &&
        validarData(despesa.data) &&
        CATEGORIAS.includes(despesa.categoria) &&
        Number.isSafeInteger(Number(despesa.valorCentavos)) &&
        Number(despesa.valorCentavos) > 0
    );
}

// Retorna as despesas do pet atual ou de todos os pets, incluindo o nome do pet.
function despesasDoEscopo() {
    const escopo = todosPetsSelecionados ? pets : petAtual ? [petAtual] : [];
    return escopo.flatMap(pet => despesasValidas(pet).map(despesa => ({
        ...despesa,
        petId: pet.id,
        petNome: pet.nome
    })));
}

// Filtra as despesas visíveis para o mês que está selecionado na tela.
function despesasDoMes() {
    const mes = chaveMes(mesAtual);
    return despesasDoEscopo().filter(despesa => despesa.data.slice(0, 7) === mes);
}

// Retorna o orçamento definido para o pet e mês, ou o valor padrão em centavos.
function orcamentoDoPet(pet, mes) {
    const orcamentos = pet.orcamentosDespesas &&
        typeof pet.orcamentosDespesas === 'object'
        ? pet.orcamentosDespesas
        : {};
    const valor = Number(orcamentos[mes]);
    return Number.isSafeInteger(valor) && valor >= 0
        ? valor
        : ORCAMENTO_MENSAL_PADRAO;
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

// Atualiza o resumo, o orçamento, o saldo e os totais de cada categoria.
function atualizarResumo(despesas) {
    const totais = Object.fromEntries(CATEGORIAS.map(categoria => [
        categoria,
        totalPorCategoria(despesas, categoria)
    ]));
    const total = Object.values(totais).reduce((soma, valor) => soma + valor, 0);
    const mes = chaveMes(mesAtual);
    const orcamento = escopoAtual().reduce(
        (soma, pet) => soma + orcamentoDoPet(pet, mes),
        0
    );
    // Saldo negativo indica que o total de despesas passou do orçamento.
    const saldo = orcamento - total;
    // Evita divisão por zero quando o orçamento é zero.
    const percentual = orcamento > 0
        ? total / orcamento * 100
        : total > 0 ? 100 : 0;

    // Atualiza o mês apresentado no cabeçalho e no elemento semântico <time>.
    const nomeMes = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).format(mesAtual);
    const titulo = document.getElementById('resumo-despesas-heading');
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

    const valorOrcamento = document.querySelector('.resumo-despesas__orcamento data');
    valorOrcamento.value = (orcamento / 100).toFixed(2);
    valorOrcamento.textContent = formatarMoeda(orcamento);

    document.querySelector('.resumo-despesas__linha strong').textContent =
        `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(percentual)}% consumido`;

    // A barra não pode ter máximo zero; nesse caso usa 1 apenas para exibição.
    const progresso = document.getElementById('progresso-orcamento');
    progresso.max = orcamento || 1;
    progresso.value = Math.min(total, orcamento || 1);
    progresso.textContent = `${Math.round(percentual)}%`;

    const saldoData = document.querySelector('.resumo-despesas__livre data');
    saldoData.value = (saldo / 100).toFixed(2);
    saldoData.textContent = formatarMoeda(saldo);
    const saldoTexto = saldoData.closest('strong').lastChild;
    if (saldoTexto?.nodeType === Node.TEXT_NODE) {
        saldoTexto.textContent = saldo >= 0 ? ' livres' : ' acima do teto';
    }

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
        `${CATEGORIAS.filter(categoria => totais[categoria] > 0).length} grupos ativos`;
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

// Monta um item do extrato usando elementos de texto para não interpretar dados como HTML.
function criarLancamento(despesa) {
    const item = document.createElement('li');
    const artigo = document.createElement('article');
    artigo.className = 'lancamento';
    artigo.dataset.categoria = despesa.categoria;

    const icone = document.createElement('span');
    icone.className = 'despesa-icone lancamento__icone';
    const glyph = document.createElement('i');
    glyph.className = `fa-solid despesa-glyph ${classeIcone(despesa.categoria)}`;
    glyph.setAttribute('aria-hidden', 'true');
    icone.append(glyph);

    const informacoes = document.createElement('div');
    informacoes.className = 'lancamento__informacoes';
    const titulo = document.createElement('h4');
    titulo.className = 'lancamento__titulo';
    titulo.textContent = despesa.descricao;

    // Na visão agregada, identifica a qual pet pertence o lançamento.
    if (todosPetsSelecionados) {
        const pet = document.createElement('span');
        pet.className = 'lancamento__pet';
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
    item.append(artigo);
    return item;
}

// Agrupa os lançamentos por categoria e atualiza subtotais e estados vazios.
function renderizarGrupos(despesas) {
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
            const vazio = document.createElement('li');
            vazio.className = 'lancamentos-vazios';
            vazio.textContent = 'Nenhum lançamento neste mês.';
            lista.append(vazio);
        } else {
            lista.append(...linhas.map(criarLancamento));
        }
    });
}

// Prepara a escolha do pet de destino quando a despesa é criada na visão geral.
function atualizarDestinoFormulario() {
    const mostrarSelecao = todosPetsSelecionados;
    destinoDespesa.hidden = !mostrarSelecao;
    seletorDestino.required = mostrarSelecao;
    seletorDestino.replaceChildren();

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = 'Selecione um pet';
    inicial.disabled = true;
    inicial.selected = true;
    seletorDestino.append(inicial);

    pets.forEach(pet => {
        const opcao = document.createElement('option');
        opcao.value = pet.id;
        opcao.textContent = pet.nome;
        seletorDestino.append(opcao);
    });

    if (!mostrarSelecao && petAtual) {
        seletorDestino.value = petAtual.id;
    }
}

// Renderiza o mês atual ou mostra o estado compartilhado quando não há registros.
function renderizarMes() {
    const escopo = escopoAtual();
    const temDespesaNoEscopo = escopo.some(pet => despesasValidas(pet).length > 0);

    // Sem registros no escopo, mostra somente o componente vazio compartilhado.
    if (!escopo.length || !temDespesaNoEscopo) {
        conteudo.hidden = true;
        secaoSeletor.hidden = true;
        botaoAdicionar.hidden = pets.length === 0;
        informarSelecao('');
        atualizarNoContent(false);
        return;
    }

    conteudo.hidden = false;
    secaoSeletor.hidden = true;
    botaoAdicionar.hidden = false;
    atualizarNoContent(true);

    const despesas = despesasDoMes();
    atualizarResumo(despesas);
    renderizarGrupos(despesas);
    document.querySelectorAll('.despesas-navegar').forEach(botao => {
        botao.disabled = false;
        botao.removeAttribute('title');
    });
}

// Seleciona um pet e atualiza a página para mostrar somente os dados dele.
function selecionarPet(pet, atualizarUrl = true) {
    petAtual = pet;
    todosPetsSelecionados = false;
    seletorPet.value = pet?.id ?? '';
    main.dataset.petId = pet?.id ?? '';
    if (atualizarUrl) atualizarUrlPet(pet?.id);
    atualizarDestinoFormulario();
    renderizarMes();
}

// Alterna para a visão agregada, reunindo os dados de todos os pets.
function selecionarTodosPets() {
    petAtual = null;
    todosPetsSelecionados = true;
    seletorPet.value = '__todos__';
    main.dataset.petId = '';
    atualizarUrlPet(null);
    atualizarDestinoFormulario();
    renderizarMes();
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
    botaoSalvar.disabled = pets.length === 0;

    // Prioriza o pet informado na URL; sem ele, abre todos ou o único pet salvo.
    const idDaUrl = new URLSearchParams(window.location.search).get('petId');
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
        atualizarDestinoFormulario();
        renderizarMes();
    }
}

// Usa hoje no mês atual e o primeiro dia nos demais meses consultados.
function dataPadraoParaMes() {
    const hoje = new Date();
    if (chaveMes(hoje) === chaveMes(mesAtual)) return dataLocalISO(hoje);
    return `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;
}

// Muda o mês selecionado, atualiza a data do formulário e redesenha o resumo.
function mudarMes(diferenca) {
    mesAtual = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + diferenca, 1);
    campoData.value = dataPadraoParaMes();
    renderizarMes();
}

// Confirma o formato e a existência real da data informada.
function validarData(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    const valor = new Date(`${data}T12:00:00`);
    return !Number.isNaN(valor.getTime()) && dataLocalISO(valor) === data;
}

// Valida os campos e normaliza o valor para centavos antes de salvar.
function validarFormulario() {
    const descricao = form.elements.descricao.value.trim();
    const categoria = form.elements.categoria.value;
    const valor = Number(form.elements.valor.value);
    const data = campoData.value;
    const estabelecimento = form.elements.estabelecimento.value.trim();
    const observacoes = form.elements.observacoes.value.trim();
    const valorCentavos = Math.round(valor * 100);

    if (!descricao || descricao.length > 100) return { erro: 'Informe uma descrição com até 100 caracteres.' };
    if (!CATEGORIAS.includes(categoria)) return { erro: 'Selecione uma categoria válida.' };
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(valorCentavos)) {
        return { erro: 'Informe um valor válido maior que zero.' };
    }
    if (!validarData(data)) return { erro: 'Informe uma data válida.' };
    if (estabelecimento.length > 100 || observacoes.length > 500) {
        return { erro: 'Confira o limite de caracteres dos campos opcionais.' };
    }

    return { dados: { descricao, categoria, valorCentavos, data, estabelecimento, observacoes } };
}

// Adiciona a despesa ao pet escolhido e atualiza os dados em memória.
function salvarDespesa(dados, pet) {
    const despesas = despesasValidas(pet);
    const despesa = {
        id: globalThis.crypto?.randomUUID?.() || `despesa-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...dados,
        criadaEm: new Date().toISOString()
    };
    const atualizado = atualizarPet(pet.id, { despesas: [...despesas, despesa] });
    if (!atualizado) throw new Error('Este pet não foi encontrado no armazenamento.');

    pets = pets.map(item => item.id === atualizado.id ? atualizado : item);
    if (!todosPetsSelecionados) petAtual = atualizado;
    mesAtual = new Date(dados.data + 'T12:00:00');
    return despesa;
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

// Mostra um aviso quando o navegador detecta um campo inválido.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informarFormulario('Confira os campos destacados e tente novamente.', true);
}, true);

// Limpa mensagens de erro depois que a pessoa corrige ou altera os campos.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    event.target.removeAttribute('aria-invalid');
    if (statusForm.dataset.estado === 'erro') informarFormulario('');
});
form.addEventListener('change', () => {
    if (statusForm.dataset.estado === 'erro') informarFormulario('');
});

// Abre o formulário com o pet de destino e uma data compatível com o mês atual.
botaoAdicionar.addEventListener('click', () => {
    atualizarDestinoFormulario();
    campoData.value = dataPadraoParaMes();
});

// Valida o envio, grava a despesa no pet escolhido e limpa o formulário.
form.addEventListener('submit', event => {
    event.preventDefault();
    if (salvando) return;

    const validacao = validarFormulario();
    if (validacao.erro) {
        informarFormulario(validacao.erro, true);
        return;
    }
    if (!form.reportValidity()) return;

    const petDestino = todosPetsSelecionados
        ? pets.find(pet => pet.id === seletorDestino.value)
        : petAtual;
    if (!petDestino) {
        informarFormulario('Selecione o pet ao qual esta despesa pertence.', true);
        seletorDestino.focus();
        return;
    }

    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando…';
    try {
        salvarDespesa(validacao.dados, petDestino);
        renderizarMes();
        form.reset();
        atualizarDestinoFormulario();
        campoData.value = dataPadraoParaMes();
        informarFormulario('Despesa salva neste navegador.');
        popover.hidePopover?.();
    } catch (erro) {
        informarFormulario(erro.message || 'Não foi possível salvar a despesa.', true);
    } finally {
        salvando = false;
        botaoSalvar.disabled = pets.length === 0;
        botaoSalvar.textContent = 'Salvar despesa';
    }
});

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
    campoData.value = dataPadraoParaMes();
} catch (erro) {
    seletorPet.disabled = true;
    conteudo.hidden = true;
    botaoAdicionar.hidden = true;
    botaoSalvar.disabled = true;
    atualizarNoContent(true);
    informarSelecao(erro.message || 'Não foi possível carregar os pets.', true);
}
