// Cadastro, busca e organização local das medicações dos pets.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { listarPets } from './armazenamento.js';
import { agruparRegistros, criarSelecaoMultipla, gravarRegistroDosPets, registrosDoPet, removerRegistrosDosPets, salvarEdicaoRegistroLocal } from './selecao-pets.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';
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
const parametrosEdicao = new URLSearchParams(location.search);
const idsEdicao = (parametrosEdicao.get('ids') || '').split(',').filter(Boolean);
const petIdsEdicao = (parametrosEdicao.get('petIds') || '').split(',').filter(Boolean);
const modoEdicao = Boolean(
    form && parametrosEdicao.get('tipo') !== 'vacina' &&
    idsEdicao.length && idsEdicao.length === petIdsEdicao.length
);
let registroEmEdicao = null;
let petsOrigemEdicao = [];
const medicacoesEditaveis = new Map();
const exclusoesPendentes = new Set();

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

function urlEdicaoMedicacao(medicacao) {
    const destino = new URL('cadastrar-registro.html', location.href);
    destino.searchParams.set('tipo', 'medicamento');
    destino.searchParams.set('ids', medicacao.membros.map(membro => membro.registro.id).join(','));
    destino.searchParams.set('petIds', medicacao.membros.map(membro => membro.pet.id).join(','));
    if (medicacao.membros.length === 1) destino.searchParams.set('petId', medicacao.membros[0].pet.id);
    else destino.searchParams.set('todos', '1');
    return destino.pathname.split('/').pop() + destino.search;
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

// Exibe uma orientação informativa ou uma mensagem de erro.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'informativo';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Oculta temporariamente as medicações que ainda podem ser restauradas.
function medicacoesVisiveis(pet) {
    return registrosDoPet(pet, 'medicacoes').filter(medicacao =>
        !exclusoesPendentes.has(String(medicacao.id))
    );
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
    const todosNaUrl = new URLSearchParams(location.search).get("todos") === "1";

    // Em lista com vários pets, abre por padrão a visão geral.
    if (paginaLista && !petQuery && pets.length > 1) {
        selecionarTodosPets();
    } else {
        selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
    }
    if (!paginaLista && pets.length > 1 && todosNaUrl) {
        seletorPet.value = "__todos__";
        seletorPet.dispatchEvent(new Event("change"));
    } else if (!paginaLista && modoAnterior.startsWith("__") && [...seletorPet.options].some(opcao => opcao.value === modoAnterior)) {
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

// Retorna a data em que o tratamento foi concluído, manual ou automaticamente.
function dataDeConclusao(medicacao) {
    if (medicacao.concluidaEm) return medicacao.concluidaEm;

    return medicacao.tipoUso === 'temporario' &&
        medicacao.dataFim &&
        medicacao.dataFim < dataHoje()
        ? medicacao.dataFim
        : '';
}

// Tratamentos concluídos manualmente ou com prazo já encerrado vão ao histórico.
function estaNoHistorico(medicacao) {
    return Boolean(dataDeConclusao(medicacao));
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

    // Mantém os concluídos disponíveis no grupo Histórico mesmo com outro filtro.
    if (historico) return true;

    return filtroAtual === 'todos' ||
        medicacao.tipoUso === filtroAtual;
}

// Cria o cartão visual de uma medicação.
function criarCartao(medicacao) {
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
    const status = nomeTipo;
    const classeStatus = tipo;

    // Cria o texto do estoque; valores baixos recebem um aviso.
    const detalhesEstoque = estoque === null
        ? ''
        : baixo
            ? `<p class="cartao-medicacao__alerta-estoque"><span class="somente-leitor-tela">Atenção: </span>${estoque} restantes (estoque baixo)</p>`
            : `<p class="cartao-medicacao__estoque"><i class="fa-solid fa-box-open icone" aria-hidden="true"></i>${estoque} restantes</p>`;

    // Para medicações temporárias, mostra a data prevista para terminar.
    const termino = tipo === 'temporario' && medicacao.dataFim
        ? `<p class="cartao-medicacao__termino"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i>Até ${escapar(formatarData(medicacao.dataFim))}</p>`
        : '';

    const li = document.createElement('li');

    // Monta o cartão. Os dados variáveis são escapados antes de entrar no HTML.
    const etiquetaPet = todosPetsSelecionados && medicacao.nomesPets.length
        ? `<span class="etiqueta-pets-registro">${escapar(medicacao.nomesPets.join(", "))}</span>`
        : '';

    const chave = crypto.randomUUID();
    medicacoesEditaveis.set(chave, medicacao);
    li.innerHTML = `<article class="card cartao-medicacao cartao-medicacao--${tipo}${baixo ? ' cartao-medicacao--estoque-baixo' : ''}"><i class="fa-solid ${icone} icone" aria-hidden="true"></i><div class="cartao-medicacao__informacoes"><h3 class="cartao-medicacao__nome">${escapar(medicacao.nome)}${etiquetaPet}</h3><p class="cartao-medicacao__dosagem">${escapar(detalhe || 'Dosagem não informada')}</p>${detalhesEstoque}${termino}${medicacao.observacao ? `<p class="cartao-medicacao__observacao">${escapar(medicacao.observacao)}</p>` : ''}<div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlEdicaoMedicacao(medicacao))}">Editar</a><button type="button" class="botao-texto" data-concluir-medicacao="${chave}">Concluir tratamento</button><button type="button" class="botao-texto" data-excluir-medicacao="${chave}">Excluir</button></div></div><span class="etiqueta-status etiqueta-status--${classeStatus}">${status}</span></article>`;

    return li;
}

// Cria o cartão histórico com o visual da linha do tempo médica.
function criarCartaoHistorico(medicacao) {
    const li = document.createElement('li');
    const chave = crypto.randomUUID();
    const etiquetaPets = medicacao.nomesPets?.length
        ? `<span class="etiqueta-pets-registro">${escapar(medicacao.nomesPets.join(', '))}</span>`
        : '';
    const detalhes = [
        nomesTipo[medicacao.tipoUso] ?? 'Medicação',
        medicacao.dosagem,
        medicacao.tipoUso === 'continuo' && medicacao.horarioDose
            ? `Todos os dias às ${medicacao.horarioDose}`
            : '',
        medicacao.tipoUso === 'temporario' ? medicacao.frequencia : '',
        medicacao.tipoUso === 'eventual' ? 'Quando necessário' : '',
        medicacao.observacao
    ].filter(Boolean).map(escapar).join(' · ');

    medicacoesEditaveis.set(chave, medicacao);
    li.innerHTML = `<article class="linha-tempo-medica__item cartao-historico-medicacao"><i class="fa-solid fa-pills icone" aria-hidden="true"></i><div class="linha-tempo-medica__conteudo"><h3 class="linha-tempo-medica__titulo">${escapar(medicacao.nome)}${etiquetaPets}</h3><p class="linha-tempo-medica__data"><time datetime="${escapar(dataDeConclusao(medicacao))}">Concluído em ${escapar(formatarData(dataDeConclusao(medicacao)))}</time></p><p class="linha-tempo-medica__descricao">${detalhes || 'Detalhes não informados.'}</p><div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlEdicaoMedicacao(medicacao))}">Editar</a><button type="button" class="botao-texto" data-excluir-medicacao="${chave}">Excluir</button></div></div></article>`;

    return li;
}

// Atualiza as categorias e o histórico de medicações na página.
function renderizarLista() {
    medicacoesEditaveis.clear();
    const grupos = [...main.querySelectorAll('.grupo-medicacoes')];
    const listas = grupos.map(grupo => grupo.querySelector('ul'));
    const seletorSecao = seletorPet.closest('.seletor-pet-medicacoes');
    const toolbar = main.querySelector('.barra-ferramentas-medicacoes');
    const escopo = todosPetsSelecionados
        ? pets
        : petAtual ? [petAtual] : [];
    const registrosDoEscopo = agruparRegistros(
        escopo,
        medicacoesVisiveis,
        medicacao => estaNoHistorico(medicacao) ? 'historico' : 'ativo'
    );

    if (!registrosDoEscopo.length) {
        const podeTrocarPet = pets.length > 1 && pets.some(pet => medicacoesVisiveis(pet).length);
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

    // Exibe os tratamentos concluídos mais recentemente.
    const historico = registros
        .filter(estaNoHistorico)
        .sort((a, b) => dataDeConclusao(b).localeCompare(dataDeConclusao(a)));

    listas[3].replaceChildren();

    if (!historico.length) {
        const vazio = document.createElement('li');
        vazio.className = 'medicacao-vazia';
        vazio.textContent = buscaAtual || filtroAtual === 'historico'
            ? 'Nenhum tratamento concluído corresponde à busca ou ao filtro.'
            : 'Nenhum tratamento concluído.';
        listas[3].append(vazio);
    } else {
        historico.forEach(item => listas[3].append(criarCartaoHistorico(item)));
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
        aviso.dataset.estado = pets.length ? 'informativo' : 'erro';
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = petsAlvo.length > 1
            ? 'A medicação será salva para ' + petsAlvo.length + ' pets.'
            : 'A medicação será salva neste navegador.';
        aviso.dataset.estado = 'informativo';
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
    if (modoEdicao) botao.textContent = 'Salvar alterações';

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
            criadaEm: modoEdicao ? registroEmEdicao?.criadaEm : new Date().toISOString()
        };

        // Desabilita o botão para evitar envios duplicados.
        botao.disabled = true;

        try {
            const petDestinoId = petsAlvo[0].id;
            const quantidadePets = petsAlvo.length;
            if (modoEdicao) {
                const atualizado = salvarEdicaoRegistroLocal(
                    petsOrigemEdicao,
                    idsEdicao,
                    petsAlvo,
                    'medicacoes',
                    medicamento
                );
                if (!atualizado) throw new Error('A medicação não foi encontrada para atualizar.');
            } else {
                gravarRegistroDosPets(petsAlvo, "medicacoes", medicamento);
            }
            if (modoEdicao) {
                location.href = quantidadePets > 1
                    ? "medicacoes.html?todos=1"
                    : "medicacoes.html?petId=" + encodeURIComponent(petDestinoId);
                return;
            }
            location.href = quantidadePets > 1
                ? "medicacoes.html"
                : "medicacoes.html?petId=" + encodeURIComponent(petDestinoId);
        } catch (erro) {
            // Mostra o erro e libera o botão para uma nova tentativa.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a medicação.';
            aviso.dataset.estado = 'erro';
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

if (paginaLista) {
    main.addEventListener('click', async event => {
        const botaoConcluir = event.target.closest('[data-concluir-medicacao]');
        const medicacaoParaConcluir = botaoConcluir &&
            medicacoesEditaveis.get(botaoConcluir.dataset.concluirMedicacao);
        if (medicacaoParaConcluir) {
            const membros = medicacaoParaConcluir.membros;
            const concluida = salvarEdicaoRegistroLocal(
                membros.map(membro => membro.pet),
                membros.map(membro => membro.registro.id),
                membros.map(membro => membro.pet),
                'medicacoes',
                { concluidaEm: dataHoje() }
            );
            if (!concluida) {
                informar('Não foi possível concluir o tratamento.', true);
                return;
            }
            informar('Tratamento concluído. Ele foi movido para o Histórico.');
            return;
        }

        const botao = event.target.closest('[data-excluir-medicacao]');
        const medicacao = botao && medicacoesEditaveis.get(botao.dataset.excluirMedicacao);
        if (!medicacao) return;

        const confirmado = await confirmarExclusao({
            titulo: 'Excluir medicação?',
            mensagem: `A medicação ${medicacao.nome} será removida dos pets associados.`
        });
        if (!confirmado) return;

        const membros = medicacao.membros;
        const ids = membros.map(membro => String(membro.registro.id));
        ids.forEach(id => exclusoesPendentes.add(id));
        renderizarLista();

        oferecerDesfazerExclusao({
            antesDe: main.querySelector('.barra-ferramentas-medicacoes'),
            mensagem: 'Medicação removida da lista.',
            aoDesfazer() {
                ids.forEach(id => exclusoesPendentes.delete(id));
                renderizarLista();
            },
            aoExcluir() {
                const excluida = removerRegistrosDosPets(
                    membros.map(membro => membro.pet),
                    'medicacoes',
                    ids
                );
                if (!excluida) throw new Error('Não foi possível excluir a medicação.');
                ids.forEach(id => exclusoesPendentes.delete(id));
            },
            aoFalhar(erro) {
                ids.forEach(id => exclusoesPendentes.delete(id));
                renderizarLista();
                informar(erro.message || 'Não foi possível excluir a medicação.', true);
            }
        });
    });
}

// Carrega os pets. Se ocorrer um erro, desabilita o seletor e informa a pessoa.
try {
    carregarPets();
    if (modoEdicao) {
        const membros = petIdsEdicao.map((petId, indice) => ({
            pet: pets.find(pet => pet.id === petId),
            registroId: idsEdicao[indice]
        }));
        const registro = membros[0]?.pet?.medicacoes?.find(item => item.id === membros[0].registroId);
        if (!registro || membros.some(membro => !membro.pet?.medicacoes?.some(item => item.id === membro.registroId))) {
            informar('A medicação que você quer editar não foi encontrada.', true);
            form.querySelector('[type="submit"]').disabled = true;
        } else {
            registroEmEdicao = registro;
            petsAlvo = membros.map(membro => membro.pet);
            petsOrigemEdicao = petsAlvo.slice();
            petAtual = petsAlvo.length === 1 ? petsAlvo[0] : null;
            selecaoMultipla.selecionarPets(pets, petsAlvo.map(pet => pet.id));
            document.querySelector('#headerSection h1')?.replaceChildren('Editar medicação');
            form.elements.nome_medicamento.value = registro.nome;
            form.querySelector(`input[name="tipo_uso"][value="${registro.tipoUso}"]`).checked = true;
            form.elements.dosagem.value = registro.dosagem || '';
            form.elements.horario_dose.value = registro.horarioDose || '';
            form.elements.frequencia_medicamento.value = registro.frequencia || '';
            form.elements.ate_quando.value = registro.dataFim || '';
            form.elements.quantidade_estoque.value = registro.quantidadeEstoque ?? '';
            form.elements.observacao_medicamento.value = registro.observacao || '';
            form.querySelector('input[name="tipo_uso"]:checked').dispatchEvent(new Event('change', { bubbles: true }));
            atualizarFormulario();
        }
    }
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
