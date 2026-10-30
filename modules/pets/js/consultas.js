// Controla o cadastro, a listagem e o histórico local das consultas dos pets.
import { atualizarPet, listarPets } from './armazenamento.js';

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

// Mostra uma mensagem relacionada à seleção do pet.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Busca os pets salvos e prepara o seletor para escolher um deles.
function carregarPets() {
    pets = listarPets();
    seletor.replaceChildren();

    // Adiciona uma opção inicial que orienta a pessoa.
    const opcao = document.createElement('option');
    opcao.value = '';
    opcao.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletor.append(opcao);

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

    // Seleciona o pet da URL ou, se só houver um, seleciona esse pet.
    selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));

    // Mostra uma orientação adequada quando ainda não há seleção.
    if (!petQuery && pets.length > 1) {
        informar('Escolha o pet para consultar ou agendar atendimento.');
    }

    if (!pets.length) {
        informar('Cadastre um pet antes de registrar consultas.', true);
    }
}

// Define o pet atual, atualiza a URL e atualiza a página correspondente.
function selecionarPet(pet) {
    petAtual = pet;
    seletor.value = pet?.id ?? '';
    atualizarUrl(pet?.id);

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
}

// Retorna as consultas do pet atual.
// Ignora o valor se ele não for uma lista e remove itens que não sejam objetos.
function consultasDoPet() {
    return Array.isArray(petAtual?.consultas)
        ? petAtual.consultas.filter(
            item => item && typeof item === 'object'
        )
        : [];
}

// Salva a lista de consultas atualizada e atualiza o pet em memória.
function persistirConsultas(consultas) {
    const atualizado = atualizarPet(petAtual.id, { consultas });

    if (!atualizado) {
        throw new Error('Não foi possível localizar esse pet.');
    }

    petAtual = atualizado;
}

// Acrescenta o pet selecionado aos links que levam ao cadastro de consulta.
function prepararLinkCadastro() {
    document
        .querySelectorAll('a[href="cadastrar-consulta.html"]')
        .forEach(link => {
            link.href = petAtual
                ? `cadastrar-consulta.html?petId=${encodeURIComponent(petAtual.id)}`
                : 'cadastrar-consulta.html';
        });
}

