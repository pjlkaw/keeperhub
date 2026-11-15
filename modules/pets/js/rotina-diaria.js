// Exibe somente dados de rotina que foram salvos no cadastro do pet.
import { definirObservacoesDoBanco, listarPets } from './armazenamento.js';
import { atualizarObservacaoApi, cadastrarObservacaoApi, excluirObservacaoApi } from './api.js';
import { itensDoDia, tituloRotina } from './rotinas.js';
import { removerRotina, removerRotinas, rotinasDoPet } from './rotinas-armazenamento.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';
import { agruparRegistros } from './selecao-pets.js';

// Os dados principais dos pets vêm da API; carrega antes de montar a página.
// Se falhar, listarPets() lança o erro e a página mostra a mensagem.
await carregarPetsDoServidor();


// Busca as áreas que a página preenche conforme a rotina salva do pet.
const main = document.querySelector('.rotina-diaria');
const seletorSecao = main.querySelector('.seletor-pet-rotina');
const seletorPet = document.getElementById('pet-rotina');
const status = document.getElementById('status-rotina-diaria');
const botaoAdicionar = document.getElementById('btn-add-section');
const secoesConteudo = [
    main.querySelector('.rotina-diaria__hoje'),
    main.querySelector('.higiene-bem-estar'),
    main.querySelector('.rotina-alimentar'),
    main.querySelector('.lazer'),
    main.querySelector('.anotacoes-comportamento')
];

// Mantém em memória os pets disponíveis e o pet atualmente consultado.
let pets = [];
let petAtual = null;
let mostrandoTodos = false;

// Rotinas removidas que ainda podem ser restauradas (chave: pet:tipo:id) e dados dos botões Remover.
const exclusoesPendentes = new Set();
const rotinasRemoviveis = new Map();

const NOMES_TIPO = { higiene: 'Higiene', alimentar: 'Alimentação', lazer: 'Lazer' };
const NOMES_DIAS = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom' };
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];
const HORARIO_VALIDO = /^([01]\d|2[0-3]):[0-5]\d$/;

// Escapa caracteres especiais antes de inserir dados em HTML.
function escapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function chaveExclusao(pet, tipo, id) {
    return `${pet.id}:${tipo}:${id}`;
}

// Converte AAAA-MM-DD em DD/MM (vazio se a data for inválida).
function diaMes(iso) {
    const partes = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso ?? '');
    return partes ? `${partes[2]}/${partes[1]}` : '';
}

// Atualiza o pet na URL sem recarregar a página.
function atualizarUrl(id, todos = false) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
    if (todos) url.searchParams.set('todos', '1');
    else url.searchParams.delete('todos');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Lista as rotinas válidas de um tipo, ordenadas por horário.
// Com ocultarPendentes, esconde as que estão aguardando o prazo do "Desfazer".
function registrosDoTipo(pet, tipo, ocultarPendentes = true) {
    return rotinasDoPet(pet, tipo)
        .filter(registro =>
            registro &&
            typeof registro.horario === 'string' &&
            HORARIO_VALIDO.test(registro.horario) &&
            (tipo !== 'alimentar' || (typeof registro.nome === 'string' && registro.nome.trim())) &&
            !(ocultarPendentes && exclusoesPendentes.has(chaveExclusao(pet, tipo, registro.id)))
        )
        .slice()
        .sort((a, b) => a.horario.localeCompare(b.horario));
}

// Retorna as observações alimentares salvas, removendo espaços nas pontas.
function observacoesDoPet(pet) {
    return typeof pet?.rotinaAlimentar?.observacoes === 'string'
        ? pet.rotinaAlimentar.observacoes.trim()
        : '';
}

// Notas de comportamento do pet (já vêm da mais nova para a mais antiga).
// Com ocultarPendentes, esconde as que estão aguardando o prazo do "Desfazer".
function notasDoPet(pet, ocultarPendentes = true) {
    return (Array.isArray(pet?.observacoes) ? pet.observacoes : [])
        .filter(nota => nota && typeof nota.texto === 'string' && nota.texto.trim())
        .filter(nota => !(ocultarPendentes && exclusoesPendentes.has(chaveExclusao(pet, 'nota', nota.id))));
}

