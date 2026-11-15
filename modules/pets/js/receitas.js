// Lista de receitas dos pets (salvas no banco): ativas, histórico, busca, concluir e remover.
import { carregarPets, definirReceitasDoBanco, listarPets } from './armazenamento.js';
import { concluirReceitaApi, excluirReceitaApi } from './api.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { capturarPosicaoDoAviso, oferecerDesfazerExclusao } from './desfazer-exclusao.js';
import { atualizarNoContent } from '/shared/services/no-content.js';

const main = document.querySelector('.pagina-receitas');
const secaoSeletor = main.querySelector('.seletor-pet-receitas');
const seletor = document.getElementById('pet-receitas');
const barraBusca = main.querySelector('.barra-ferramentas-medicacoes');
const busca = document.getElementById('buscar-receita');
const status = document.getElementById('status-receitas');
const secaoAtivas = main.querySelector('[data-lista="ativas"]').closest('section');
const secaoHistorico = main.querySelector('[data-lista="historico"]').closest('section');

const TODOS = '__todos__';
let pets = [];
const exclusoesPendentes = new Set();

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
}

function hojeLocal() {
    // Data de hoje no fuso de Brasília, a mesma que o servidor usa nas validações.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function formatarData(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return '';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso + 'T12:00:00'));
}

function informar(mensagem, erro = false) {
    status.textContent = mensagem;
    status.hidden = !mensagem;
    status.dataset.estado = erro ? 'erro' : 'informativo';
}

// Concluída quando marcada; expirada quando a validade já passou; senão, ativa.
function situacao(receita) {
    if (receita.concluidaEm) return 'concluida';
    if (receita.dataValidade && receita.dataValidade < hojeLocal()) return 'expirada';
    return 'ativa';
}

const ROTULOS = { ativa: 'Ativa', expirada: 'Expirada', concluida: 'Concluída' };

function textoData(receita, estado) {
    if (estado === 'concluida') return `Concluída em ${formatarData(receita.concluidaEm)}`;
    if (receita.dataValidade) {
        return `${estado === 'expirada' ? 'Venceu em' : 'Válida até'} ${formatarData(receita.dataValidade)}`;
    }
    if (receita.dataEmissao) return `Emitida em ${formatarData(receita.dataEmissao)}`;
    return 'Sem data informada';
}

function escopo() {
    if (seletor.value === TODOS) return pets;
    const pet = pets.find(item => item.id === seletor.value);
    return pet ? [pet] : [];
}

function receitasDoEscopo() {
    return escopo().flatMap(pet => (Array.isArray(pet.receitas) ? pet.receitas : [])
        .filter(receita => !exclusoesPendentes.has(String(receita.id)))
        .map(receita => ({ pet, receita, estado: situacao(receita) })));
}

function urlCadastro(petId, receitaId) {
    const destino = new URL('cadastrar-receita.html', location.href);
    if (petId) destino.searchParams.set('petId', petId);
    if (receitaId) destino.searchParams.set('id', receitaId);
    return destino.pathname.split('/').pop() + destino.search;
}

function criarCartao({ pet, receita, estado }, mostrarPet) {
    const li = document.createElement('li');
    const etiquetaPet = mostrarPet ? `<span class="etiqueta-pets-registro">${escapar(pet.nome)}</span>` : '';
    const anexos = receita.anexos ?? [];
    const listaAnexos = anexos.length
        ? `<ul class="cartao-receita__anexos">${anexos.map(anexo =>
            `<li><a href="${escapar(anexo.url)}" target="_blank" rel="noopener noreferrer">${escapar(anexo.nome)}</a></li>`).join('')}</ul>`
        : '';
    const baixar = anexos.length
        ? `<a class="botao-icone cartao-receita__baixar" href="${escapar(anexos[0].url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir anexo da receita ${escapar(receita.nome)}"><i class="fa-solid fa-download icone" aria-hidden="true"></i></a>`
        : '';
    const observacao = receita.observacao
        ? `<p class="cartao-receita__observacao">${escapar(receita.observacao)}</p>`
        : '';
    const concluir = estado === 'concluida'
        ? `<button type="button" class="botao-texto" data-reabrir-receita="${escapar(receita.id)}">Reabrir</button>`
        : `<button type="button" class="botao-texto" data-concluir-receita="${escapar(receita.id)}">Concluir</button>`;
    li.innerHTML = `<article class="card cartao-receita cartao-receita--${estado}"><i class="fa-solid fa-prescription-bottle-medical icone" aria-hidden="true"></i><div class="cartao-receita__informacoes"><h3 class="cartao-receita__nome">${escapar(receita.nome)}${etiquetaPet}</h3>${receita.veterinario ? `<p class="cartao-receita__veterinario">${escapar(receita.veterinario)}</p>` : ''}<p class="cartao-receita__data"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i>${escapar(textoData(receita, estado))}</p>${observacao}${listaAnexos}<div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlCadastro(pet.id, receita.id))}">Editar</a>${concluir}<button type="button" class="botao-texto" data-excluir-receita="${escapar(receita.id)}">Remover</button></div></div><div class="cartao-receita__acoes"><span class="etiqueta-receita etiqueta-receita--${estado}">${ROTULOS[estado]}</span>${baixar}</div></article>`;
    return li;
}

function preencher(secao, itens, mostrarPet, vazio) {
    const lista = secao.querySelector('ul');
    lista.replaceChildren(...itens.map(item => criarCartao(item, mostrarPet)));
    if (!itens.length) lista.innerHTML = `<li class="receitas-vazia">${vazio}</li>`;
    const contagem = secao.querySelector('.receitas-lista__contagem');
    contagem.textContent = `${itens.length} ${itens.length === 1 ? 'receita' : 'receitas'}`;
}

