// Exibe somente dados de rotina que foram salvos no cadastro do pet.
import { listarPets } from './armazenamento.js';
import { CATALOGO, itensDoDia, tituloRotina } from './rotinas.js';
import { removerRotina, rotinasDoPet } from './rotinas-armazenamento.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';

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
function atualizarUrl(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
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

// Considera que há rotina cadastrada se existir refeição, higiene, lazer ou observação.
// Rotinas aguardando "Desfazer" ainda contam, para a página não sumir sob o aviso.
function temRotinaSalva(pet) {
    return ['higiene', 'alimentar', 'lazer'].some(tipo => registrosDoTipo(pet, tipo, false).length > 0) ||
        Boolean(observacoesDoPet(pet));
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

// Nomes dos pets que compartilham o registro (mesmo grupoId na mesma lista de rotina).
function nomesDoGrupo(tipo, registro) {
    if (!registro.grupoId) return [];
    return listarPets()
        .filter(pet => rotinasDoPet(pet, tipo).some(item => item?.grupoId === registro.grupoId))
        .map(pet => pet.nome);
}

// Monta o endereço do formulário para adicionar (sem registro) ou editar uma rotina.
function urlFormulario(tipo, pet, registro) {
    const url = new URL('cadastrar-rotina.html', location.href);
    url.searchParams.set('tipo', tipo);
    url.searchParams.set('petId', pet.id);
    if (registro) url.searchParams.set('id', registro.id);
    return url.pathname.split('/').pop() + url.search;
}

// Cria o cartão de uma rotina com resumo, observação e ações.
function criarCartaoRotina(pet, tipo, registro) {
    const li = document.createElement('li');
    const titulo = tituloRotina(tipo, registro).trim() || NOMES_TIPO[tipo];
    const resumo = resumoFrequencia(tipo, registro);
    const nomes = nomesDoGrupo(tipo, registro);
    const etiqueta = nomes.length > 1
        ? `<span class="etiqueta-pets-registro">${escapar(nomes.join(', '))}</span>`
        : '';
    const observacao = typeof registro.observacao === 'string' && registro.observacao.trim()
        ? `<p class="cartao-rotina__observacao">${escapar(registro.observacao.trim())}</p>`
        : '';

    let acoes = '';
    if (registro.id !== undefined && registro.id !== null && registro.id !== '') {
        const chave = crypto.randomUUID();
        rotinasRemoviveis.set(chave, { pet, tipo, registro, titulo });
        acoes = `<div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlFormulario(tipo, pet, registro))}">Editar</a><button type="button" class="botao-texto" data-remover-rotina="${chave}">Remover</button></div>`;
    }

    li.innerHTML = `<article class="card cartao-rotina"><div class="cartao-rotina__informacoes"><h3 class="cartao-rotina__titulo">${escapar(titulo)}${etiqueta}</h3>${resumo ? `<p class="cartao-rotina__resumo">${escapar(resumo)}</p>` : ''}${observacao}${acoes}</div><time class="cartao-rotina__horario" datetime="${escapar(registro.horario)}">${escapar(registro.horario)}</time></article>`;
    return li;
}

// Cria um item da linha "Hoje": horário, título e tipo da rotina.
function criarItemHoje(item) {
    const li = document.createElement('li');
    li.className = 'linha-tempo-rotina__item';
    li.innerHTML = `<time class="linha-tempo-rotina__horario" datetime="${escapar(item.horario)}">${escapar(item.horario)}</time><div class="linha-tempo-rotina__informacoes"><p class="linha-tempo-rotina__nome">${escapar(item.titulo || NOMES_TIPO[item.tipo])}</p></div><span class="etiqueta-status">${NOMES_TIPO[item.tipo]}</span>`;
    return li;
}

// Propaga o pet selecionado para os links de edição e para o botão de adicionar.
function atualizarLinks() {
    const petQuery = petAtual ? `?petId=${encodeURIComponent(petAtual.id)}` : '';

    main.querySelectorAll('a[data-manter-pet]').forEach(link => {
        const url = new URL(link.getAttribute('href'), location.href);
        if (petAtual) url.searchParams.set('petId', petAtual.id);
        else url.searchParams.delete('petId');
        link.href = url.pathname.split('/').pop() + url.search + url.hash;
    });

    const destino = `/modules/pets/components/cadastrar-rotina.html${petQuery}`;
    window.keeperhubModuleConfig.addUrl = destino;
    const linkAdicionar = botaoAdicionar.querySelector('#btn-add');
    if (linkAdicionar) linkAdicionar.href = destino;
}

// Preenche os cartões com as rotinas salvas do pet.
function renderizarRotina(pet) {
    const observacoes = observacoesDoPet(pet);
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

    // Higiene, alimentação e lazer: todos os registros do pet.
    for (const tipo of ['higiene', 'alimentar', 'lazer']) {
        const registros = registrosDoTipo(pet, tipo);
        listas[tipo].replaceChildren(...registros.map(registro => criarCartaoRotina(pet, tipo, registro)));
        vazios[tipo].hidden = registros.length > 0;
    }

    // Observações antigas da rotina alimentar: somente leitura.
    campoObservacoes.textContent = observacoes;
    campoObservacoes.hidden = !observacoes;

    // "Hoje": só o que ocorre na data local de hoje, em ordem de horário.
    const itensHoje = itensDoDia(pet, new Date())
        .filter(item => !exclusoesPendentes.has(chaveExclusao(pet, item.tipo, item.registro.id)));
    listaAtividades.replaceChildren(...itensHoje.map(criarItemHoje));
    main.querySelector('[data-vazio="atividades"]').hidden = itensHoje.length > 0;

    // Notas de comportamento ainda não possuem persistência neste fluxo.
    listaAnotacoes.replaceChildren();
    main.querySelector('[data-vazio="anotacoes"]').hidden = false;

    secoesConteudo.forEach(secao => { secao.hidden = false; });
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
        const { pet, tipo, registro, titulo } = alvo;
        const confirmado = await confirmarExclusao({
            titulo: 'Remover rotina?',
            mensagem: `A rotina ${titulo} será removida de ${pet.nome}.`,
            confirmar: 'Remover'
        });
        if (!confirmado) return;

        const chave = chaveExclusao(pet, tipo, registro.id);
        avisarRotinas('');
        exclusoesPendentes.add(chave);
        renderizarRotina(pet);

        oferecerDesfazerExclusao({
            antesDe: botao.closest('section'),
            mensagem: 'Rotina removida da lista.',
            aoDesfazer() {
                exclusoesPendentes.delete(chave);
                if (petAtual?.id === pet.id) renderizarRotina(pet);
            },
            aoExcluir() {
                const removida = removerRotina(tipo, pet, registro.id);
                if (!removida) throw new Error('Não foi possível remover a rotina.');
                exclusoesPendentes.delete(chave);
                pets = listarPets();
                if (petAtual?.id === pet.id) selecionarPet(pets.find(item => item.id === pet.id) ?? null);
            },
            aoFalhar(erro) {
                exclusoesPendentes.delete(chave);
                if (petAtual?.id === pet.id) renderizarRotina(pet);
                avisarRotinas(erro.message || 'Não foi possível remover a rotina.');
            }
        });
    } catch (erro) {
        avisarRotinas(erro.message || 'Não foi possível remover a rotina.');
    }
});