// Considera que há rotina cadastrada se existir refeição, higiene, lazer, observação ou nota.
// Rotinas aguardando "Desfazer" ainda contam, para a página não sumir sob o aviso.
function temRotinaSalva(pet) {
    return ['higiene', 'alimentar', 'lazer'].some(tipo => registrosDoTipo(pet, tipo, false).length > 0) ||
        Boolean(observacoesDoPet(pet)) || notasDoPet(pet, false).length > 0;
}

// 'AAAA-MM-DDTHH:MM' -> '15/11 às 00:30' (com o ano quando não for o ano atual).
function dataHoraNota(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor ?? '');
    if (!partes) return '';
    const [, ano, mes, dia, hora, minuto] = partes;
    const data = Number(ano) === new Date().getFullYear() ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`;
    return `${data} às ${hora}:${minuto}`;
}

// Nota em edição (o texto volta para o campo e o envio passa a salvar a alteração).
let notaEmEdicao = null;
const notasRemoviveis = new Map();

function criarItemNota(pet, nota) {
    const li = document.createElement('li');
    li.className = 'anotacao-comportamento';
    const chave = crypto.randomUUID();
    notasRemoviveis.set(chave, { pet, nota });
    li.innerHTML = `<p class="anotacao-comportamento__texto">${escapar(nota.texto)}</p><time class="anotacao-comportamento__data-hora" datetime="${escapar(nota.data)}">${escapar(dataHoraNota(nota.data))}</time><div class="acoes-cartao-registro"><button type="button" class="botao-texto" data-editar-nota="${chave}">Editar</button><button type="button" class="botao-texto" data-remover-nota="${chave}">Remover</button></div>`;
    return li;
}

// Resumo curto da frequência, em português.
function resumoFrequencia(tipo, registro) {
    if (tipo === 'alimentar') return '';
    let texto = '';
    if (tipo === 'higiene') {
        const rotulos = { semanal: 'Semanal', quinzenal: 'A cada 15 dias', mensal: 'Mensal' };
        texto = rotulos[registro.frequencia] ?? '';
        const desde = diaMes(registro.data);
        if (texto && desde) texto += ` · desde ${desde}`;
    } else if (registro.frequencia === 'diaria') {
        texto = 'Todo dia';
    } else if (registro.frequencia === 'dias_semana') {
        const dias = Array.isArray(registro.diasSemana) ? registro.diasSemana : [];
        texto = ORDEM_DIAS.filter(dia => dias.includes(dia)).map(dia => NOMES_DIAS[dia]).join(', ');
    } else if (registro.frequencia === 'uma_vez') {
        const dia = diaMes(registro.data);
        texto = dia ? `Em ${dia}` : 'Uma vez';
    }
    if (tipo === 'lazer' && Number.isInteger(registro.duracaoMin) && registro.duracaoMin > 0) {
        texto += `${texto ? ' · ' : ''}${registro.duracaoMin} min`;
    }
    return texto;
}

// Monta o endereço do formulário para adicionar (sem registro) ou editar uma rotina.
function urlFormulario(tipo, pet, registro, voltarParaTodos = false) {
    const url = new URL('cadastrar-rotina.html', location.href);
    url.searchParams.set('tipo', tipo);
    url.searchParams.set('petId', pet.id);
    if (voltarParaTodos) url.searchParams.set('todos', '1');
    if (registro) url.searchParams.set('id', registro.id);
    return url.pathname.split('/').pop() + url.search;
}

// Cria o cartão de uma rotina com resumo, observação e ações.
function criarCartaoRotina(pet, tipo, registro, membros = [{ pet, registro }], todos = false) {
    const li = document.createElement('li');
    const titulo = tituloRotina(tipo, registro).trim() || NOMES_TIPO[tipo];
    const resumo = resumoFrequencia(tipo, registro);
    const nomes = membros.map(membro => membro.pet.nome);
    const etiqueta = nomes.length
        ? `<span class="etiqueta-pets-registro">${escapar(nomes.join(', '))}</span>`
        : '';
    const observacao = typeof registro.observacao === 'string' && registro.observacao.trim()
        ? `<p class="cartao-rotina__observacao">${escapar(registro.observacao.trim())}</p>`
        : '';

    let acoes = '';
    if (registro.id !== undefined && registro.id !== null && registro.id !== '') {
        const chave = crypto.randomUUID();
        rotinasRemoviveis.set(chave, { pet, tipo, registro, titulo, membros });
        acoes = `<div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlFormulario(tipo, pet, registro, todos))}">Editar</a><button type="button" class="botao-texto" data-remover-rotina="${chave}">Remover</button></div>`;
    }

    li.innerHTML = `<article class="card cartao-rotina"><div class="cartao-rotina__informacoes"><h3 class="cartao-rotina__titulo">${escapar(titulo)}${etiqueta ? ` ${etiqueta}` : ''}</h3>${resumo ? `<p class="cartao-rotina__resumo">${escapar(resumo)}</p>` : ''}${observacao}${acoes}</div><time class="cartao-rotina__horario" datetime="${escapar(registro.horario)}">${escapar(registro.horario)}</time></article>`;
    return li;
}