// Desenha as próximas consultas e o histórico na página de listagem.
function renderizarLista() {
    const secoes = mainPainel.querySelectorAll(':scope > section');
    const proximas = secoes[0]?.querySelector('ul');
    const historico = mainPainel.querySelector('.linha-tempo-medica');

    prepararLinkCadastro();

    // Sem pet selecionado, limpa as listas e mostra uma orientação.
    if (!petAtual) {
        proximas?.replaceChildren();
        historico?.replaceChildren();
        informar(
            pets.length
                ? 'Escolha um pet para ver as consultas.'
                : 'Cadastre um pet para acompanhar consultas.',
            !pets.length
        );
        return;
    }

    informar('');

    // Usa a data local de hoje para separar consultas futuras das anteriores.
    const agora = dataLocalISO();

    // Ordena as consultas por data e horário.
    const consultas = consultasDoPet()
        .slice()
        .sort((a, b) =>
            `${a.data ?? ''} ${a.horario ?? ''}`
                .localeCompare(`${b.data ?? ''} ${b.horario ?? ''}`)
        );

    // Próximas: não realizadas e com data de hoje ou posterior.
    const futuras = consultas.filter(
        item => item.status !== 'realizada' && item.data >= agora
    );

    // Histórico: realizadas ou com data anterior à data de hoje.
    // reverse() mostra as mais recentes primeiro.
    const realizadas = consultas
        .filter(item => item.status === 'realizada' || item.data < agora)
        .reverse();

    proximas.replaceChildren();
    historico.replaceChildren();

    // Se não houver consultas futuras, exibe uma mensagem na lista.
    if (!futuras.length) {
        proximas.innerHTML =
            '<li class="consulta-vazia">Nenhuma consulta futura cadastrada.</li>';
    }

    // Cria um cartão para cada consulta futura.
    futuras.forEach((consulta, indice) => {
        const id = escapar(consulta.id);

        // Usa o nome padronizado da especialidade ou o texto personalizado.
        const especialidadeConsulta =
            consulta.especialidade === 'outra'
                ? consulta.especialidadePersonalizada
                : nomeEspecialidade[consulta.especialidade] ??
                    consulta.especialidadePersonalizada;

        // Combina a especialidade e a clínica, omitindo os valores vazios.
        const detalheMedico = [
            especialidadeConsulta ?? '',
            consulta.clinica ?? ''
        ].filter(Boolean).join(' · ');

        const item = document.createElement('li');

        // Monta o cartão. Os dados variáveis passam por escapar()
        // antes de serem inseridos no HTML.
        item.innerHTML = `<article class="card cartao-consulta${indice === 0 ? ' cartao-consulta--destaque' : ''}" data-consulta-id="${id}">
            <h3 class="cartao-consulta__veterinario">${escapar(consulta.medico)}</h3>
            <p class="cartao-consulta__local"><i class="fa-solid fa-location-dot icone" aria-hidden="true"></i>${escapar(detalheMedico || 'Local não informado')}</p>
            <p class="cartao-consulta__data-hora"><span class="cartao-consulta__data"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i>${escapar(formatarData(consulta.data))}</span><span class="cartao-consulta__horario"><i class="fa-regular fa-clock icone" aria-hidden="true"></i>${escapar(consulta.horario || '')}</span></p>
            <div class="cartao-consulta__lembrete"><label for="lembrete-${id}">Lembrar</label><input type="checkbox" id="lembrete-${id}" data-lembrete ${consulta.lembrar ? 'checked' : ''}></div>
            <details class="confirmar-consulta"><summary class="confirmar-consulta__acionador">Registrar atendimento</summary><form class="confirmar-consulta__formulario" data-form-historico><div class="campo-formulario"><label for="resumo-${id}">Resumo da consulta</label><textarea id="resumo-${id}" name="resumo" placeholder="Diagnóstico, recomendações ou observações...">${escapar(consulta.resumo ?? '')}</textarea></div><button type="submit" class="botao-principal">Salvar no Histórico</button></form></details>
        </article>`;

        proximas.append(item);
    });

    // Se não houver consultas anteriores ou realizadas, mostra uma mensagem.
    if (!realizadas.length) {
        historico.innerHTML =
            '<li class="consulta-vazia">O histórico aparecerá aqui após os atendimentos.</li>';
    }

    // Cria uma entrada de histórico para cada consulta realizada ou passada.
    realizadas.forEach(consulta => {
        const item = document.createElement('li');

        // Os dados variáveis são escapados antes de montar o HTML.
        item.innerHTML = `<article class="linha-tempo-medica__item"><i class="fa-solid fa-stethoscope icone" aria-hidden="true"></i><div class="linha-tempo-medica__conteudo"><h3 class="linha-tempo-medica__titulo">${escapar(consulta.medico)}${consulta.status === 'realizada' ? '' : ' (não registrada como realizada)'}</h3><p class="linha-tempo-medica__data">${escapar(formatarData(consulta.data))}</p><p class="linha-tempo-medica__descricao">${escapar(consulta.resumo || nomeEspecialidade[consulta.especialidade] || consulta.especialidadePersonalizada || 'Sem observações registradas.')}</p></div></article>`;

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
    botao.disabled = !petAtual;

    if (!petAtual) {
        aviso.textContent = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de agendar uma consulta.';
        aviso.hidden = false;

        informar(
            pets.length
                ? 'Escolha o pet para agendar atendimento.'
                : 'Cadastre um pet para continuar.',
            !pets.length
        );
    } else {
        aviso.textContent = 'Os dados serão salvos neste navegador.';
        aviso.hidden = false;
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

    // Impede selecionar uma data anterior à data local de hoje.
    data.min = dataLocalISO();

    // O campo de especialidade personalizada começa oculto.
    campoOutra.hidden = true;

    // Marca os campos necessários como obrigatórios.
    especialidade.required = true;
    formulario.elements.nome_medico.required = true;
    formulario.elements.clinica.required = true;
    data.required = true;
    formulario.elements.horario_consulta.required = true;
    outra.required = false;

    // Mostra o campo de especialidade personalizada
    // somente quando a opção "outra" for selecionada.
    especialidade.addEventListener('change', () => {
        const mostrar = especialidade.value === 'outra';
        campoOutra.hidden = !mostrar;
        outra.required = mostrar;

        // Limpa o campo quando deixa de ser necessário.
        if (!mostrar) outra.value = '';
    });

    // Trata o envio do formulário de cadastro.
    formulario.addEventListener('submit', event => {
        event.preventDefault();

        // Não cadastra se nenhum pet estiver selecionado.
        if (!petAtual) return;

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
        botao.disabled = true;

        const especialidadeValor = especialidade.value;

        // Monta o objeto da consulta com os dados preenchidos.
        const novaConsulta = {
            id: crypto.randomUUID(),
            medico: formulario.elements.nome_medico.value.trim(),
            especialidade: especialidadeValor,
            especialidadePersonalizada:
                especialidadeValor === 'outra' ? outra.value.trim() : '',
            clinica: formulario.elements.clinica.value.trim(),
            data: data.value,
            horario: formulario.elements.horario_consulta.value,
            lembrar: formulario.elements.lembrar_consulta.checked,
            status: 'agendada',
            resumo: '',
            criadaEm: new Date().toISOString()
        };

        try {
            // Acrescenta a consulta às consultas existentes do pet.
            persistirConsultas([...consultasDoPet(), novaConsulta]);

            // Informa que o cadastro foi salvo e abre a página de consultas.
            aviso.textContent = 'Consulta salva. Abrindo a agenda…';
            location.href =
                `consultas-exames.html?petId=${encodeURIComponent(petAtual.id)}`;
        } catch (erro) {
            // Se houver falha, mostra o erro e reabilita o botão.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a consulta.';
            botao.disabled = false;
        }
    });
}

// Quando a pessoa muda a opção do seletor, seleciona o pet correspondente.
seletor.addEventListener('change', () => {
    const pet = pets.find(item => item.id === seletor.value) ?? null;
    selecionarPet(pet);
});

// Configura interações específicas da página de listagem.
if (paginaLista) {
    // Remove formulários que eventualmente estejam no HTML inicial.
    // Eles serão criados novamente junto com cada cartão de consulta.
    mainPainel
        .querySelectorAll('.confirmar-consulta__formulario')
        .forEach(form => form.remove());

    // Salva alterações na opção "Lembrar" de uma consulta.
    mainPainel.addEventListener('change', event => {
        const cartao = event.target.closest('[data-consulta-id]');

        // Ignora mudanças que não sejam caixas de lembrete dentro de cartões.
        if (
            !cartao ||
            !event.target.matches('[data-lembrete]') ||
            !petAtual
        ) return;

        try {
            // Atualiza o campo lembrar da consulta que mudou.
            const consultas = consultasDoPet().map(item =>
                item.id === cartao.dataset.consultaId
                    ? { ...item, lembrar: event.target.checked }
                    : item
            );

            persistirConsultas(consultas);
        } catch {
            // Se não for possível salvar, desfaz visualmente a mudança.
            event.target.checked = !event.target.checked;
            informar('Não foi possível atualizar o lembrete.', true);
        }
    });

    // Trata o formulário que registra uma consulta no histórico.
    mainPainel.addEventListener('submit', event => {
        const form = event.target.closest('[data-form-historico]');

        // Ignora envios que não sejam de um formulário de histórico.
        if (!form || !petAtual) return;

        event.preventDefault();

        const cartao = form.closest('[data-consulta-id]');

        try {
            // Marca a consulta como realizada e salva o resumo e a data do registro.
            const consultas = consultasDoPet().map(item =>
                item.id === cartao.dataset.consultaId
                    ? {
                        ...item,
                        status: 'realizada',
                        resumo: form.elements.resumo.value.trim(),
                        realizadaEm: new Date().toISOString()
                    }
                    : item
            );

            persistirConsultas(consultas);

            // Atualiza a tela para mover a consulta ao histórico.
            renderizarLista();
        } catch {
            informar(
                'Não foi possível salvar o histórico da consulta.',
                true
            );
        }
    });
} else {
    // Na página de cadastro, configura os campos e o envio do formulário.
    configurarFormulario();
}

// Carrega os pets. Se ocorrer um erro, desabilita o seletor e mostra aviso.
try {
    carregarPets();
} catch {
    seletor.disabled = true;
    informar('Não foi possível carregar os pets salvos.', true);
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