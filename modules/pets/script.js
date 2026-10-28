// Importa a função que busca os pets salvos e a chave usada no localStorage.
import { listarPets, PETS_STORAGE_KEY } from './js/armazenamento.js';

// Importa uma função compartilhada que atualiza a mensagem de lista vazia.
import { atualizarNoContent } from '/shared/services/no-content.js';

// Busca no HTML os elementos que o script vai atualizar.
const lista = document.getElementById('lista-pets');
const template = document.getElementById('cartao-pet-template');
const status = document.getElementById('painel-pets-status');
const tentarNovamente = document.getElementById('recarregar-pets');
const adicionar = document.getElementById('adicionar-pet-section');
const painel = document.getElementById('conteudo-principal');
const acoes = document.getElementById('acoes-rapidas-pets');

// Verifica se a URL informa que um cadastro acabou de ser concluído.
// Exemplo: ?cadastro=sucesso
const cadastroConcluido =
    new URLSearchParams(window.location.search).get('cadastro') === 'sucesso';

// Cria o cartão visual de um pet usando o template definido no HTML.
function criarCartao(pet) {
    // Faz uma cópia do conteúdo do template.
    const cartao = template.content.cloneNode(true);

    // Guarda o ID e o gênero como atributos data-* do artigo do cartão.
    const artigo = cartao.querySelector('article');
    artigo.dataset.petId = pet.id;
    artigo.dataset.genero = pet.genero;

    // Preenche os campos de texto do cartão.
    // textContent insere texto sem interpretá-lo como HTML.
    cartao.querySelector('[data-pet-nome]').textContent = pet.nome;

    // Converte a idade para texto.
    // O ?? '' usa uma string vazia se a idade for null ou undefined.
    const idade = String(pet.idade ?? '');

    // Se a idade for somente um número, acrescenta "ano" ou "anos".
    // Caso contrário, mostra a idade como foi informada, por exemplo "6 meses".
    cartao.querySelector('[data-pet-idade]').textContent =
        /^\d+(?:[.,]\d+)?$/.test(idade)
            ? `${idade} ${Number(idade.replace(',', '.')) === 1 ? 'ano' : 'anos'}`
            : idade;

    cartao.querySelector('[data-pet-raca]').textContent = pet.raca;

    // Formata o peso segundo as convenções brasileiras e acrescenta "kg".
    cartao.querySelector('[data-pet-peso]').textContent =
        `${Number(pet.peso).toLocaleString('pt-BR', {
            maximumFractionDigits: 6
        })} kg`;

    // Apresenta o gênero de forma legível.
    cartao.querySelector('[data-pet-genero]').textContent =
        pet.genero === 'femea' ? 'Fêmea' : 'Macho';

    // Busca a figura e a imagem do cartão.
    const figura = cartao.querySelector('figure');
    const imagem = figura.querySelector('img');

    // Só usa a foto se ela for uma URL HTTPS ou uma imagem Base64
    // nos formatos JPEG, PNG ou WebP.
    if (
        typeof pet.foto === 'string' &&
        (
            /^https:\/\//.test(pet.foto) ||
            /^data:image\/(?:jpeg|png|webp);base64,/.test(pet.foto)
        )
    ) {
        imagem.src = pet.foto;
        imagem.alt = `Foto de ${pet.nome}`;
        figura.dataset.temFoto = 'true';

        // Se a imagem não carregar, troca pelo logo padrão.
        // { once: true } faz o evento ocorrer no máximo uma vez.
        imagem.addEventListener('error', () => {
            figura.dataset.temFoto = 'false';
            imagem.src = '/shared/img/logo-pets.png';
            imagem.alt = '';
        }, { once: true });
    }

    // Acrescenta o ID do pet aos links do cartão.
    // Assim, as páginas de destino sabem qual pet foi selecionado.
    cartao.querySelectorAll('[data-link-pet]').forEach(link => {
        const destino = new URL(link.getAttribute('href'), window.location.href);
        destino.searchParams.set('petId', pet.id);
        link.href = destino.href;
    });

    return cartao;
}

// Busca os pets e atualiza o painel com os resultados.
function carregarPainel() {
    try {
        const pets = listarPets();
        const temPets = pets.length > 0;

        // Atualiza a mensagem compartilhada de lista vazia conforme
        // existam pets ou não.
        atualizarNoContent(temPets);

        // Mostra o painel quando há pets e oculta quando a lista está vazia.
        painel.hidden = !temPets;

        // Cria um cartão para cada pet e substitui os cartões atuais.
        lista.replaceChildren(...pets.map(criarCartao));

        // Oculta o botão de tentar novamente quando o carregamento deu certo.
        tentarNovamente.hidden = true;

        // Mantém disponíveis a ação de adicionar pet e as ações rápidas
        // quando já há pets cadastrados.
        adicionar.hidden = !temPets;
        acoes.hidden = !temPets;

        // Se o cadastro acabou de ser concluído, mostra a confirmação.
        status.textContent =
            cadastroConcluido && temPets
                ? 'Pet cadastrado com sucesso!'
                : '';

        status.setAttribute('role', 'status');

        // Remove o estado anterior da mensagem, se houver.
        delete status.dataset.estado;

        // Remove o parâmetro "cadastro" da URL depois de usá-lo.
        // Os outros parâmetros e o fragmento (#...) são preservados.
        const parametros = new URLSearchParams(window.location.search);

        if (parametros.has('cadastro')) {
            parametros.delete('cadastro');

            const busca = parametros.toString();

            history.replaceState(
                null,
                '',
                `${location.pathname}${busca ? `?${busca}` : ''}${location.hash}`
            );
        }
    } catch (erro) {
        // Se a leitura falhar, atualiza a interface para indicar o problema.
        atualizarNoContent(true);
        painel.hidden = false;
        lista.replaceChildren();
        adicionar.hidden = true;
        acoes.hidden = true;

        // Mostra o erro recebido ou uma mensagem padrão.
        status.textContent =
            erro.message || 'Não foi possível carregar seus pets.';
        status.dataset.estado = 'erro';
        status.setAttribute('role', 'alert');

        // Exibe o botão para permitir uma nova tentativa.
        tentarNovamente.hidden = false;
    }
}

// Ao clicar no botão, tenta carregar o painel novamente.
tentarNovamente.addEventListener('click', carregarPainel);

// O evento "storage" ocorre quando o localStorage muda em outra aba
// da mesma origem. Recarrega a lista se os dados dos pets mudarem.
window.addEventListener('storage', event => {
    if (event.key === PETS_STORAGE_KEY || event.key === null) {
        carregarPainel();
    }
});

// Atualiza a lista quando a pessoa volta a esta página pelo histórico
// ou retorna de outra aba/janela do navegador.
window.addEventListener('pageshow', carregarPainel);
window.addEventListener('focus', carregarPainel);

// Faz o primeiro carregamento assim que o script é executado.
carregarPainel();