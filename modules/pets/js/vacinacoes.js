// Cadastro, cronograma e histórico das vacinas dos pets.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { definirVacinasDoBanco, listarPets, separarRegistrosDoGrupo } from './armazenamento.js';
import { atualizarVacinasApi, cadastrarVacinaApi, excluirVacinasApi, marcarVacinasAplicadasApi } from './api.js';
import { confirmarExclusao } from './confirmar-exclusao.js';
import { oferecerDesfazerExclusao } from './desfazer-exclusao.js';
import { agruparRegistros, criarSelecaoMultipla, registrosDoPet } from './selecao-pets.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';

// Os dados principais dos pets vêm da API; carrega antes de montar a página.
// Se falhar, listarPets() lança o erro e a página mostra a mensagem.
await carregarPetsDoServidor({ reutilizar: true });


// Busca o painel e o formulário.
// A presença do painel indica que esta é a página de listagem.
const main = document.querySelector('.vacinacoes-pet');
const form = document.querySelector('.formulario-adicionar-vacina');
const paginaLista = Boolean(main);

// Converte os códigos das vacinas em nomes para exibição.
const nomesVacina = {
    v8: 'V8',
    v10: 'V10',
    antirrabica: 'Antirrábica',
    influenza: 'Influenza (Gripe)',
    giardia: 'Giárdia',
    tetano: 'Tétano',
    v3: 'V3',
    v4: 'V4',
    v5: 'V5',
    encefalomielite: 'Encefalomielite',
    garrotilho: 'Garrotilho',
    rinopneumonite: 'Rinopneumonite',
    erisipela_suina: 'Erisipela Suína',
    leptospirose: 'Leptospirose',
    outra: 'Outra'
};

// Guarda os pets disponíveis e o pet selecionado.
let pets = [];
let petAtual = null;
let petsAlvo = [];
let salvando = false;
let todosPetsSelecionados = false;
const exclusoesPendentes = new Set();
const parametrosEdicao = new URLSearchParams(location.search);
const idsEdicao = (parametrosEdicao.get('ids') || '').split(',').filter(Boolean);
const petIdsEdicao = (parametrosEdicao.get('petIds') || '').split(',').filter(Boolean);
const modoEdicao = Boolean(
    !paginaLista && parametrosEdicao.get('tipo') === 'vacina' &&
    idsEdicao.length && idsEdicao.length === petIdsEdicao.length
);

// Formata uma data local como AAAA-MM-DD.
function dataLocalISO(data = new Date()) {
    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, '0'),
        String(data.getDate()).padStart(2, '0')
    ].join('-');
}

// Converte uma data AAAA-MM-DD para um formato legível em português.
// O parâmetro opcoes permite escolher como a data será apresentada.
function formatarData(iso, opcoes = { dateStyle: 'long' }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) {
        return 'Data não informada';
    }

    // Usa o meio do dia para evitar mudanças de data causadas pelo fuso horário.
    return new Intl.DateTimeFormat('pt-BR', opcoes)
        .format(new Date(iso + 'T12:00:00'));
}

// Escapa caracteres especiais para que dados do pet não sejam interpretados
// como código HTML quando inseridos em trechos criados com innerHTML.
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Acrescenta um ano à data.
// Se o dia não existir no ano seguinte, usa o último dia daquele mês.
function adicionarAno(iso) {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const ultimoDia = new Date(ano + 1, mes, 0).getDate();

    return `${ano + 1}-${String(mes).padStart(2, '0')}-${String(
        Math.min(dia, ultimoDia)
    ).padStart(2, '0')}`;
}