// Seleciona um pet e decide entre exibir a rotina ou o no-content compartilhado.
function selecionarPet(pet) {
    petAtual = pet;
    seletorPet.value = pet?.id ?? '';
    main.dataset.petId = pet?.id ?? '';
    atualizarUrl(pet?.id);
    atualizarLinks();

    if (pet && temRotinaSalva(pet)) {
        status.hidden = true;
        status.textContent = '';
        renderizarRotina(pet);
        return;
    }

    const podeTrocarPet = !seletorSecao.hidden;
    status.dataset.estado = 'informativo';
    status.textContent = podeTrocarPet
        ? (pet ? 'Nenhuma rotina para o pet selecionado.' : 'Selecione um pet para consultar a rotina.')
        : '';
    status.hidden = !podeTrocarPet;
    secoesConteudo.forEach(secao => { secao.hidden = true; });
    atualizarNoContent(podeTrocarPet);
}

// Carrega os pets, prepara o seletor e define o pet inicial quando possível.
function iniciar() {
    try {
        pets = listarPets();
        const idInformado = new URLSearchParams(location.search).get('petId');
        const petInformado = pets.find(pet => pet.id === idInformado) ?? null;
        const temRotinaEmAlgumPet = pets.some(temRotinaSalva);

        // No primeiro cadastro, mantém somente o no-content compartilhado;
        // o seletor aparece quando já existe rotina para consultar.
        seletorSecao.hidden = pets.length < 2 || !temRotinaEmAlgumPet;
        botaoAdicionar.hidden = pets.length === 0;

        // Cria uma opção de texto para cada pet disponível.
        pets.forEach(pet => {
            const opcao = document.createElement('option');
            opcao.value = pet.id;
            opcao.textContent = pet.nome;
            seletorPet.append(opcao);
        });

        seletorPet.addEventListener('change', () => {
            selecionarPet(pets.find(pet => pet.id === seletorPet.value) ?? null);
        });

        // Usa o pet indicado na URL ou seleciona automaticamente o único pet.
        const petInicial = petInformado ?? (pets.length === 1 ? pets[0] : null);
        selecionarPet(petInicial);
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
