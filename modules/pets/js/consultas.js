// Controla o cadastro, a listagem e o histórico das consultas dos pets.
import { definirConsultasDoBanco, listarPets } from './armazenamento.js';
import { cadastrarConsultaApi, registrarConsultasRealizadasApi } from './api.js';
import { agruparRegistros, criarSelecaoMultipla, registrosDoPet } from './selecao-pets.js';
import { atualizarNoContent } from '/shared/services/no-content.js';
import { carregarPets as carregarPetsDoServidor } from './armazenamento.js';

// Os dados principais dos pets vêm da API; carrega antes de montar a página.
// Se falhar, listarPets() lança o erro e a página mostra a mensagem.
await carregarPetsDoServidor();


// Verifica se a página atual é a página que lista consultas.
const mainPainel = document.querySelector('.painel-medico');
const formulario = document.querySelector('.formulario-adicionar-consulta');
const paginaLista = Boolean(mainPainel);

// Converte os códigos de especialidade salvos em nomes para exibição.
const nomeEspecialidade = {
    clinico_geral: 'Clínico Geral',
    dermatologista: 'Dermatologista',
    cardiologista: 'Cardiologista',
    oftalmologista: 'Oftalmologista',
    ortopedista: 'Ortopedista',
    odontologista: 'Odontologista',
    outra: 'Outra'
};

// Guarda os pets disponíveis e o pet selecionado atualmente.
let pets = [];
let petAtual = null;
let petsAlvo = [];
let salvando = false;
let todosPetsSelecionados = false;
const consultasExibidas = new Map();

// Converte caracteres especiais em entidades HTML antes de inserir texto
// em trechos montados com innerHTML. Isso impede que os dados sejam
// interpretados como marcação HTML.
function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

// Retorna uma data local no formato AAAA-MM-DD.
function dataLocalISO(data = new Date()) {
    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, '0'),
        String(data.getDate()).padStart(2, '0')
    ].join('-');
}

// Converte uma data AAAA-MM-DD para um formato legível em português.
function formatarData(iso) {
    // Se o valor não tiver o formato esperado, mostra uma mensagem padrão.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) {
        return 'Data não informada';
    }

    // Usa o meio do dia para evitar que fusos horários alterem a data exibida.
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'medium'
    }).format(new Date(iso + 'T12:00:00'));
}

