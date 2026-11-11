// Cadastro, busca e organização local das medicações dos pets.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { listarPets } from './armazenamento.js';
import { agruparRegistros, criarSelecaoMultipla, gravarRegistroDosPets, registrosDoPet } from './selecao-pets.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';

// Os dados principais dos pets vêm da API; carrega antes de montar a página.
// Se falhar, listarPets() lança o erro e a página mostra a mensagem.
await carregarPetsDoServidor({ reutilizar: true });


// Busca os elementos da página.
// Se não houver formulário de cadastro, o script considera que está na página da lista.
const main = document.querySelector('.pagina-medicacoes');
const form = document.querySelector('.formulario-adicionar-medicacao');
const paginaLista = !form;

// Converte os códigos dos tipos de uso em textos para exibição.
const nomesTipo = {
    continuo: 'Contínuo',
    temporario: 'Temporário',
    eventual: 'Eventual'
};

// Guarda os pets, o pet selecionado, o filtro ativo e o texto da busca.
let pets = [];
let petAtual = null;
let todosPetsSelecionados = false;
let petsAlvo = [];
let filtroAtual = 'todos';
let buscaAtual = '';

// Retorna a data local de hoje no formato AAAA-MM-DD.
function dataHoje() {
    const data = new Date();

    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

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

// Remove acentos e transforma o texto em minúsculas.
// Isso permite buscas sem diferenciar acentos ou letras maiúsculas.
function semAcentos(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

// Converte uma data AAAA-MM-DD em uma data legível.
function formatarData(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) {
        return 'Data não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
        .format(new Date(iso + 'T12:00:00'))
        .replace('.', '');
}

// Atualiza o parâmetro petId da URL sem recarregar a página.
function atualizarUrl(id) {
    const url = new URL(location.href);

    if (!paginaLista) {
        if (seletorPet.value === '__todos__') url.searchParams.set('todos', '1');
        else url.searchParams.delete('todos');
    }

    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');

    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Cria na página o seletor de pet e uma área para mensagens.
function criarSeletor() {
    const secao = document.createElement('section');
    secao.className = 'seletor-pet-medicacoes';

    // Inclui o rótulo, o seletor e a área de status acessível.
    secao.innerHTML =
        '<label for="medicacoes-pet">Pet</label>' +
        '<select id="medicacoes-pet" aria-describedby="medicacoes-status-pet"></select>' +
        '<p id="medicacoes-status-pet" role="status" aria-live="polite" hidden></p>';

    // Insere o seletor depois do cabeçalho, se ele existir.
    if (form) form.before(secao);
    else document.querySelector('.section-header-section')?.after(secao);

    return {
        select: secao.querySelector('select'),
        status: secao.querySelector('p')
    };
}

// Cria o seletor e guarda referências aos elementos que serão usados.
const { select: seletorPet, status } = criarSeletor();
const selecaoMultipla = form ? criarSelecaoMultipla(seletorPet) : null;

// Exibe uma mensagem de sucesso ou de erro.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Atualiza os links de cadastro e as abas de navegação
// para manter o pet selecionado.
function atualizarLinks() {
    if (!paginaLista) return;

    const destinoCadastro = new URL('cadastrar-registro.html', location.href);
    destinoCadastro.searchParams.set('tipo', 'medicamento');
    if (petAtual) destinoCadastro.searchParams.set('petId', petAtual.id);
    if (todosPetsSelecionados) destinoCadastro.searchParams.set('todos', '1');
    window.keeperhubModuleConfig.addUrl = destinoCadastro.href;
    const botaoAdicionar = document.getElementById('btn-add');
    if (botaoAdicionar) botaoAdicionar.href = destinoCadastro.href;

    // Acrescenta o ID do pet às abas da página.
    document.querySelectorAll('.abas-pet a, .atalho-receitas a').forEach(link => {
        const destino = new URL(link.href, location.href);

        if (petAtual) destino.searchParams.set('petId', petAtual.id);
        else destino.searchParams.delete('petId');
        if (todosPetsSelecionados && destino.pathname.endsWith('/vacinacoes.html')) destino.searchParams.set('todos', '1');
        else destino.searchParams.delete('todos');

        // Mantém apenas o nome do arquivo e os parâmetros da URL.
        link.href = destino.pathname.split('/').pop() + destino.search;
    });
}

// Lê os pets salvos e preenche o seletor.
function carregarPets() {
    const modoAnterior = seletorPet.value;
    pets = listarPets();
    seletorPet.replaceChildren();

    // Cria a opção inicial do seletor.
    const inicial = document.createElement('option');
    inicial.disabled = true;
    inicial.hidden = true;
    inicial.value = '';
    inicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletorPet.append(inicial);
    selecaoMultipla?.preparar(pets, true);

    // Permite consultar as categorias e o histórico de todos os pets juntos.
    if (paginaLista && pets.length > 1) {
        const todos = document.createElement('option');
        todos.value = '__todos__';
        todos.textContent = 'Todos os pets';
        seletorPet.append(todos);
    }

    // Cria uma opção para cada pet.
    pets.forEach(pet => {
        const opcao = document.createElement('option');
        opcao.value = pet.id;
        opcao.textContent = pet.nome;
        seletorPet.append(opcao);
    });

    // Desabilita o seletor se não houver pets.
    seletorPet.disabled = !pets.length;

    // Tenta selecionar o pet informado na URL.
    const petQuery = pets.find(
        pet => pet.id === new URLSearchParams(location.search).get('petId')
    );

    // Em lista com vários pets, abre por padrão a visão geral.
    if (paginaLista && !petQuery && pets.length > 1) {
        selecionarTodosPets();
    } else {
        selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
    }
    if (!paginaLista && modoAnterior.startsWith("__") && [...seletorPet.options].some(opcao => opcao.value === modoAnterior)) {
        seletorPet.value = modoAnterior;
        seletorPet.dispatchEvent(new Event("change"));
    }

}

// Define qual pet está selecionado e atualiza a página correspondente.
function selecionarPet(pet) {
    petAtual = pet;
    if (form) petsAlvo = pet ? [pet] : [];
    todosPetsSelecionados = false;
    seletorPet.value = pet?.id ?? '';
    atualizarUrl(pet?.id);
    atualizarLinks();

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
}

// Seleciona o escopo geral da página sem fixar um pet na URL.
function selecionarTodosPets() {
    petAtual = null;
    todosPetsSelecionados = true;
    seletorPet.value = '__todos__';
    atualizarUrl(null);
    atualizarLinks();
    renderizarLista();
}

// Verifica se uma medicação temporária já terminou.
// Ela entra no histórico quando tem data final anterior a hoje.
function estaNoHistorico(medicacao) {
    return medicacao.tipoUso === 'temporario' &&
        medicacao.dataFim &&
        medicacao.dataFim < dataHoje();
}

// Verifica se a medicação corresponde ao texto digitado na busca.
// A busca considera nome, dosagem, frequência e observação.
function correspondeBusca(medicacao) {
    const termos = semAcentos([
        medicacao.nome,
        medicacao.dosagem,
        medicacao.frequencia,
        medicacao.observacao,
        medicacao.nomePet
    ].join(' '));

    return termos.includes(semAcentos(buscaAtual));
}

// Verifica se uma medicação corresponde ao filtro selecionado.
function correspondeFiltro(medicacao) {
    const historico = estaNoHistorico(medicacao);

    if (filtroAtual === 'historico') return historico;

    // Medicações concluídas não aparecem nas categorias ativas.
    if (historico) return false;

    return filtroAtual === 'todos' ||
        medicacao.tipoUso === filtroAtual;
}

// Cria o cartão visual de uma medicação.
function criarCartao(medicacao, historico = false) {
    const tipo = medicacao.tipoUso;
    const nomeTipo = nomesTipo[tipo] ?? 'Medicação';

    // Escolhe um ícone conforme o tipo de uso.
    const icone = tipo === 'continuo'
        ? 'fa-prescription-bottle-medical'
        : tipo === 'eventual'
            ? 'fa-droplet'
            : 'fa-pills';

    // Começa os detalhes do cartão com a dosagem, se ela existir.
    let detalhe = medicacao.dosagem || '';

    // Acrescenta informação específica do tipo de uso.
    if (tipo === 'continuo' && medicacao.horarioDose) {
        detalhe += `${detalhe ? ' · ' : ''}Todos os dias às ${medicacao.horarioDose}`;
    }

    if (tipo === 'temporario' && medicacao.frequencia) {
        detalhe += `${detalhe ? ' · ' : ''}${medicacao.frequencia}`;
    }

    if (tipo === 'eventual') {
        detalhe += `${detalhe ? ' · ' : ''}quando necessário`;
    }

    // Usa a quantidade em estoque se ela for um número inteiro.
    const estoque = Number.isInteger(medicacao.quantidadeEstoque)
        ? medicacao.quantidadeEstoque
        : null;

    // Considera estoque baixo quando restam duas unidades ou menos.
    const baixo = estoque !== null && estoque <= 2;

    // Define o texto e a classe visual do status.
    const status = historico ? 'Concluído' : nomeTipo;
    const classeStatus = historico ? 'eventual' : tipo;

    // Cria o texto do estoque; valores baixos recebem um aviso.
    const detalhesEstoque = estoque === null
        ? ''
        : baixo
            ? `<p class="cartao-medicacao__alerta-estoque"><span class="somente-leitor-tela">Atenção: </span>${estoque} restantes (estoque baixo)</p>`
            : `<p class="cartao-medicacao__estoque"><i class="fa-solid fa-box-open icone" aria-hidden="true"></i>${estoque} restantes</p>`;

    // Para medicações temporárias, mostra até quando o tratamento vai
    // ou quando foi concluído.
    const termino = tipo === 'temporario' && medicacao.dataFim
        ? `<p class="cartao-medicacao__termino"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i>${historico ? 'Concluído em ' : 'Até '}${escapar(formatarData(medicacao.dataFim))}</p>`
        : '';

    const li = document.createElement('li');

    // Monta o cartão. Os dados variáveis são escapados antes de entrar no HTML.
    const etiquetaPet = todosPetsSelecionados && medicacao.nomesPets.length
        ? `<span class="cartao-medicacao__pet">${escapar(medicacao.nomesPets.join(", "))}</span>`
        : '';

    li.innerHTML = `<article class="card cartao-medicacao cartao-medicacao--${tipo}${historico ? ' cartao-medicacao--aplicada' : ''}${baixo ? ' cartao-medicacao--estoque-baixo' : ''}"><i class="fa-solid ${icone} icone" aria-hidden="true"></i><div class="cartao-medicacao__informacoes"><h3 class="cartao-medicacao__nome">${escapar(medicacao.nome)}${etiquetaPet}</h3><p class="cartao-medicacao__dosagem">${escapar(detalhe || 'Dosagem não informada')}</p>${detalhesEstoque}${termino}${medicacao.observacao ? `<p class="cartao-medicacao__observacao">${escapar(medicacao.observacao)}</p>` : ''}</div><span class="etiqueta-status etiqueta-status--${classeStatus}">${status}</span></article>`;

    return li;
}

// Atualiza as categorias e o histórico de medicações na página.
function renderizarLista() {
    const grupos = [...main.querySelectorAll('.grupo-medicacoes')];
    const listas = grupos.map(grupo => grupo.querySelector('ul'));
    const seletorSecao = seletorPet.closest('.seletor-pet-medicacoes');
    const toolbar = main.querySelector('.barra-ferramentas-medicacoes');
    const escopo = todosPetsSelecionados
        ? pets
        : petAtual ? [petAtual] : [];
    const registrosDoEscopo = agruparRegistros(escopo, pet => registrosDoPet(pet, "medicacoes"));

    if (!registrosDoEscopo.length) {
        const podeTrocarPet = pets.length > 1 && pets.some(pet => registrosDoPet(pet, 'medicacoes').length);
        seletorSecao.hidden = !podeTrocarPet;
        toolbar.hidden = true;

        grupos.forEach(grupo => { grupo.hidden = true; });
        informar(podeTrocarPet ? 'Nenhuma medicação para o pet selecionado.' : '');
        atualizarNoContent(podeTrocarPet);
        return;
    }

    seletorSecao.hidden = false;
    toolbar.hidden = false;

    atualizarNoContent(true);

    // Aplica busca e filtro aos registros do pet ou à visão geral.
    const registros = registrosDoEscopo
        .filter(correspondeBusca)
        .filter(correspondeFiltro);
    const tipos = ['continuo', 'temporario', 'eventual'];

    // Preenche uso contínuo, temporário e eventual.
    for (let indice = 0; indice < tipos.length; indice++) {
        const tipo = tipos[indice];
        const itens = registros.filter(
            item => item.tipoUso === tipo && !estaNoHistorico(item)
        );

        listas[indice].replaceChildren();

        if (!itens.length) {
            const vazio = document.createElement('li');
            vazio.className = 'medicacao-vazia';
            vazio.textContent = buscaAtual || filtroAtual !== 'todos'
                ? 'Nenhuma medicação corresponde à busca ou ao filtro.'
                : 'Nenhuma medicação nesta categoria.';
            listas[indice].append(vazio);
        } else {
            itens.forEach(item => listas[indice].append(criarCartao(item)));
        }
    }

    // Exibe os tratamentos temporários concluídos mais recentemente.
    const historico = registros
        .filter(estaNoHistorico)
        .sort((a, b) => String(b.dataFim).localeCompare(String(a.dataFim)));

    listas[3].replaceChildren();

    if (!historico.length) {
        const vazio = document.createElement('li');
        vazio.className = 'medicacao-vazia';
        vazio.textContent = buscaAtual || filtroAtual === 'historico'
            ? 'Nenhum tratamento concluído corresponde à busca ou ao filtro.'
            : 'Nenhum tratamento concluído.';
        listas[3].append(vazio);
    } else {
        historico.forEach(item => listas[3].append(criarCartao(item, true)));
    }

    // Mostra apenas a categoria solicitada, mantendo o histórico quando pertinente.
    grupos.forEach((grupo, indice) => {
        grupo.hidden = filtroAtual === 'historico'
            ? indice !== 3
            : filtroAtual !== 'todos' &&
                indice !== tipos.indexOf(filtroAtual) &&
                indice !== 3;

        if (indice === 3 && filtroAtual !== 'historico') {
            grupo.hidden = !historico.length && filtroAtual !== 'todos';
        }

        const temCartao = Boolean(listas[indice].querySelector('.cartao-medicacao'));
        if (!temCartao && buscaAtual) grupo.dataset.semResultados = 'true';
        else delete grupo.dataset.semResultados;
    });

    if (!registros.length && (buscaAtual || filtroAtual !== 'todos')) {
        informar('Nenhuma medicação corresponde à busca ou ao filtro.');
    } else {
        informar('');
    }
}

// Cria os controles de filtro e busca da página de listagem.
function montarFiltro() {
    const toolbar = document.querySelector('.barra-ferramentas-medicacoes');
    const botao = toolbar.querySelector(
        '.barra-ferramentas-medicacoes__filtro'
    );

    // Cria um painel inicialmente oculto com as opções de filtro.
    const painel = document.createElement('div');
    painel.className = 'filtro-medicacoes';
    painel.hidden = true;
    painel.innerHTML =
        '<label for="filtro-tipo-medicacao">Mostrar</label>' +
        '<select id="filtro-tipo-medicacao">' +
        '<option value="todos">Todas as medicações</option>' +
        '<option value="continuo">Uso contínuo</option>' +
        '<option value="temporario">Tratamentos temporários</option>' +
        '<option value="eventual">Uso eventual</option>' +
        '<option value="historico">Histórico</option>' +
        '</select>';

    toolbar.append(painel);

    const select = painel.querySelector('select');

    // Atualiza atributos acessíveis e o texto de ajuda do botão.
    botao.setAttribute('aria-expanded', 'false');
    botao.title = 'Filtrar medicações';

    // Abre ou fecha o painel de filtro e foca o seletor quando ele abrir.
    botao.addEventListener('click', () => {
        painel.hidden = !painel.hidden;
        botao.setAttribute('aria-expanded', String(!painel.hidden));

        if (!painel.hidden) select.focus();
    });

    // Quando o filtro muda, atualiza os cartões.
    select.addEventListener('change', () => {
        filtroAtual = select.value;
        renderizarLista();
    });

    // Impede o envio padrão do formulário de busca.
    document.querySelector('.busca-medicacoes')
        .addEventListener('submit', event => event.preventDefault());

    // Atualiza os resultados enquanto a pessoa digita.
    document.querySelector('#buscar-medicacao')
        .addEventListener('input', event => {
            buscaAtual = event.target.value.trim();
            renderizarLista();
        });
}

// Atualiza a mensagem e o botão da página de cadastro.
function atualizarFormulario() {
    const botao = form.querySelector(
        '.formulario-adicionar-medicacao__enviar'
    );
    const aviso = document.getElementById(
        'aviso-integracao-medicacao'
    );

    // Não permite cadastrar medicação sem selecionar um pet.
    botao.disabled = !petsAlvo.length;

    if (!petsAlvo.length) {
        const mensagem = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de adicionar uma medicação.';

        aviso.textContent = mensagem;
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = petsAlvo.length > 1
            ? 'A medicação será salva para ' + petsAlvo.length + ' pets.'
            : 'A medicação será salva neste navegador.';
        informar('');
    }
}

// Configura os campos condicionais e o envio do formulário de cadastro.
function configurarFormulario() {
    const nome = form.elements.nome_medicamento;
    const dosagem = form.elements.dosagem;
    const tipoRadios = [...form.querySelectorAll('input[name="tipo_uso"]')];
    const horario = form.elements.horario_dose;
    const frequencia = form.elements.frequencia_medicamento;
    const dataFim = form.elements.ate_quando;
    const campoHorario = horario.closest('.campo-formulario');
    const campoFrequencia = frequencia.closest('.campo-formulario');
    const campoDataFim = dataFim.closest('.campo-formulario');
    const aviso = document.getElementById(
        'aviso-integracao-medicacao'
    );
    const botao = form.querySelector(
        '.formulario-adicionar-medicacao__enviar'
    );

    // Marca campos obrigatórios e impede uma data final anterior a hoje.
    nome.required = true;
    dosagem.required = true;
    dataFim.min = dataHoje();
    tipoRadios[0].required = true;

    // Mostra os campos necessários para o tipo de uso selecionado
    // e limpa os campos que deixarem de ser necessários.
    const aplicarTipo = tipo => {
        const continuo = tipo === 'continuo';
        const temporario = tipo === 'temporario';

        campoHorario.hidden = !continuo;
        campoFrequencia.hidden = !temporario;
        campoDataFim.hidden = !temporario;

        horario.required = continuo;
        frequencia.required = temporario;
        dataFim.required = temporario;

        if (!continuo) horario.value = '';

        if (!temporario) {
            frequencia.value = '';
            dataFim.value = '';
        }
    };

    // Oculta inicialmente os campos condicionais.
    campoHorario.hidden = true;
    campoFrequencia.hidden = true;
    campoDataFim.hidden = true;

    // Quando o tipo de uso muda, ajusta os campos visíveis.
    form.addEventListener('change', event => {
        if (event.target.name === 'tipo_uso') {
            aplicarTipo(event.target.value);
        }
    });

    // Valida e salva os dados quando o formulário é enviado.
    form.addEventListener('submit', event => {
        event.preventDefault();

        // Não cadastra a medicação sem um pet selecionado.
        if (!petsAlvo.length) return;

        // Exige nome e dosagem depois de remover espaços extras.
        nome.setCustomValidity(
            nome.value.trim() ? '' : 'Informe o nome do medicamento.'
        );
        dosagem.setCustomValidity(
            dosagem.value.trim() ? '' : 'Informe a dosagem.'
        );

        // Mostra os erros de validação do navegador, se houver.
        if (!form.reportValidity()) return;

        // Descobre qual tipo de uso foi selecionado.
        const tipo = tipoRadios.find(radio => radio.checked)?.value;

        if (!tipo) {
            informar('Selecione o tipo de uso.', true);
            return;
        }

        // Converte o estoque para número, se um valor foi informado.
        const estoqueTexto = form.elements.quantidade_estoque.value;

        // Reúne os dados da medicação em um objeto.
        const medicamento = {
            nome: nome.value.trim(),
            tipoUso: tipo,
            dosagem: dosagem.value.trim(),

            // Salva cada campo somente quando ele se aplica ao tipo escolhido.
            horarioDose: tipo === 'continuo' ? horario.value : '',
            frequencia: tipo === 'temporario'
                ? frequencia.value.trim()
                : '',
            dataFim: tipo === 'temporario' ? dataFim.value : '',

            // Usa null quando o estoque não foi informado.
            quantidadeEstoque: estoqueTexto === ''
                ? null
                : Number(estoqueTexto),

            observacao: form.elements.observacao_medicamento.value.trim(),
            criadaEm: new Date().toISOString()
        };

        // Desabilita o botão para evitar envios duplicados.
        botao.disabled = true;

        try {
            const petDestinoId = petsAlvo[0].id;
            const quantidadePets = petsAlvo.length;
            gravarRegistroDosPets(petsAlvo, "medicacoes", medicamento);
            location.href = quantidadePets > 1
                ? "medicacoes.html"
                : "medicacoes.html?petId=" + encodeURIComponent(petDestinoId);
        } catch (erro) {
            // Mostra o erro e libera o botão para uma nova tentativa.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a medicação.';
            botao.disabled = false;
        }
    });
}

// Quando a pessoa muda o pet selecionado, atualiza a página.
seletorPet.addEventListener('change', () => {
    if (paginaLista && seletorPet.value === '__todos__') {
        selecionarTodosPets();
        return;
    }

    if (paginaLista) {
        selecionarPet(pets.find(pet => pet.id === seletorPet.value) ?? null);
    } else {
        petsAlvo = selecaoMultipla.selecionados(pets);
        petAtual = petsAlvo.length === 1 ? petsAlvo[0] : null;
        atualizarUrl(petAtual?.id);
        atualizarFormulario();
    }
});

// Configura os controles apropriados para a página atual.
if (paginaLista) montarFiltro();
else configurarFormulario();

// Carrega os pets. Se ocorrer um erro, desabilita o seletor e informa a pessoa.
try {
    carregarPets();
    if (paginaLista) document.getElementById('btn-add-section').inert = false;
} catch (erro) {
    seletorPet.disabled = true;
    if (form) form.querySelector('[type="submit"]').disabled = true;
    informar(erro.message || 'Não foi possível carregar os pets salvos.', true);
}

// Recarrega os pets quando outra parte do sistema sinaliza uma atualização.
window.addEventListener('keeperhub:pets-atualizados', () => {
    if (form?.closest('[inert]')) return;
    try {
        carregarPets();
    } catch {
        informar('Não foi possível carregar os pets salvos.', true);
    }
});