// Cria um item da linha "Hoje": horário, título e tipo da rotina.
function criarItemHoje(item, nomesPets = [], petPadrao = null) {
    const li = document.createElement('li');
    li.className = 'linha-tempo-rotina__item';
    const identificacaoPet = mostrandoTodos && nomesPets.length
        ? (nomesPets.length > 1 ? `${nomesPets.length} pets` : nomesPets[0])
        : '';
    const pets = identificacaoPet
        ? `<span class="linha-tempo-rotina__pets">${escapar(identificacaoPet)}</span>`
        : '';
    const membro = item.membros?.[0];
    const pet = membro?.pet ?? petPadrao;
    const registro = membro?.registro?.registro ?? item.registro;
    const editar = item.tipo === 'alimentar' && pet && registro?.id !== undefined && registro.id !== null && registro.id !== ''
        ? `<a class="botao-texto linha-tempo-rotina__editar" href="${escapar(urlFormulario('alimentar', pet, registro, mostrandoTodos))}">Editar</a>`
        : '';
    li.innerHTML = `<time class="linha-tempo-rotina__horario" datetime="${escapar(item.horario)}">${escapar(item.horario)}</time><div class="linha-tempo-rotina__informacoes"><p class="linha-tempo-rotina__nome">${escapar(item.titulo || NOMES_TIPO[item.tipo])}</p>${pets}${editar}</div><span class="etiqueta-status">${NOMES_TIPO[item.tipo]}</span>`;
    return li;
}

// Propaga o pet selecionado para os links de edição e para o botão de adicionar.
function atualizarLinks() {
    const parametros = new URLSearchParams();
    if (petAtual) parametros.set('petId', petAtual.id);
    else if (mostrandoTodos) parametros.set('todos', '1');
    const consulta = parametros.size ? `?${parametros}` : '';

    main.querySelectorAll('a[data-manter-pet]').forEach(link => {
        const url = new URL(link.getAttribute('href'), location.href);
        if (petAtual) url.searchParams.set('petId', petAtual.id);
        else url.searchParams.delete('petId');
        if (mostrandoTodos) url.searchParams.set('todos', '1');
        else url.searchParams.delete('todos');
        link.href = url.pathname.split('/').pop() + url.search + url.hash;
    });

    const destino = `/modules/pets/components/cadastrar-rotina.html${consulta}`;
    window.keeperhubModuleConfig.addUrl = destino;
    const linkAdicionar = botaoAdicionar.querySelector('#btn-add');
    if (linkAdicionar) linkAdicionar.href = destino;
}

