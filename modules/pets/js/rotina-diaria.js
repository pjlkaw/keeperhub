// Exibe somente dados de rotina que foram salvos no cadastro do pet.
import { listarPets } from './armazenamento.js';
import { atualizarNoContent } from '/shared/services/no-content.js';

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
    main.querySelector('.anotacoes-comportamento')
];

// Mantém em memória os pets disponíveis e o pet atualmente consultado.
let pets = [];
let petAtual = null;

// Atualiza o pet na URL sem recarregar a página.
function atualizarUrl(id) {
    const url = new URL(location.href);
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Valida e ordena os horários das refeições persistidas para este pet.
function refeicoesDoPet(pet) {
    const refeicoes = pet?.rotinaAlimentar?.refeicoes;
    if (!Array.isArray(refeicoes)) return [];

    return refeicoes
        .filter(refeicao =>
            refeicao &&
            typeof refeicao.nome === 'string' &&
            refeicao.nome.trim() &&
            typeof refeicao.horario === 'string' &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(refeicao.horario)
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

// Considera que há rotina cadastrada se existir refeição ou observação não vazia.
function temRotinaSalva(pet) {
    return refeicoesDoPet(pet).length > 0 || Boolean(observacoesDoPet(pet));
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

// Preenche os cartões com dados reais e estados vazios onde ainda não há persistência.
function renderizarRotina(pet) {
    const refeicoes = refeicoesDoPet(pet);
    const observacoes = observacoesDoPet(pet);
    const listaRefeicoes = document.getElementById('resumo-refeicoes');
    const vazioRefeicoes = document.getElementById('resumo-refeicoes-vazio');
    const campoObservacoes = document.getElementById('resumo-refeicoes-observacoes');
    const listaAtividades = document.getElementById('linha-tempo-rotina');
    const listaHigiene = main.querySelector('.higiene-bem-estar > ul');
    const listaAnotacoes = main.querySelector('.anotacoes-comportamento__lista');

    // Clona o modelo HTML para cada refeição e insere os dados como texto.
    const cartoes = refeicoes.map(refeicao => {
        const fragmento = document.getElementById('modelo-refeicao-resumo').content.cloneNode(true);
        const titulo = fragmento.querySelector('.cartao-refeicao__titulo');
        const horario = fragmento.querySelector('.cartao-refeicao__horario');
        titulo.textContent = refeicao.nome.trim();
        horario.dateTime = refeicao.horario;
        horario.textContent = refeicao.horario;
        return fragmento;
    });

    listaRefeicoes.replaceChildren(...cartoes);
    vazioRefeicoes.hidden = refeicoes.length > 0;
    campoObservacoes.textContent = observacoes;
    campoObservacoes.hidden = !observacoes;

    // Estas áreas ainda não possuem persistência neste fluxo.
    listaAtividades.replaceChildren();
    listaHigiene.replaceChildren();
    listaAnotacoes.replaceChildren();
    main.querySelector('[data-vazio="atividades"]').hidden = false;
    main.querySelector('[data-vazio="higiene"]').hidden = false;
    main.querySelector('[data-vazio="anotacoes"]').hidden = false;

    secoesConteudo.forEach(secao => { secao.hidden = false; });
    atualizarNoContent(true);
}

// Seleciona um pet e decide entre exibir a rotina ou o no-content compartilhado.
function selecionarPet(pet) {
    petAtual = pet;
    seletorPet.value = pet?.id ?? '';
    main.dataset.petId = pet?.id ?? '';
    atualizarUrl(pet?.id);
    atualizarLinks();

    if (pet) {
        status.hidden = true;
        status.textContent = '';
        if (temRotinaSalva(pet)) {
            renderizarRotina(pet);
            return;
        }
    } else {
        secoesConteudo.forEach(secao => { secao.hidden = true; });
        status.textContent = pets.length > 1
            ? 'Selecione um pet para consultar a rotina.'
            : '';
        status.hidden = !status.textContent;
    }

    secoesConteudo.forEach(secao => { secao.hidden = true; });
    atualizarNoContent(false);
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

        // Quando há vários pets e nenhum foi escolhido, informa se já existe
        // rotina em algum deles; a seleção permanece disponível sobre o overlay.
        if (!petInicial && pets.length > 1 && temRotinaEmAlgumPet) {
            status.textContent = 'Selecione um pet para consultar a rotina.';
            status.hidden = false;
            atualizarNoContent(true);
        }
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