function renderizar() {
    const todas = receitasDoEscopo();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const filtradas = termo
        ? todas.filter(({ receita }) => `${receita.nome} ${receita.veterinario}`.toLocaleLowerCase('pt-BR').includes(termo))
        : todas;
    const temConteudo = todas.length > 0;
    const temEmAlgumPet = pets.some(pet => (pet.receitas ?? []).length > 0);

    secaoSeletor.hidden = pets.length < 2 || !temEmAlgumPet;
    barraBusca.hidden = !temConteudo;
    secaoAtivas.hidden = !temConteudo;
    secaoHistorico.hidden = !temConteudo;
    if (!temConteudo) {
        informar(secaoSeletor.hidden ? '' : 'Nenhuma receita para o pet selecionado.');
        atualizarNoContent(!secaoSeletor.hidden);
        return;
    }
    informar(termo && !filtradas.length ? 'Nenhuma receita encontrada para a busca.' : '');
    atualizarNoContent(true);

    const mostrarPet = seletor.value === TODOS;
    preencher(secaoAtivas, filtradas.filter(item => item.estado === 'ativa'), mostrarPet, 'Nenhuma receita ativa.');
    preencher(secaoHistorico, filtradas.filter(item => item.estado !== 'ativa'), mostrarPet,
        'Receitas expiradas ou concluídas aparecem aqui.');
}

// Mantém o pet na URL e no "+" e no voltar (que levam ao cadastro e às medicações).
function atualizarLinks() {
    const url = new URL(location.href);
    url.searchParams.delete('petId');
    url.searchParams.delete('todos');
    if (seletor.value === TODOS) url.searchParams.set('todos', '1');
    else if (seletor.value) url.searchParams.set('petId', seletor.value);
    history.replaceState(null, '', url.pathname + url.search);
    const destino = '/modules/pets/components/cadastrar-receita.html' + (seletor.value && seletor.value !== TODOS ? `?petId=${encodeURIComponent(seletor.value)}` : '');
    window.keeperhubModuleConfig.addUrl = destino;
    const linkAdicionar = document.querySelector('#btn-add-section #btn-add');
    if (linkAdicionar) linkAdicionar.href = destino;

    main.querySelectorAll('.abas-pet a').forEach(link => {
        const aba = new URL(link.href, location.href);
        aba.searchParams.delete('petId');
        aba.searchParams.delete('todos');
        if (seletor.value === TODOS) aba.searchParams.set('todos', '1');
        else if (seletor.value) aba.searchParams.set('petId', seletor.value);
        link.href = `${aba.pathname.split('/').pop()}${aba.search}`;
    });
}

function montarSeletor() {
    const anterior = seletor.value;
    const parametros = new URLSearchParams(location.search);
    pets = listarPets();
    seletor.replaceChildren();
    if (pets.length > 1) seletor.add(new Option('Todos os pets', TODOS));
    for (const pet of pets) seletor.add(new Option(pet.nome, pet.id));
    const petUrl = pets.find(pet => pet.id === parametros.get('petId'));
    seletor.value = anterior && [...seletor.options].some(opcao => opcao.value === anterior)
        ? anterior
        : petUrl?.id ?? (pets.length > 1 ? TODOS : pets[0]?.id ?? '');
    atualizarLinks();
    renderizar();
}

seletor.addEventListener('change', () => {
    atualizarLinks();
    renderizar();
});
busca.addEventListener('input', renderizar);
barraBusca.querySelector('form').addEventListener('submit', event => event.preventDefault());

main.addEventListener('click', async event => {
    const concluir = event.target.closest('[data-concluir-receita], [data-reabrir-receita]');
    if (concluir) {
        const id = concluir.dataset.concluirReceita ?? concluir.dataset.reabrirReceita;
        concluir.disabled = true;
        try {
            definirReceitasDoBanco(await concluirReceitaApi(id, 'concluirReceita' in concluir.dataset));
        } catch (erro) {
            concluir.disabled = false;
            informar(erro.message || 'Não foi possível atualizar a receita.', true);
        }
        return;
    }

    const remover = event.target.closest('[data-excluir-receita]');
    if (!remover) return;
    const id = remover.dataset.excluirReceita;
    const confirmado = await confirmarExclusao({
        titulo: 'Remover receita?',
        mensagem: 'A receita e os arquivos anexados serão removidos.',
        confirmar: 'Remover'
    });
    if (!confirmado) return;

    const posicao = capturarPosicaoDoAviso(remover);
    exclusoesPendentes.add(id);
    renderizar();
    oferecerDesfazerExclusao({
        posicao,
        mensagem: 'Receita removida da lista.',
        aoDesfazer() {
            exclusoesPendentes.delete(id);
            renderizar();
        },
        async aoExcluir() {
            const receitas = await excluirReceitaApi(id);
            exclusoesPendentes.delete(id);
            definirReceitasDoBanco(receitas);
        },
        aoFalhar(erro) {
            exclusoesPendentes.delete(id);
            renderizar();
            informar(erro.message || 'Não foi possível remover a receita.', true);
        }
    });
});

window.addEventListener('keeperhub:pets-atualizados', () => {
    try {
        montarSeletor();
    } catch (erro) {
        informar(erro.message || 'Não foi possível atualizar as receitas.', true);
    }
});

try {
    await carregarPets();
    montarSeletor();
} catch (erro) {
    informar(erro.message || 'Não foi possível carregar as receitas.', true);
    atualizarNoContent(false);
}