// Preenche os cartões com as rotinas salvas do pet.
function renderizarRotina(petsVisiveis, todos = false) {
    const observacoes = petsVisiveis
        .map(pet => ({ nome: pet.nome, texto: observacoesDoPet(pet) }))
        .filter(item => item.texto)
        .map(item => todos ? `${item.nome}: ${item.texto}` : item.texto)
        .join('\n');
    const campoObservacoes = document.getElementById('resumo-refeicoes-observacoes');
    const listaAtividades = document.getElementById('linha-tempo-rotina');
    const listaAnotacoes = main.querySelector('.anotacoes-comportamento__lista');
    const listas = {
        higiene: main.querySelector('.higiene-bem-estar > ul'),
        alimentar: document.getElementById('resumo-refeicoes'),
        lazer: main.querySelector('.lazer > ul')
    };
    const vazios = {
        higiene: main.querySelector('[data-vazio="higiene"]'),
        alimentar: document.getElementById('resumo-refeicoes-vazio'),
        lazer: main.querySelector('[data-vazio="lazer"]')
    };

    rotinasRemoviveis.clear();

    // Em "Todos os pets", agrupa uma rotina compartilhada em um único cartão.
    for (const tipo of ['higiene', 'alimentar', 'lazer']) {
        const grupos = todos
            ? agruparRegistros(petsVisiveis, pet => registrosDoTipo(pet, tipo))
            : registrosDoTipo(petsVisiveis[0], tipo).map(registro => ({ ...registro, membros: [{ pet: petsVisiveis[0], registro }] }));
        grupos.sort((a, b) => a.horario.localeCompare(b.horario));
        listas[tipo].replaceChildren(...grupos.map(grupo => {
            const membro = grupo.membros[0];
            return criarCartaoRotina(membro.pet, tipo, membro.registro, grupo.membros, todos);
        }));
        vazios[tipo].hidden = grupos.length > 0;
    }

    // Observações antigas da rotina alimentar: somente leitura.
    campoObservacoes.textContent = observacoes;
    campoObservacoes.hidden = !observacoes;

    // "Hoje": só o que ocorre na data local de hoje, em ordem de horário.
    const itensPorPet = petsVisiveis.map(pet => ({
        pet,
        itens: itensDoDia(pet, new Date()).filter(item =>
            !exclusoesPendentes.has(chaveExclusao(pet, item.tipo, item.registro.id))
        )
    }));
    const itensHoje = todos
        ? agruparRegistros(
            petsVisiveis,
            pet => (itensPorPet.find(item => item.pet.id === pet.id)?.itens ?? [])
                .map(item => ({ ...item, grupoId: item.registro.grupoId })),
            item => item.tipo
        )
        : itensPorPet[0].itens.map(item => ({ ...item, nomesPets: [petsVisiveis[0].nome] }));
    itensHoje.sort((a, b) => a.horario.localeCompare(b.horario));
    listaAtividades.replaceChildren(...itensHoje.map(item =>
        criarItemHoje(item, item.nomesPets, petsVisiveis[0])
    ));
    main.querySelector('[data-vazio="atividades"]').hidden = itensHoje.length > 0;

    // Notas de comportamento: são de um pet só; em "Todos os pets" a seção fica oculta.
    notasRemoviveis.clear();
    const notas = todos ? [] : notasDoPet(petsVisiveis[0]);
    listaAnotacoes.replaceChildren(...notas.map(nota => criarItemNota(petsVisiveis[0], nota)));
    main.querySelector('[data-vazio="anotacoes"]').hidden = notas.length > 0;

    secoesConteudo.forEach(secao => { secao.hidden = false; });
    main.querySelector('.anotacoes-comportamento').hidden = todos;
    atualizarNoContent(true);
}

// Mostra uma mensagem de erro ou limpa a área de aviso das rotinas.
function avisarRotinas(mensagem) {
    const aviso = document.getElementById('resumo-refeicoes-mensagem');
    aviso.textContent = mensagem;
    aviso.hidden = !mensagem;
}

// Remove só do pet aberto, com confirmação e opção de desfazer (mesmo fluxo das medicações).
main.addEventListener('click', async event => {
    const botao = event.target.closest('[data-remover-rotina]');
    const alvo = botao && rotinasRemoviveis.get(botao.dataset.removerRotina);
    if (!alvo) return;

    try {
        const { pet, tipo, registro, titulo, membros } = alvo;
        const removerGrupo = mostrandoTodos;
        const alvos = removerGrupo ? membros : [{ pet, registro }];
        const confirmado = await confirmarExclusao({
            titulo: 'Remover rotina?',
            mensagem: removerGrupo && alvos.length > 1
                ? `A rotina ${titulo} será removida de ${alvos.map(item => item.pet.nome).join(', ')}.`
                : `A rotina ${titulo} será removida de ${pet.nome}.`,
            confirmar: 'Remover'
        });
        if (!confirmado) return;

        const chaves = alvos.map(item => chaveExclusao(item.pet, tipo, item.registro.id));
        avisarRotinas('');
        chaves.forEach(chave => exclusoesPendentes.add(chave));
        const secao = botao.closest('section');
        renderizarSelecaoAtual();

        oferecerDesfazerExclusao({
            antesDe: secao,
            mensagem: 'Rotina removida da lista.',
            aoDesfazer() {
                chaves.forEach(chave => exclusoesPendentes.delete(chave));
                renderizarSelecaoAtual();
            },
            async aoExcluir() {
                const removida = removerGrupo
                    ? await removerRotinas(tipo, alvos)
                    : await removerRotina(tipo, pet, registro.id);
                if (!removida) throw new Error('Não foi possível remover a rotina.');
                chaves.forEach(chave => exclusoesPendentes.delete(chave));
                pets = listarPets();
                renderizarSelecaoAtual();
            },
            aoFalhar(erro) {
                chaves.forEach(chave => exclusoesPendentes.delete(chave));
                renderizarSelecaoAtual();
                avisarRotinas(erro.message || 'Não foi possível remover a rotina.');
            }
        });
    } catch (erro) {
        avisarRotinas(erro.message || 'Não foi possível remover a rotina.');
    }
});

