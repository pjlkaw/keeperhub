import { listarPets, PETS_STORAGE_KEY } from './js/armazenamento.js';
import { atualizarNoContent } from '/shared/services/no-content.js';

const lista = document.getElementById('lista-pets');
const template = document.getElementById('cartao-pet-template');
const status = document.getElementById('painel-pets-status');
const tentarNovamente = document.getElementById('recarregar-pets');
const adicionar = document.getElementById('adicionar-pet-section');
const painel = document.getElementById('conteudo-principal');
const acoes = document.getElementById('acoes-rapidas-pets');
const cadastroConcluido = new URLSearchParams(window.location.search).get('cadastro') === 'sucesso';

function criarCartao(pet) {
    const cartao = template.content.cloneNode(true);
    cartao.querySelector('article').dataset.petId = pet.id;
    cartao.querySelector('article').dataset.genero = pet.genero;
    cartao.querySelector('[data-pet-nome]').textContent = pet.nome;
    const idade = String(pet.idade ?? '');
    cartao.querySelector('[data-pet-idade]').textContent = /^\d+(?:[.,]\d+)?$/.test(idade)
        ? `${idade} ${Number(idade.replace(',', '.')) === 1 ? 'ano' : 'anos'}` : idade;
    cartao.querySelector('[data-pet-raca]').textContent = pet.raca;
    cartao.querySelector('[data-pet-peso]').textContent = `${Number(pet.peso).toLocaleString('pt-BR', { maximumFractionDigits: 6 })} kg`;
    cartao.querySelector('[data-pet-genero]').textContent = pet.genero === 'femea' ? 'Fêmea' : 'Macho';
    const generoIcone = cartao.querySelector('.cartao-resumo-pet__atributo:nth-child(2) .icone');
    generoIcone.classList.replace('fa-venus', pet.genero === 'femea' ? 'fa-venus' : 'fa-mars');
    const figura = cartao.querySelector('figure');
    const imagem = figura.querySelector('img');
    if (typeof pet.foto === 'string' && (/^https:\/\//.test(pet.foto) || /^data:image\/(?:jpeg|png|webp);base64,/.test(pet.foto))) {
        imagem.src = pet.foto;
        imagem.alt = `Foto de ${pet.nome}`;
        figura.dataset.temFoto = 'true';
        imagem.addEventListener('error', () => {
            figura.dataset.temFoto = 'false';
            imagem.src = '/shared/img/logo-pets.png';
            imagem.alt = '';
        }, { once: true });
    }
    cartao.querySelectorAll('[data-link-pet]').forEach(link => {
        const destino = new URL(link.getAttribute('href'), window.location.href);
        destino.searchParams.set('petId', pet.id);
        link.href = destino.href;
    });
    return cartao;
}

function carregarPainel() {
    try {
        const pets = listarPets();
        const temPets = pets.length > 0;
        atualizarNoContent(temPets);
        painel.hidden = !temPets;
        lista.replaceChildren(...pets.map(criarCartao));
        tentarNovamente.hidden = true;
        // A ação de adicionar outro pet continua disponível com a lista preenchida.
        adicionar.hidden = !temPets;
        acoes.hidden = !temPets;
        const parametros = new URLSearchParams(window.location.search);
        status.textContent = cadastroConcluido && temPets ? 'Pet cadastrado com sucesso!' : '';
        status.setAttribute('role', 'status');
        delete status.dataset.estado;
        if (parametros.has('cadastro')) {
            parametros.delete('cadastro');
            const busca = parametros.toString();
            history.replaceState(null, '', `${location.pathname}${busca ? `?${busca}` : ''}${location.hash}`);
        }
    } catch (erro) {
        atualizarNoContent(true);
        painel.hidden = false;
        lista.replaceChildren();
        adicionar.hidden = true;
        acoes.hidden = true;
        status.textContent = erro.message || 'Não foi possível carregar seus pets.';
        status.dataset.estado = 'erro';
        status.setAttribute('role', 'alert');
        tentarNovamente.hidden = false;
    }
}

tentarNovamente.addEventListener('click', carregarPainel);
window.addEventListener('storage', event => {
    if (event.key === PETS_STORAGE_KEY || event.key === null) carregarPainel();
});
// Reconsulta inclusive ao voltar pelo histórico e ao retornar de outra aba.
window.addEventListener('pageshow', carregarPainel);
window.addEventListener('focus', carregarPainel);
carregarPainel();