// Atualiza o parâmetro petId na URL sem recarregar a página.
function atualizarUrl(id) {
    const url = new URL(location.href);

    if (seletorPet.value === '__todos__') url.searchParams.set('todos', '1');
    else url.searchParams.delete('todos');
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');

    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function urlEdicaoVacina(vacina) {
    const destino = new URL('cadastrar-registro.html', location.href);
    destino.searchParams.set('tipo', 'vacina');
    destino.searchParams.set('ids', vacina.membros.map(membro => membro.registro.id).join(','));
    destino.searchParams.set('petIds', vacina.membros.map(membro => membro.pet.id).join(','));
    if (vacina.membros.length === 1) destino.searchParams.set('petId', vacina.membros[0].pet.id);
    else destino.searchParams.set('todos', '1');
    return destino.pathname.split('/').pop() + destino.search;
}

// Cria na página o seletor de pet e a área de mensagens.
function criarSeletor() {
    const section = document.createElement('section');
    section.className = 'seletor-pet-vacinas';

    // Insere o rótulo, o seletor e a mensagem acessível.
    section.innerHTML =
        '<label for="vacinas-pet">Pet</label>' +
        '<select id="vacinas-pet" aria-describedby="vacinas-status-pet"></select>' +
        '<p id="vacinas-status-pet" role="status" aria-live="polite" hidden></p>';

    // Coloca o seletor depois do cabeçalho, caso ele exista.
    if (form) form.before(section);
    else document.querySelector('.section-header-section')?.after(section);

    return {
        select: section.querySelector('select'),
        status: section.querySelector('p')
    };
}

// Cria o seletor e guarda referências aos seus elementos.
const { select: seletorPet, status } = criarSeletor();
const selecaoMultipla = form ? criarSelecaoMultipla(seletorPet) : null;

// Exibe uma orientação informativa ou uma mensagem de erro na área de status.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'informativo';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Mantém ocultas da listagem as vacinas cuja exclusão ainda pode ser desfeita.
function vacinasVisiveis(pet) {
    return registrosDoPet(pet, 'vacinas').filter(vacina =>
        !exclusoesPendentes.has(String(vacina.id))
    );
}

// Carrega os pets do armazenamento e preenche o seletor.
function carregarPets() {
    const modoAnterior = seletorPet.value;
    pets = listarPets();
    seletorPet.replaceChildren();

    // Adiciona a opção inicial do seletor.
    const inicial = document.createElement('option');
    inicial.disabled = true;
    inicial.hidden = true;
    inicial.value = '';
    inicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletorPet.append(inicial);
    selecaoMultipla?.preparar(pets, true);

    if (paginaLista && pets.length > 1) seletorPet.add(new Option("Todos os pets", "__todos__"));

    pets.forEach(pet => {
        const opcao = document.createElement('option');
        opcao.value = pet.id;
        opcao.textContent = pet.nome;
        seletorPet.append(opcao);
    });

    // Desabilita o seletor se não houver pets cadastrados.
    seletorPet.disabled = !pets.length;

    // Tenta usar o pet indicado na URL.
    const petQuery = pets.find(
        pet => pet.id === new URLSearchParams(location.search).get('petId')
    );
    const todosNaUrl = new URLSearchParams(location.search).get("todos") === "1";

    if (paginaLista && (modoAnterior === "__todos__" || todosNaUrl || !petQuery) && pets.length > 1) {
        seletorPet.value = "__todos__";
        seletorPet.dispatchEvent(new Event("change"));
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

// Seleciona um pet, atualiza a URL e atualiza a tela atual.
function selecionarPet(pet) {
    petAtual = pet;
    todosPetsSelecionados = false;
    if (!paginaLista) petsAlvo = pet ? [pet] : [];
    seletorPet.value = pet?.id ?? '';
    atualizarUrl(pet?.id);
    main?.setAttribute('data-pet-id', pet?.id ?? '');

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
}

// Para cada nome de vacina, encontra o registro de aplicação mais recente.
// Isso permite exibir a próxima dose correspondente à aplicação mais atual.
function registrosMaisRecentes(vacinas) {
    const porNome = new Map();

    for (const vacina of vacinas) {
        // Usa o nome personalizado quando a opção foi "outra".
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : vacina.nome;

        // Normaliza o nome para agrupar variações de maiúsculas e espaços.
        const chave = String(nome ?? '')
            .trim()
            .toLocaleLowerCase('pt-BR');

        const anterior = porNome.get(chave);

        // Guarda o registro se ainda não houver outro ou se ele for mais recente.
        if (
            !anterior ||
            String(vacina.dataAgendada || vacina.dataAplicacao) >
                String(anterior.dataAgendada || anterior.dataAplicacao)
        ) {
            porNome.set(chave, vacina);
        }
    }

    return [...porNome.values()];
}

// Cria um item de lista com uma mensagem, por exemplo quando não há registros.
function listaVazia(texto) {
    const li = document.createElement('li');
    li.className = 'vacina-vazia';
    li.textContent = texto;
    return li;
}

// Desenha os destaques, o cronograma e o histórico de vacinas.
function renderizarLista() {
    const listaDestaques = main.querySelector('.destaques-vacinas > ul');
    const listaCronograma = main.querySelector('.cronograma-vacinas > ul');
    const listaHistorico = main.querySelector('.historico-vacinas > ul');
    const secaoSeletorPet = seletorPet.closest('.seletor-pet-vacinas');

    const destinoCadastro = new URL('cadastrar-registro.html', location.href);
    destinoCadastro.searchParams.set('tipo', 'vacina');
    if (petAtual) destinoCadastro.searchParams.set('petId', petAtual.id);
    if (todosPetsSelecionados) destinoCadastro.searchParams.set('todos', '1');
    window.keeperhubModuleConfig.addUrl = destinoCadastro.href;
    const botaoAdicionar = document.getElementById('btn-add');
    if (botaoAdicionar) botaoAdicionar.href = destinoCadastro.href;

    main.querySelectorAll('.abas-pet a').forEach(link => {
        const destino = new URL(link.href);
        if (petAtual) destino.searchParams.set('petId', petAtual.id);
        else destino.searchParams.delete('petId');
        if (todosPetsSelecionados) destino.searchParams.set('todos', '1');
        else destino.searchParams.delete('todos');
        link.href = destino.href;
    });

    const secoesConteudo = [
        main.querySelector('.destaques-vacinas'),
        main.querySelector('.cronograma-vacinas'),
        main.querySelector('.historico-vacinas')
    ];

    // Limpa as listas antes de renderizá-las novamente.
    listaDestaques.replaceChildren();
    listaCronograma.replaceChildren();
    listaHistorico.replaceChildren();

    // Sem pet selecionado, mantém uma única orientação e esconde as listas.
    // Se já existem pets, mas nenhum tem vacinas, mostra o no-content para
    // conduzir ao cadastro inicial sem repetir mensagens em cada seção.
    const existeVacina = pets.some(pet => vacinasVisiveis(pet).length > 0);
    if (!petAtual && !todosPetsSelecionados) {
        secoesConteudo.forEach(secao => { secao.hidden = true; });

        secaoSeletorPet.hidden = !existeVacina;
        informar(existeVacina ? 'Escolha um pet para consultar as vacinas.' : '');
        atualizarNoContent(existeVacina);
        return;
    }

    const escopo = todosPetsSelecionados ? pets : [petAtual];
    const registros = agruparRegistros(escopo, vacinasVisiveis);
    if (!registros.length) {
        const podeTrocarPet = existeVacina && pets.length > 1;
        secaoSeletorPet.hidden = !podeTrocarPet;
        secoesConteudo.forEach(secao => { secao.hidden = true; });
        informar(podeTrocarPet ? 'Nenhuma vacina para o pet selecionado.' : '');
        atualizarNoContent(podeTrocarPet);
        return;
    }

    secaoSeletorPet.hidden = false;
    secoesConteudo.forEach(secao => { secao.hidden = false; });
    informar('');
    atualizarNoContent(true);

    const hoje = dataLocalISO();

    // Pega o registro mais recente de cada vacina e ordena pela próxima dose.
    const dataDestaque = vacina => vacina.dataAgendada || vacina.proximaDose;
    const maisRecentes = agruparRegistros(escopo, pet => registrosMaisRecentes(vacinasVisiveis(pet)))
        .sort((a, b) =>
            String(dataDestaque(a) ?? a.dataAplicacao)
                .localeCompare(String(dataDestaque(b) ?? b.dataAplicacao))
        );

    // Agendamentos futuros e próximas doses aparecem nos destaques.
    const pendentes = maisRecentes.filter(item => dataDestaque(item));

    // Todas as aplicações são ordenadas da mais recente para a mais antiga
    // para compor o histórico.
    const aplicadas = registros
        .filter(item => item.status !== 'agendada' && item.dataAplicacao)
        .slice()
        .sort((a, b) =>
            String(b.dataAplicacao).localeCompare(String(a.dataAplicacao))
        );

    // Se não houver próximas doses, informa isso na área de destaques.
    if (!pendentes.length) {
        listaDestaques.append(listaVazia('Nenhuma próxima dose cadastrada.'));
    }

    // Cria um cartão de destaque para cada próxima dose.
    for (const [indice, vacina] of pendentes.entries()) {
        // Calcula quantos dias faltam para a próxima dose.
        const dataPendencia = dataDestaque(vacina);
        const dias = Math.ceil(
            (
                new Date(dataPendencia + 'T12:00:00') -
                new Date(hoje + 'T12:00:00')
            ) / 86400000
        );

        const vencida = dias < 0;

        // Calcula o progresso entre a data da aplicação e a próxima dose.
        const inicioContagem = vacina.dataAplicacao || hoje;
        const duracao =
            new Date(dataPendencia + 'T12:00:00') -
            new Date(inicioContagem + 'T12:00:00');

        const decorrido =
            new Date(hoje + 'T12:00:00') -
            new Date(inicioContagem + 'T12:00:00');

        // Agendamentos ainda não aplicados começam com progresso zero.
        const progresso = vacina.status === 'agendada'
            ? 0
            : duracao <= 0
                ? 100
                : Math.max(0, Math.min(100, Math.round((decorrido / duracao) * 100)));

        // Usa o nome personalizado ou o nome amigável da vacina.
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : nomesVacina[vacina.nome] ?? vacina.nome;

        // Define o rótulo da frequência e a mensagem de prazo.
        const frequencia = vacina.status === 'agendada'
            ? 'Aplicação agendada'
            : vacina.frequencia === 'reforco_anual'
                ? 'Reforço anual'
                : 'Próxima dose';

        const textoDias = vencida
            ? `Atrasada há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
            : dias === 0
                ? 'Vence hoje'
                : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

        const li = document.createElement('li');

        // Insere os valores variáveis escapados para que sejam tratados como texto.
        // O primeiro cartão recebe uma classe visual de destaque.
        const idsGrupo = vacina.membros.map(membro => membro.registro.id).join(',');
        li.innerHTML = `<article class="card cartao-destaque-vacina${indice === 0 ? ' cartao-destaque-vacina--destaque' : ''}"><p class="cartao-destaque-vacina__rotulo">${escapar(frequencia)}</p><h3 class="cartao-destaque-vacina__nome">${escapar(nome)}${todosPetsSelecionados ? " · " + escapar(vacina.nomesPets.join(", ")) : ""}</h3><i class="fa-solid fa-syringe icone" aria-hidden="true"></i><p class="cartao-destaque-vacina__data"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i><time datetime="${escapar(dataPendencia)}">${escapar(formatarData(dataPendencia))}</time></p><div class="barra-progresso" aria-hidden="true"><div class="barra-progresso__preenchimento" style="width:${progresso}%"></div></div><p class="cartao-destaque-vacina__contagem-regressiva">${escapar(textoDias)}</p><div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlEdicaoVacina(vacina))}">Editar</a>${vacina.status === 'agendada' ? `<button type="button" class="botao-texto" data-marcar-vacina="${escapar(idsGrupo)}">Marcar aplicada</button>` : ''}<button type="button" class="botao-texto" data-excluir-vacina="${escapar(idsGrupo)}">Excluir</button></div></article>`;

        listaDestaques.append(li);
    }

    // Cria o cronograma a partir dos registros mais recentes.
    const cronograma = maisRecentes.slice().sort((a, b) =>
        String(a.dataAgendada ?? a.proximaDose ?? a.dataAplicacao)
            .localeCompare(String(b.dataAgendada ?? b.proximaDose ?? b.dataAplicacao))
    );

    if (!cronograma.length) {
        listaCronograma.append(listaVazia('Nenhuma vacina registrada.'));
    }

    for (const vacina of cronograma) {
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : nomesVacina[vacina.nome] ?? vacina.nome;

        const agendada = vacina.status === 'agendada' && Boolean(vacina.dataAgendada);
        const temProxima = Boolean(vacina.proximaDose);
        const dataAgendadaAtrasada = agendada && vacina.dataAgendada < hoje;
        const atrasada = dataAgendadaAtrasada || (!agendada && temProxima && vacina.proximaDose < hoje);

        // Agendamentos usam sua data marcada; registros aplicados usam a próxima dose.
        const data = agendada
            ? vacina.dataAgendada
            : temProxima ? vacina.proximaDose : vacina.dataAplicacao;
        const detalhe = agendada
            ? `Agendada para ${formatarData(data)}`
            : temProxima
                ? `Próxima dose prevista para ${formatarData(data)}`
                : `Aplicada em ${formatarData(data)}`;

        // Define o texto, a classe e o ícone de acordo com a situação da vacina.
        const statusTexto = atrasada
            ? 'Atrasada'
            : agendada || temProxima
                ? 'Agendada'
                : 'Aplicada';

        const classeStatus = atrasada
            ? 'atrasada'
            : agendada || temProxima
                ? 'agendada'
                : 'aplicada';

        const icone = atrasada
            ? 'fa-triangle-exclamation'
            : agendada || temProxima
                ? 'fa-syringe'
                : 'fa-circle-check';

        const li = document.createElement('li');

        // Cria a linha do cronograma com dados variáveis escapados.
        const idsGrupo = vacina.membros.map(membro => membro.registro.id).join(',');
        li.innerHTML = `<article class="item-vacina item-vacina--${classeStatus}"><i class="fa-solid ${icone} icone" aria-hidden="true"></i><div class="item-vacina__informacoes"><h3 class="item-vacina__nome">${escapar(nome)}${todosPetsSelecionados ? " · " + escapar(vacina.nomesPets.join(", ")) : ""}</h3><p class="item-vacina__detalhe">${escapar(detalhe)}${vacina.clinica ? ` · ${escapar(vacina.clinica)}` : ''}${vacina.horario ? ` · ${escapar(vacina.horario)}` : ''}${vacina.observacao ? ` · ${escapar(vacina.observacao)}` : ''}</p><div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlEdicaoVacina(vacina))}">Editar</a>${agendada ? `<button type="button" class="botao-texto" data-marcar-vacina="${escapar(idsGrupo)}">Marcar aplicada</button>` : ''}<button type="button" class="botao-texto" data-excluir-vacina="${escapar(idsGrupo)}">Excluir</button></div></div><span class="etiqueta-status etiqueta-status--${classeStatus}">${statusTexto}</span></article>`;

        listaCronograma.append(li);
    }

    // Se ainda não houver aplicações, mostra uma mensagem no histórico.
    if (!aplicadas.length) {
        listaHistorico.append(
            listaVazia('O histórico aparecerá aqui após o primeiro registro.')
        );
    }

    // Adiciona cada aplicação ao histórico.
    for (const vacina of aplicadas) {
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : nomesVacina[vacina.nome] ?? vacina.nome;

        const li = document.createElement('li');
        const etiquetaPets = vacina.nomesPets?.length
            ? `<span class="etiqueta-pets-registro">${escapar(vacina.nomesPets.join(', '))}</span>`
            : '';

        // Mostra o nome, a data de aplicação e, se houver, a observação.
        const idsGrupo = vacina.membros.map(membro => membro.registro.id).join(',');
        li.innerHTML = `<article class="card item-vacina item-vacina--registro"><i class="fa-solid fa-clock-rotate-left icone" aria-hidden="true"></i><div class="item-vacina__informacoes"><h3 class="item-vacina__nome">${escapar(nome)}${etiquetaPets}</h3><p class="item-vacina__detalhe">Aplicada em <time datetime="${escapar(vacina.dataAplicacao)}">${escapar(formatarData(vacina.dataAplicacao, { day: '2-digit', month: 'short', year: 'numeric' }))}</time>${vacina.observacao ? ` · ${escapar(vacina.observacao)}` : ''}</p><div class="acoes-cartao-registro"><a class="botao-texto" href="${escapar(urlEdicaoVacina(vacina))}">Editar</a><button type="button" class="botao-texto" data-excluir-vacina="${escapar(idsGrupo)}">Excluir</button></div></div></article>`;

        listaHistorico.append(li);
    }
}

// Atualiza a mensagem e o botão na página de cadastro.
function atualizarFormulario() {
    const botao = form.querySelector('.formulario-adicionar-vacina__enviar');
    const aviso = document.getElementById('aviso-integracao-vacina');

    // O formulário aceita um pet ou a seleção conjunta de todos.
    botao.disabled = salvando || !petsAlvo.length;

    if (!petsAlvo.length) {
        const mensagem = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de registrar uma vacina.';

        aviso.textContent = mensagem;
        aviso.dataset.estado = pets.length ? 'informativo' : 'erro';
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = petsAlvo.length > 1
            ? `A vacina será registrada para ${petsAlvo.length} pets na sua conta.`
            : 'O registro será salvo na sua conta.';
        aviso.dataset.estado = 'informativo';
        informar('');
    }
}

// Configura campos, opções condicionais e envio do formulário de vacina.
function configurarFormulario() {
    const campoOutra = form.querySelector(
        '.opcoes-nome-vacina__personalizada'
    );
    const vacinaOutra = form.elements.nome_vacina_outra;
    const campoProxima = form.elements.prox_dose
        .closest('.campo-formulario');
    const botao = form.querySelector(
        '.formulario-adicionar-vacina__enviar'
    );
    const aviso = document.getElementById('aviso-integracao-vacina');
    const dataAplicacao = form.elements.data_aplicacao;

    if (modoEdicao) botao.textContent = 'Salvar alterações';

    // Datas futuras representam agendamentos; datas passadas/hoje representam aplicações.
    dataAplicacao.required = true;
    dataAplicacao.removeAttribute('max');

    // Os campos condicionais começam ocultos.
    campoOutra.hidden = true;
    campoProxima.hidden = true;

    vacinaOutra.addEventListener('input', () => vacinaOutra.setCustomValidity(''));
    for (const campo of [dataAplicacao, form.elements.prox_dose]) {
        campo.addEventListener('input', () => form.elements.prox_dose.setCustomValidity(''));
    }

    // Ajusta os campos visíveis conforme as opções escolhidas.
    form.addEventListener('change', event => {
        if (event.target.name === 'nome_vacina') {
            const mostrar = event.target.value === 'outra';
            campoOutra.hidden = !mostrar;
            vacinaOutra.required = mostrar;
            vacinaOutra.setCustomValidity('');

            // Limpa o nome personalizado se "outra" deixar de estar selecionada.
            if (!mostrar) vacinaOutra.value = '';
        }

        if (event.target.name === 'frequencia') {
            const fracionada =
                event.target.value === 'doses_fracionadas';

            // A data da próxima dose só é exigida para doses fracionadas.
            campoProxima.hidden = !fracionada;
            form.elements.prox_dose.required = fracionada;
            form.elements.prox_dose.setCustomValidity('');

            if (!fracionada) form.elements.prox_dose.value = '';
        }
    });

    // Valida os dados e salva a nova vacina quando o formulário é enviado.
    form.addEventListener('submit', async event => {
        event.preventDefault();

        // Sem pet selecionado, não há onde salvar o registro.
        if (salvando || !petsAlvo.length) return;

        // Busca as opções escolhidas para vacina e frequência.
        const escolhida = form.querySelector(
            'input[name="nome_vacina"]:checked'
        );
        const frequencia = form.querySelector(
            'input[name="frequencia"]:checked'
        );

        // Exige que ambas as opções tenham sido selecionadas.
        if (!escolhida || !frequencia) {
            aviso.textContent = 'Selecione a vacina e a frequência.';
            aviso.dataset.estado = 'erro';
            informar('Selecione a vacina e a frequência.', true);
            form.reportValidity();
            return;
        }

        // Limpa erros anteriores e exige o nome personalizado
        // quando a opção "outra" estiver selecionada.
        form.elements.prox_dose.setCustomValidity('');
        vacinaOutra.setCustomValidity(
            escolhida.value !== 'outra' || vacinaOutra.value.trim()
                ? ''
                : 'Informe o nome da vacina.'
        );

        if (!form.reportValidity()) return;

        const dataEvento = dataAplicacao.value;
        const fracionada = frequencia.value === 'doses_fracionadas';

        // Reforços anuais recebem automaticamente a data de um ano depois.
        // Para doses fracionadas, usa a data preenchida no campo.
        // Nos demais casos, deixa a próxima dose vazia.
        const proximaDose = frequencia.value === 'reforco_anual'
            ? adicionarAno(dataEvento)
            : fracionada
                ? form.elements.prox_dose.value
                : '';

        // A próxima dose de uma série fracionada não pode ser anterior
        // à data da aplicação.
        if (fracionada && proximaDose < dataEvento) {
            form.elements.prox_dose.setCustomValidity(
                'A próxima dose deve ser na data de aplicação ou depois.'
            );
            form.elements.prox_dose.reportValidity();
            return;
        }

        form.elements.prox_dose.setCustomValidity('');

        // Desabilita o botão para evitar envios repetidos.
        salvando = true;
        botao.disabled = true;

        // A API define o status e grava um registro por pet escolhido.
        const dadosVacina = {
            petIds: petsAlvo.map(pet => pet.id),
            ...(modoEdicao ? { petIdsOrigem: petIdsEdicao.map(Number) } : {}),
            nome: escolhida.value,
            nomePersonalizado: escolhida.value === 'outra'
                ? vacinaOutra.value.trim()
                : '',
            data: dataEvento,
            frequencia: frequencia.value,
            proximaDose,
            clinica: form.elements.clinica_vacina.value.trim(),
            horario: form.elements.horario_vacina.value,
            observacao: form.elements.observacao_vacina.value.trim()
        };

        try {
            // Guardamos os dados antes do evento de atualização recarregar o seletor.
            const [petDestinoId] = dadosVacina.petIds;
            const quantidadePets = dadosVacina.petIds.length;
            const resposta = modoEdicao
                ? await atualizarVacinasApi({ ...dadosVacina, ids: idsEdicao.map(Number) })
                : await cadastrarVacinaApi(dadosVacina);
            if (modoEdicao) separarRegistrosDoGrupo('vacinas', idsEdicao);
            definirVacinasDoBanco(resposta.vacinas, resposta.grupoIds ?? resposta.criados);
            if (modoEdicao) {
                const destino = new URL('vacinacoes.html', location.href);
                if (petsAlvo.length > 1) destino.searchParams.set('todos', '1');
                else destino.searchParams.set('petId', petsAlvo[0].id);
                location.href = destino.href;
                return;
            }
            location.href = quantidadePets > 1
                ? "vacinacoes.html?todos=1"
                : "vacinacoes.html?petId=" + encodeURIComponent(petDestinoId);
        } catch (erro) {
            // Se o salvamento falhar, mostra o erro e reabilita o botão.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a vacina.';
            aviso.dataset.estado = 'erro';
            salvando = false;
            botao.disabled = !petsAlvo.length;
        }
    });
}

// Quando a pessoa muda o pet selecionado, atualiza a página.
seletorPet.addEventListener('change', () => {
    if (paginaLista && seletorPet.value === "__todos__") {
        petAtual = null;
        todosPetsSelecionados = true;
        atualizarUrl(null);
        renderizarLista();
    } else if (paginaLista) {
        selecionarPet(pets.find(pet => pet.id === seletorPet.value) ?? null);
    } else {
        petsAlvo = selecaoMultipla.selecionados(pets);
        petAtual = petsAlvo.length === 1 ? petsAlvo[0] : null;
        atualizarUrl(petAtual?.id);
        atualizarFormulario();
    }
});

// Configura o formulário somente na página de cadastro.
if (!paginaLista) {
    configurarFormulario();
}

if (paginaLista) {
    main.addEventListener('click', async event => {
        const excluir = event.target.closest('[data-excluir-vacina]');
        if (excluir) {
            const ids = excluir.dataset.excluirVacina.split(',').filter(Boolean).map(Number);
            const confirmado = await confirmarExclusao({
                titulo: 'Excluir vacina?',
                mensagem: 'A vacina e seus dados de aplicação serão removidos.'
            });
            if (!confirmado) return;

            const idsTexto = ids.map(String);
            idsTexto.forEach(id => exclusoesPendentes.add(id));
            renderizarLista();

            oferecerDesfazerExclusao({
                antesDe: main.querySelector('.destaques-vacinas'),
                mensagem: 'Vacina removida da lista.',
                aoDesfazer() {
                    idsTexto.forEach(id => exclusoesPendentes.delete(id));
                    renderizarLista();
                },
                async aoExcluir() {
                    const vacinas = await excluirVacinasApi(ids);
                    idsTexto.forEach(id => exclusoesPendentes.delete(id));
                    separarRegistrosDoGrupo('vacinas', idsTexto);
                    definirVacinasDoBanco(vacinas);
                },
                aoFalhar(erro) {
                    idsTexto.forEach(id => exclusoesPendentes.delete(id));
                    renderizarLista();
                    informar(erro.message || 'Não foi possível excluir a vacina.', true);
                }
            });
            return;
        }

        const botao = event.target.closest('[data-marcar-vacina]');
        if (!botao || botao.disabled) return;
        const ids = botao.dataset.marcarVacina.split(',').filter(Boolean).map(Number);
        botao.disabled = true;
        try {
            const resposta = await marcarVacinasAplicadasApi(ids);
            definirVacinasDoBanco(resposta.vacinas);
            informar('Vacinação confirmada como aplicada.');
        } catch (erro) {
            informar(erro.message || 'Não foi possível confirmar a vacinação.', true);
            botao.disabled = false;
        }
    });
}

// Carrega os pets ao iniciar.
// Se houver erro, desabilita o seletor e mostra uma mensagem.
try {
    carregarPets();
    if (modoEdicao) {
        const membros = petIdsEdicao.map((petId, indice) => ({
            pet: pets.find(pet => pet.id === petId),
            registroId: idsEdicao[indice]
        }));
        const registro = membros[0]?.pet?.vacinas?.find(item => item.id === membros[0].registroId);
        if (!registro || membros.some(membro => !membro.pet?.vacinas?.some(item => item.id === membro.registroId))) {
            informar('A vacina que você quer editar não foi encontrada.', true);
            form.querySelector('[type="submit"]').disabled = true;
        } else {
            petsAlvo = membros.map(membro => membro.pet);
            petAtual = petsAlvo.length === 1 ? petsAlvo[0] : null;
            selecaoMultipla.selecionarPets(pets, petsAlvo.map(pet => pet.id));
            document.querySelector('#headerSection h1')?.replaceChildren('Editar vacina');
            let radioNome = form.querySelector(`input[name="nome_vacina"][value="${registro.nome}"]`);
            const nomePersonalizado = registro.nomePersonalizado || nomesVacina[registro.nome] || registro.nome;
            if (!radioNome) {
                radioNome = form.querySelector('input[name="nome_vacina"][value="outra"]');
                form.elements.nome_vacina_outra.value = nomePersonalizado;
            } else {
                form.elements.nome_vacina_outra.value = registro.nomePersonalizado;
            }
            radioNome.checked = true;
            form.elements.data_aplicacao.value = registro.dataAgendada || registro.dataAplicacao;
            form.elements.clinica_vacina.value = registro.clinica;
            form.elements.horario_vacina.value = registro.horario;
            form.elements.observacao_vacina.value = registro.observacao;
            const radioFrequencia = form.querySelector(`input[name="frequencia"][value="${registro.frequencia}"]`);
            radioFrequencia.checked = true;
            form.elements.prox_dose.value = registro.proximaDose;
            radioNome.dispatchEvent(new Event('change', { bubbles: true }));
            radioFrequencia.dispatchEvent(new Event('change', { bubbles: true }));
            atualizarFormulario();
        }
    }
    if (paginaLista) document.getElementById('btn-add-section').inert = false;
} catch (erro) {
    seletorPet.disabled = true;
    if (form) form.querySelector('[type="submit"]').disabled = true;
    informar(erro.message || 'Não foi possível carregar os pets salvos.', true);
}

// Recarrega a lista quando outra parte da aplicação atualizar os pets.
window.addEventListener('keeperhub:pets-atualizados', () => {
    if (form?.closest('[inert]')) return;
    try {
        carregarPets();
    } catch {
        informar('Não foi possível carregar os pets salvos.', true);
    }
});