// ==================================================
// NOTAS DE COMPORTAMENTO
// ==================================================
const formularioNota = main.querySelector('.anotacoes-comportamento__formulario');
const campoNota = document.getElementById('nova-observacao');
const botaoEnviarNota = formularioNota.querySelector('button[type="submit"]');
const areaEdicaoNota = main.querySelector('[data-edicao-nota]');

function avisarNotas(mensagem) {
    const aviso = document.getElementById('anotacoes-mensagem');
    aviso.textContent = mensagem;
    aviso.hidden = !mensagem;
}

function sairDaEdicaoNota() {
    notaEmEdicao = null;
    campoNota.value = '';
    areaEdicaoNota.hidden = true;
    botaoEnviarNota.setAttribute('aria-label', 'Enviar observação');
}

// Depois de salvar, relê os pets da memória e redesenha o pet aberto.
function atualizarPetAberto(petId) {
    pets = listarPets();
    const pet = pets.find(item => item.id === petId) ?? null;
    if (petAtual?.id === petId) selecionarPet(pet);
}

formularioNota.addEventListener('submit', async event => {
    event.preventDefault();
    if (!petAtual) return;
    const texto = campoNota.value.trim();
    avisarNotas('');
    if (!texto) {
        avisarNotas('Escreva a observação antes de enviar.');
        campoNota.focus();
        return;
    }

    const petId = petAtual.id;
    botaoEnviarNota.disabled = true;
    try {
        if (notaEmEdicao) {
            definirObservacoesDoBanco(await atualizarObservacaoApi(notaEmEdicao.id, texto));
        } else {
            definirObservacoesDoBanco((await cadastrarObservacaoApi(petId, texto)).observacoes);
        }
        sairDaEdicaoNota();
        atualizarPetAberto(petId);
    } catch (erro) {
        avisarNotas(erro.message || 'Não foi possível salvar a observação.');
    } finally {
        botaoEnviarNota.disabled = false;
    }
});

areaEdicaoNota.querySelector('[data-cancelar-nota]').addEventListener('click', () => {
    sairDaEdicaoNota();
    avisarNotas('');
});

main.addEventListener('click', async event => {
    const editar = event.target.closest('[data-editar-nota]');
    if (editar) {
        const alvo = notasRemoviveis.get(editar.dataset.editarNota);
        if (!alvo) return;
        notaEmEdicao = alvo.nota;
        campoNota.value = alvo.nota.texto;
        areaEdicaoNota.hidden = false;
        botaoEnviarNota.setAttribute('aria-label', 'Salvar alteração da observação');
        avisarNotas('');
        campoNota.focus();
        return;
    }

    const remover = event.target.closest('[data-remover-nota]');
    const alvo = remover && notasRemoviveis.get(remover.dataset.removerNota);
    if (!alvo) return;

    try {
        const { pet, nota } = alvo;
        const confirmado = await confirmarExclusao({
            titulo: 'Remover observação?',
            mensagem: `A observação será removida de ${pet.nome}.`,
            confirmar: 'Remover'
        });
        if (!confirmado) return;

        if (notaEmEdicao?.id === nota.id) sairDaEdicaoNota();
        const chave = chaveExclusao(pet, 'nota', nota.id);
        avisarNotas('');
        exclusoesPendentes.add(chave);
        renderizarSelecaoAtual();

        oferecerDesfazerExclusao({
            antesDe: listaAnotacoes(),
            mensagem: 'Observação removida da lista.',
            aoDesfazer() {
                exclusoesPendentes.delete(chave);
                if (petAtual?.id === pet.id) renderizarSelecaoAtual();
            },
            async aoExcluir() {
                definirObservacoesDoBanco(await excluirObservacaoApi(nota.id));
                exclusoesPendentes.delete(chave);
                atualizarPetAberto(pet.id);
            },
            aoFalhar(erro) {
                exclusoesPendentes.delete(chave);
                if (petAtual?.id === pet.id) renderizarSelecaoAtual();
                avisarNotas(erro.message || 'Não foi possível remover a observação.');
            }
        });
    } catch (erro) {
        avisarNotas(erro.message || 'Não foi possível remover a observação.');
    }
});