// Atualiza o parâmetro petId da URL sem recarregar a página.
function atualizarUrl(id) {
    const url = new URL(window.location.href);

    if ((paginaLista && todosPetsSelecionados) || seletor.value === '__todos__') {
        url.searchParams.set('todos', '1');
    }
    else url.searchParams.delete('todos');
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');

    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Cria dinamicamente o seletor de pet e sua área de mensagens.
function criarSeletor() {
    const seletor = document.createElement('section');
    seletor.className = 'seletor-pet-consultas';

    // Cria o rótulo, o seletor e a área acessível para mensagens.
    seletor.innerHTML =
        '<label for="consulta-pet">Pet</label>' +
        '<select id="consulta-pet" aria-describedby="consulta-pet-status"></select>' +
        '<p id="consulta-pet-status" role="status" aria-live="polite" hidden></p>';

    // Insere o seletor logo depois do cabeçalho, se ele existir.
    const cabecalho = document.querySelector('.section-header-section');
    cabecalho?.insertAdjacentElement('afterend', seletor);

    // Devolve referências aos elementos que serão usados pelo restante do código.
    return {
        seletor: seletor.querySelector('select'),
        status: seletor.querySelector('p')
    };
}

// Cria o seletor e guarda suas partes em variáveis.
const { seletor, status } = criarSeletor();
const selecaoMultipla = formulario ? criarSelecaoMultipla(seletor) : null;

// Mostra uma mensagem relacionada à seleção do pet.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'informativo';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Busca os pets salvos e prepara o seletor para escolher um deles.
function carregarPets() {
    const modoAnterior = seletor.value;
    pets = listarPets();
    seletor.replaceChildren();

    // Adiciona uma opção inicial que orienta a pessoa.
    const opcao = document.createElement('option');
    opcao.disabled = true;
    opcao.hidden = true;
    opcao.value = '';
    opcao.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletor.append(opcao);
    selecaoMultipla?.preparar(pets, true);

    if (paginaLista && pets.length > 1) seletor.add(new Option("Todos os pets", "__todos__"));

    // Adiciona cada pet como uma opção do seletor.
    for (const pet of pets) {
        const item = document.createElement('option');
        item.value = pet.id;
        item.textContent = pet.nome;
        seletor.append(item);
    }

    // Desabilita o seletor quando não há pets cadastrados.
    seletor.disabled = !pets.length;

    // Se a URL contém um petId, tenta localizar esse pet.
    const idQuery = new URLSearchParams(location.search).get('petId');
    const petQuery = pets.find(pet => pet.id === idQuery);
    const todosNaUrl = new URLSearchParams(location.search).get('todos') === '1';

    // Seleciona o pet da URL ou, se só houver um, seleciona esse pet.
    if (paginaLista && (modoAnterior === '__todos__' || todosNaUrl || !petQuery) && pets.length > 1) {
        seletor.value = "__todos__";
        seletor.dispatchEvent(new Event("change"));
    } else {
        selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
    }
    if (!paginaLista && pets.length > 1 && todosNaUrl) {
        seletor.value = "__todos__";
        seletor.dispatchEvent(new Event("change"));
    } else if (!paginaLista && modoAnterior.startsWith("__") && [...seletor.options].some(opcao => opcao.value === modoAnterior)) {
        seletor.value = modoAnterior;
        seletor.dispatchEvent(new Event("change"));
    }


    // Mostra uma orientação adequada quando ainda não há seleção.
    if (!paginaLista && !petQuery && pets.length > 1) {
        informar('Escolha o pet para consultar ou agendar atendimento.');
    }

    if (!paginaLista && !pets.length) {
        informar('Cadastre um pet antes de registrar consultas.', true);
    }
}

// Define o pet atual, atualiza a URL e atualiza a página correspondente.
function selecionarPet(pet) {
    petAtual = pet;
    todosPetsSelecionados = false;
    if (!paginaLista) petsAlvo = pet ? [pet] : [];
    seletor.value = pet?.id ?? '';
    atualizarUrl(pet?.id);

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
}

// Acrescenta o pet selecionado aos links que levam ao cadastro de consulta.
function prepararLinkCadastro() {
    const parametros = new URLSearchParams();
    if (petAtual) parametros.set('petId', petAtual.id);
    else if (todosPetsSelecionados) parametros.set('todos', '1');
    const sufixo = parametros.size ? '?' + parametros.toString() : '';
    const destino = 'cadastrar-consulta.html' + sufixo;

    window.keeperhubModuleConfig.addUrl =
        '/modules/pets/components/' + destino;
    document
        .querySelectorAll('a[href*="cadastrar-consulta.html"]')
        .forEach(link => {
            link.href = destino;
        });
}

// Desenha as próximas consultas e o histórico na página de listagem.
function renderizarLista() {
    const proximas = mainPainel.querySelector('.consultas > ul');
    const historico = mainPainel.querySelector('.linha-tempo-medica');
    const seletorSecao = seletor.closest('.seletor-pet-consultas');
    const botaoAdicionar = document.getElementById('btn-add-section');
    const secoesConteudo = [
        mainPainel.querySelector('.consultas'),
        mainPainel.querySelector('.exames-medicos'),
        mainPainel.querySelector('.historico-medico')
    ];

    prepararLinkCadastro();
    consultasExibidas.clear();

    const temConsultaEmAlgumPet = pets.some(pet =>
        Array.isArray(pet.consultas) && pet.consultas.some(item =>
            item && typeof item === 'object'
        )
    );

    // Sem pet selecionado, só mostra uma orientação se já houver registros
    // em algum pet; no primeiro cadastro usa o no-content compartilhado.
    if (!petAtual && !todosPetsSelecionados) {
        proximas.replaceChildren();
        historico.replaceChildren();
        secoesConteudo.forEach(secao => { secao.hidden = true; });
        seletorSecao.hidden = !temConsultaEmAlgumPet;
        botaoAdicionar.hidden = pets.length === 0;

        if (temConsultaEmAlgumPet) {
            seletorSecao.hidden = false;
            informar('Escolha um pet para consultar os atendimentos.');
            atualizarNoContent(true);
        } else {
            informar('');
            atualizarNoContent(false);
        }
        return;
    }

    const escopo = todosPetsSelecionados ? pets : [petAtual];
    const consultas = agruparRegistros(escopo, pet => registrosDoPet(pet, "consultas"),
        consulta => consulta.status === "realizada" ? "realizada" : "pendente")
        .sort((a, b) =>
            `${a.data ?? ''} ${a.horario ?? ''}`
                .localeCompare(`${b.data ?? ''} ${b.horario ?? ''}`)
        );

    if (!consultas.length) {
        proximas.replaceChildren();
        historico.replaceChildren();
        secoesConteudo.forEach(secao => { secao.hidden = true; });
        const podeTrocarPet = temConsultaEmAlgumPet && pets.length > 1;
        seletorSecao.hidden = !podeTrocarPet;
        botaoAdicionar.hidden = false;
        informar(podeTrocarPet ? 'Nenhuma consulta para o pet selecionado.' : '');
        atualizarNoContent(podeTrocarPet);
        return;
    }

    seletorSecao.hidden = false;
    botaoAdicionar.hidden = false;
    secoesConteudo.forEach(secao => { secao.hidden = false; });
    atualizarNoContent(true);
    informar('');

    // Usa a data local de hoje para separar consultas futuras das anteriores.
    const agora = dataLocalISO();
    const futuras = consultas.filter(
        item => item.status !== 'realizada' && item.data >= agora
    );
    const realizadas = consultas
        .filter(item => item.status === 'realizada' || item.data < agora)
        .reverse();

    proximas.replaceChildren();
    historico.replaceChildren();

    if (!futuras.length) {
        proximas.innerHTML =
            '<li class="consulta-vazia">Nenhuma consulta futura cadastrada.</li>';
    }

    futuras.forEach((consulta, indice) => {
        const id = escapar(consulta.id);
        consultasExibidas.set(String(consulta.id), consulta.membros);
        const especialidadeConsulta = consulta.especialidade === 'outra'
            ? consulta.especialidadePersonalizada
            : nomeEspecialidade[consulta.especialidade] ?? consulta.especialidadePersonalizada;
        const detalheMedico = [especialidadeConsulta ?? '', consulta.clinica ?? '']
            .filter(Boolean)
            .join(' · ');
        const item = document.createElement('li');

        item.innerHTML = `<article class="card cartao-consulta${indice === 0 ? ' cartao-consulta--destaque' : ''}" data-consulta-id="${id}">
            <h3 class="cartao-consulta__veterinario">${escapar(consulta.medico)}${todosPetsSelecionados ? " · " + escapar(consulta.nomesPets.join(", ")) : ""}</h3>
            <p class="cartao-consulta__local"><i class="fa-solid fa-location-dot icone" aria-hidden="true"></i>${escapar(detalheMedico || 'Local não informado')}</p>
            <p class="cartao-consulta__data-hora"><span class="cartao-consulta__data"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i>${escapar(formatarData(consulta.data))}</span><span class="cartao-consulta__horario"><i class="fa-regular fa-clock icone" aria-hidden="true"></i>${escapar(consulta.horario || '')}</span></p>
            <details class="confirmar-consulta"><summary class="confirmar-consulta__acionador">Registrar atendimento</summary><form class="confirmar-consulta__formulario" data-form-historico><div class="campo-formulario"><label for="resumo-${id}">Resumo da consulta</label><textarea id="resumo-${id}" name="resumo" placeholder="Diagnóstico, recomendações ou observações...">${escapar(consulta.resumo ?? '')}</textarea></div><button type="submit" class="botao-principal">Salvar no Histórico</button></form></details>
        </article>`;
        proximas.append(item);
    });

    if (!realizadas.length) {
        historico.innerHTML =
            '<li class="consulta-vazia">O histórico aparecerá aqui após os atendimentos.</li>';
    }

    realizadas.forEach(consulta => {
        const item = document.createElement('li');
        item.innerHTML = `<article class="linha-tempo-medica__item"><i class="fa-solid fa-stethoscope icone" aria-hidden="true"></i><div class="linha-tempo-medica__conteudo"><h3 class="linha-tempo-medica__titulo">${escapar(consulta.medico)}${todosPetsSelecionados ? " · " + escapar(consulta.nomesPets.join(", ")) : ""}${consulta.status === 'realizada' ? '' : ' (não registrada como realizada)'}</h3><p class="linha-tempo-medica__data">${escapar(formatarData(consulta.data))}</p><p class="linha-tempo-medica__descricao">${escapar(consulta.resumo || nomeEspecialidade[consulta.especialidade] || consulta.especialidadePersonalizada || 'Sem observações registradas.')}</p></div></article>`;
        historico.append(item);
    });
}

// Atualiza a página de cadastro de consulta de acordo com o pet selecionado.
function atualizarFormulario() {
    const botao = formulario.querySelector(
        '.formulario-adicionar-consulta__enviar'
    );
    const aviso = document.getElementById('aviso-integracao');

    // Impede o envio se ainda não houver um pet selecionado.
    botao.disabled = salvando || !petsAlvo.length;

    if (!petsAlvo.length) {
        aviso.textContent = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de agendar uma consulta.';
        aviso.hidden = false;
        aviso.dataset.estado = pets.length ? 'informativo' : 'erro';

        informar(
            pets.length
                ? 'Escolha o pet para agendar atendimento.'
                : 'Cadastre um pet para continuar.',
            !pets.length
        );
    } else {
        aviso.textContent = petsAlvo.length > 1
            ? `A consulta será salva para ${petsAlvo.length} pets na sua conta.`
            : 'Os dados serão salvos na sua conta.';
        aviso.hidden = false;
        aviso.dataset.estado = 'informativo';
        informar('');
    }

    prepararLinkCadastro();
}

// Configura validações e comportamento do formulário de nova consulta.
function configurarFormulario() {
    const especialidade = formulario.elements.area_atuacao;
    const outra = formulario.elements.area_atuacao_outra;
    const campoOutra = outra.closest('.campo-formulario');
    const botao = formulario.querySelector(
        '.formulario-adicionar-consulta__enviar'
    );
    const aviso = document.getElementById('aviso-integracao');
    const data = formulario.elements.data_consulta;

    // Datas anteriores a hoje podem ser registradas como consultas já ocorridas.
    data.removeAttribute('min');

    // O campo de especialidade personalizada começa oculto.
    campoOutra.hidden = true;

    // Marca os campos necessários como obrigatórios.
    especialidade.required = true;
    formulario.elements.nome_medico.required = true;
    formulario.elements.clinica.required = true;
    data.required = true;
    formulario.elements.horario_consulta.required = true;
    outra.required = false;

    formulario.addEventListener('input', event => {
        if (event.target.matches('input[type="text"]')) event.target.setCustomValidity('');
    });

    // Mostra o campo de especialidade personalizada
    // somente quando a opção "outra" for selecionada.
    especialidade.addEventListener('change', () => {
        const mostrar = especialidade.value === 'outra';
        campoOutra.hidden = !mostrar;
        outra.required = mostrar;
        outra.setCustomValidity('');

        // Limpa o campo quando deixa de ser necessário.
        if (!mostrar) outra.value = '';
    });

    // Trata o envio do formulário de cadastro.
    formulario.addEventListener('submit', async event => {
        event.preventDefault();

        // Não cadastra se nenhum pet estiver selecionado.
        if (salvando || !petsAlvo.length) return;

        // Confirma que campos de texto obrigatórios não estejam vazios
        // depois de remover os espaços das pontas.
        const camposTexto = [
            formulario.elements.nome_medico,
            formulario.elements.clinica
        ];

        // A especialidade personalizada também é obrigatória
        // quando a opção "outra" está selecionada.
        if (especialidade.value === 'outra') camposTexto.push(outra);

        camposTexto.forEach(campo =>
            campo.setCustomValidity(
                campo.value.trim() ? '' : 'Preencha este campo.'
            )
        );

        // Pede ao navegador para mostrar erros dos campos inválidos.
        if (!formulario.reportValidity()) return;

        // Desabilita o botão durante o salvamento para evitar envios repetidos.
        salvando = true;
        botao.disabled = true;

        const especialidadeValor = especialidade.value;

        // A API valida o agendamento e grava um registro por pet.
        const dadosConsulta = {
            petIds: petsAlvo.map(pet => pet.id),
            medico: formulario.elements.nome_medico.value.trim(),
            especialidade: especialidadeValor,
            especialidadePersonalizada:
                especialidadeValor === 'outra' ? outra.value.trim() : '',
            clinica: formulario.elements.clinica.value.trim(),
            data: data.value,
            horario: formulario.elements.horario_consulta.value
        };

        try {
            // Captura o destino antes do evento de atualização recarregar o seletor.
            const [petDestinoId] = dadosConsulta.petIds;
            const quantidadePets = dadosConsulta.petIds.length;
            const { consultas, criados } = await cadastrarConsultaApi(dadosConsulta);
            definirConsultasDoBanco(consultas, criados);
            location.href = quantidadePets > 1
                ? "consultas-exames.html?todos=1"
                : "consultas-exames.html?petId=" + encodeURIComponent(petDestinoId);
        } catch (erro) {
            // Se houver falha, mostra o erro e reabilita o botão.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a consulta.';
            aviso.dataset.estado = 'erro';
            salvando = false;
            botao.disabled = !petsAlvo.length;
        }
    });
}

// Quando a pessoa muda a opção do seletor, seleciona o pet correspondente.
seletor.addEventListener('change', () => {
    if (paginaLista && seletor.value === "__todos__") {
        petAtual = null;
        todosPetsSelecionados = true;
        atualizarUrl(null);
        renderizarLista();
    } else if (paginaLista) {
        selecionarPet(pets.find(pet => pet.id === seletor.value) ?? null);
    } else {
        petsAlvo = selecaoMultipla.selecionados(pets);
        petAtual = petsAlvo.length === 1 ? petsAlvo[0] : null;
        atualizarUrl(petAtual?.id);
        atualizarFormulario();
    }
});

// Configura interações específicas da página de listagem.
if (paginaLista) {
    // Remove formulários que eventualmente estejam no HTML inicial.
    // Eles serão criados novamente junto com cada cartão de consulta.
    mainPainel
        .querySelectorAll('.confirmar-consulta__formulario')
        .forEach(form => form.remove());

    // Trata o formulário que registra uma consulta no histórico.
    mainPainel.addEventListener('submit', async event => {
        const form = event.target.closest('[data-form-historico]');

        // Ignora envios que não sejam de um formulário de histórico.
        if (!form) return;

        event.preventDefault();

        const cartao = form.closest('[data-consulta-id]');
        const grupo = consultasExibidas.get(cartao?.dataset.consultaId);
        const botao = form.querySelector('[type="submit"]');
        if (!grupo?.length || botao.disabled) return;

        botao.disabled = true;
        try {
            const ids = grupo.map(({ registro }) => registro.id);
            const consultas = await registrarConsultasRealizadasApi(ids, form.elements.resumo.value.trim());
            definirConsultasDoBanco(consultas);
        } catch (erro) {
            informar(
                erro.message || 'Não foi possível salvar o histórico da consulta.',
                true
            );
        } finally {
            botao.disabled = false;
        }
    });
} else {
    // Na página de cadastro, configura os campos e o envio do formulário.
    configurarFormulario();
}

// Carrega os pets. Se ocorrer um erro, desabilita o seletor e mostra aviso.
try {
    carregarPets();
    if (paginaLista) document.getElementById('btn-add-section').inert = false;
} catch (erro) {
    seletor.disabled = true;
    if (formulario) formulario.querySelector('[type="submit"]').disabled = true;
    informar(erro.message || 'Não foi possível carregar os pets salvos.', true);
}

// Quando outra parte da aplicação avisa que os pets foram atualizados,
// recarrega a lista para refletir as mudanças.
window.addEventListener('keeperhub:pets-atualizados', () => {
    try {
        carregarPets();
    } catch {
        informar('Não foi possível carregar os pets salvos.', true);
    }
});
