// Lista de exames e laudos na página Consultas e Exames: cartões, anexos e remoção com desfazer.
import { definirExamesDoBanco } from './armazenamento.js';
import { excluirExameApi } from './api.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';

// Exames aguardando o prazo do "Desfazer" (escondidos da lista).
const exclusoesPendentes = new Set();

function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function formatarData(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso + 'T12:00:00'));
}

function formatarTamanho(bytes) {
    return bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Com ocultarPendentes = false, conta também os exames aguardando o prazo do "Desfazer"
// (assim a seção não some enquanto o aviso de desfazer está na tela).
export function examesDoPet(pet, ocultarPendentes = true) {
    return (Array.isArray(pet?.exames) ? pet.exames : [])
        .filter(exame => exame && !(ocultarPendentes && exclusoesPendentes.has(String(exame.id))));
}

// Exames de vários pets, do mais recente para o mais antigo.
export function examesDoEscopo(pets, ocultarPendentes = true) {
    return pets
        .flatMap(pet => examesDoPet(pet, ocultarPendentes).map(exame => ({ pet, exame })))
        .sort((a, b) => (b.exame.data || '').localeCompare(a.exame.data || '') ||
            Number(b.exame.id) - Number(a.exame.id));
}

function urlCadastro(petId, exameId) {
    const destino = new URL('cadastrar-exame.html', location.href);
    if (petId) destino.searchParams.set('petId', petId);
    if (exameId) destino.searchParams.set('id', exameId);
    return destino.pathname.split('/').pop() + destino.search;
}

function criarCartao({ pet, exame }, mostrarPet) {
    const li = document.createElement('li');
    const etiqueta = mostrarPet ? `<span class="etiqueta-pets-registro">${escapar(pet.nome)}</span>` : '';
    const resultado = exame.resultado
        ? `<p class="cartao-exame__resultado">${escapar(exame.resultado)}</p>`
        : '';
    const anexos = exame.anexos?.length
        ? `<ul class="cartao-exame__anexos">${exame.anexos.map(anexo =>
            `<li><a href="${escapar(anexo.url)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid ${anexo.tipo === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}" aria-hidden="true"></i> ${escapar(anexo.nome)} <span class="cartao-exame__tamanho">(${formatarTamanho(anexo.tamanho)})</span></a></li>`
        ).join('')}</ul>`
        : '';
    li.innerHTML = `<article class="card cartao-exame" data-exame-id="${escapar(exame.id)}"><i class="fa-solid fa-file-medical icone" aria-hidden="true"></i><div class="cartao-exame__informacoes"><h3 class="cartao-exame__nome">${escapar(exame.nome)}${etiqueta}</h3><p class="cartao-exame__data">${escapar(formatarData(exame.data))}</p>${resultado}${anexos}<div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlCadastro(pet.id, exame.id))}">Editar</a><button type="button" class="botao-texto" data-excluir-exame="${escapar(exame.id)}">Remover</button></div></div></article>`;
    return li;
}

// Preenche a seção de exames para o escopo atual (um pet ou "Todos os pets").
export function renderizarExames(secao, { escopo, todos, petAtual }) {
    const lista = secao.querySelector(':scope > ul');
    const itens = examesDoEscopo(escopo);
    if (itens.length) {
        lista.replaceChildren(...itens.map(item => criarCartao(item, todos)));
    } else {
        lista.innerHTML = '<li class="exames-vazios">Nenhum exame ou laudo cadastrado.</li>';
    }
    const adicionar = secao.querySelector('[data-adicionar-exame]');
    if (adicionar) adicionar.href = urlCadastro(todos ? null : petAtual?.id, null);
}

// Liga o botão "Remover" dos cartões. aoAtualizar redesenha a página; informar mostra erros.
export function prepararExames(secao, { aoAtualizar, informar }) {
    secao.addEventListener('click', async event => {
        const botao = event.target.closest('[data-excluir-exame]');
        if (!botao) return;
        const id = botao.dataset.excluirExame;
        const confirmado = await confirmarExclusao({
            titulo: 'Remover exame?',
            mensagem: 'O exame e os arquivos anexados serão removidos.',
            confirmar: 'Remover'
        });
        if (!confirmado) return;

        exclusoesPendentes.add(id);
        aoAtualizar();
        oferecerDesfazerExclusao({
            antesDe: secao.querySelector(':scope > ul'),
            mensagem: 'Exame removido da lista.',
            aoDesfazer() {
                exclusoesPendentes.delete(id);
                aoAtualizar();
            },
            async aoExcluir() {
                const exames = await excluirExameApi(id);
                exclusoesPendentes.delete(id);
                definirExamesDoBanco(exames);
            },
            aoFalhar(erro) {
                exclusoesPendentes.delete(id);
                aoAtualizar();
                informar(erro.message || 'Não foi possível remover o exame.', true);
            }
        });
    });
}