function listaAnotacoes() {
    return main.querySelector('.anotacoes-comportamento__lista');
}

// Seleciona um pet e decide entre exibir a rotina ou o no-content compartilhado.
function renderizarSelecaoAtual() {
    const petsVisiveis = mostrandoTodos ? pets : petAtual ? [petAtual] : [];
    if (petsVisiveis.length && petsVisiveis.some(temRotinaSalva)) {
        status.hidden = true;
        status.textContent = '';
        renderizarRotina(petsVisiveis, mostrandoTodos);
        return;
    }

    const podeTrocarPet = !seletorSecao.hidden;
    status.dataset.estado = 'informativo';
    status.textContent = podeTrocarPet
        ? (petsVisiveis.length ? 'Nenhuma rotina para o pet selecionado.' : 'Selecione um pet para consultar a rotina.')
        : '';
    status.hidden = !podeTrocarPet;
    secoesConteudo.forEach(secao => { secao.hidden = true; });
    atualizarNoContent(podeTrocarPet);
}

function selecionarPet(valor) {
    mostrandoTodos = valor === '__todos__';
    const pet = mostrandoTodos ? null : valor && typeof valor === 'object'
        ? valor
        : pets.find(item => item.id === valor) ?? null;
    if (mostrandoTodos || pet?.id !== petAtual?.id) sairDaEdicaoNota();
    petAtual = pet;
    seletorPet.value = mostrandoTodos ? '__todos__' : pet?.id ?? '';
    main.dataset.petId = pet?.id ?? '';
    atualizarUrl(pet?.id, mostrandoTodos);
    atualizarLinks();
    renderizarSelecaoAtual();
}

// Carrega os pets, prepara o seletor e define o pet inicial quando possível.
function iniciar() {
    try {
        pets = listarPets();
        const parametros = new URLSearchParams(location.search);
        const idInformado = parametros.get('petId');
        const petInformado = pets.find(pet => pet.id === idInformado) ?? null;
        const temRotinaEmAlgumPet = pets.some(temRotinaSalva);

        // No primeiro cadastro, mantém somente o no-content compartilhado;
        // o seletor aparece quando já existe rotina para consultar.
        seletorSecao.hidden = pets.length < 2 || !temRotinaEmAlgumPet;
        botaoAdicionar.hidden = pets.length === 0;

        // Permite filtrar um pet ou consultar os registros de todos juntos.
        if (pets.length > 1) seletorPet.append(new Option('Todos os pets', '__todos__'));
        pets.forEach(pet => {
            const opcao = document.createElement('option');
            opcao.value = pet.id;
            opcao.textContent = pet.nome;
            seletorPet.append(opcao);
        });

        seletorPet.addEventListener('change', () => {
            selecionarPet(seletorPet.value);
        });

        // Respeita o pet vindo da tela anterior; sem filtro, começa em Todos os pets.
        if (petInformado) selecionarPet(petInformado);
        else if (pets.length > 1 && temRotinaEmAlgumPet) selecionarPet('__todos__');
        else selecionarPet(pets.length === 1 ? pets[0] : null);
        botaoAdicionar.inert = false;

    } catch (erro) {
        botaoAdicionar.hidden = true;
        secoesConteudo.forEach(secao => { secao.hidden = true; });
        status.textContent = erro.message || 'Não foi possível carregar a rotina salva.';
        status.dataset.estado = 'erro';
        status.hidden = false;
        atualizarNoContent(false);
    }
}

iniciar();
