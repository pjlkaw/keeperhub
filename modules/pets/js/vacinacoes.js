// Cadastro, cronograma e histórico local das vacinas dos pets.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { atualizarPet, listarPets } from './armazenamento.js';

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

    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');

    history.replaceState(null, '', url.pathname + url.search + url.hash);
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
    document.querySelector('.section-header-section')
        ?.insertAdjacentElement('afterend', section);

    return {
        select: section.querySelector('select'),
        status: section.querySelector('p')
    };
}

// Cria o seletor e guarda referências aos seus elementos.
const { select: seletorPet, status } = criarSeletor();

// Exibe uma mensagem de sucesso ou de erro na área de status.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Retorna as vacinas do pet atual.
// Se o valor salvo não for uma lista, retorna uma lista vazia.
function vacinasDoPet() {
    return Array.isArray(petAtual?.vacinas)
        ? petAtual.vacinas.filter(
            item => item && typeof item === 'object'
        )
        : [];
}

// Salva a lista de vacinas e atualiza o pet guardado em memória.
function persistir(vacinas) {
    const atualizado = atualizarPet(petAtual.id, { vacinas });

    if (!atualizado) {
        throw new Error('Não foi possível localizar esse pet.');
    }

    petAtual = atualizado;

    // Guarda o ID do pet no painel, quando esse elemento existe.
    main?.setAttribute('data-pet-id', petAtual.id);
}

// Carrega os pets do armazenamento e preenche o seletor.
function carregarPets() {
    pets = listarPets();
    seletorPet.replaceChildren();

    // Adiciona a opção inicial do seletor.
    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletorPet.append(inicial);

    // Adiciona uma opção para cada pet cadastrado.
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

    // Se a URL não indicar um pet e existir apenas um, seleciona esse pet.
    selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
}

// Seleciona um pet, atualiza a URL e atualiza a tela atual.
function selecionarPet(pet) {
    petAtual = pet;
    seletorPet.value = pet?.id ?? '';
    atualizarUrl(pet?.id);
    main?.setAttribute('data-pet-id', pet?.id ?? '');

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
}

// Para cada nome de vacina, encontra o registro de aplicação mais recente.
// Isso permite exibir a próxima dose correspondente à aplicação mais atual.
function registrosMaisRecentes() {
    const porNome = new Map();

    for (const vacina of vacinasDoPet()) {
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
            String(vacina.dataAplicacao) > String(anterior.dataAplicacao)
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

    // Acrescenta o ID do pet aos links para cadastrar uma vacina.
    document.querySelectorAll('a[href="adicionar-vacina.html"]')
        .forEach(link => {
            link.href = petAtual
                ? `adicionar-vacina.html?petId=${encodeURIComponent(petAtual.id)}`
                : 'adicionar-vacina.html';
        });

    // Limpa as listas antes de renderizá-las novamente.
    listaDestaques.replaceChildren();
    listaCronograma.replaceChildren();
    listaHistorico.replaceChildren();

    // Se não houver pet selecionado, mostra uma orientação em cada lista.
    if (!petAtual) {
        const mensagem = pets.length
            ? 'Escolha um pet para consultar as vacinas.'
            : 'Cadastre um pet para acompanhar as vacinações.';

        listaDestaques.append(listaVazia(mensagem));
        listaCronograma.append(listaVazia(mensagem));
        listaHistorico.append(listaVazia(mensagem));
        informar(mensagem, !pets.length);
        return;
    }

    informar('');

    const hoje = dataLocalISO();

    // Pega o registro mais recente de cada vacina e ordena pela próxima dose.
    const maisRecentes = registrosMaisRecentes()
        .sort((a, b) =>
            String(a.proximaDose ?? a.dataAplicacao)
                .localeCompare(String(b.proximaDose ?? b.dataAplicacao))
        );

    // Registros com próxima dose aparecem nos destaques.
    const pendentes = maisRecentes.filter(item => item.proximaDose);

    // Todas as aplicações são ordenadas da mais recente para a mais antiga
    // para compor o histórico.
    const aplicadas = vacinasDoPet()
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
        const dias = Math.ceil(
            (
                new Date(vacina.proximaDose + 'T12:00:00') -
                new Date(hoje + 'T12:00:00')
            ) / 86400000
        );

        const vencida = dias < 0;

        // Calcula o progresso entre a data da aplicação e a próxima dose.
        const duracao =
            new Date(vacina.proximaDose + 'T12:00:00') -
            new Date(vacina.dataAplicacao + 'T12:00:00');

        const decorrido =
            new Date(hoje + 'T12:00:00') -
            new Date(vacina.dataAplicacao + 'T12:00:00');

        // Limita o progresso entre 0% e 100%.
        const progresso = duracao <= 0
            ? 100
            : Math.max(0, Math.min(100, Math.round((decorrido / duracao) * 100)));

        // Usa o nome personalizado ou o nome amigável da vacina.
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : nomesVacina[vacina.nome] ?? vacina.nome;

        // Define o rótulo da frequência e a mensagem de prazo.
        const frequencia = vacina.frequencia === 'reforco_anual'
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
        li.innerHTML = `<article class="card cartao-destaque-vacina${indice === 0 ? ' cartao-destaque-vacina--destaque' : ''}"><p class="cartao-destaque-vacina__rotulo">${escapar(frequencia)}</p><h3 class="cartao-destaque-vacina__nome">${escapar(nome)}</h3><i class="fa-solid fa-syringe icone" aria-hidden="true"></i><p class="cartao-destaque-vacina__data"><i class="fa-regular fa-calendar-days icone" aria-hidden="true"></i><time datetime="${escapar(vacina.proximaDose)}">${escapar(formatarData(vacina.proximaDose))}</time></p><div class="barra-progresso" aria-hidden="true"><div class="barra-progresso__preenchimento" style="width:${progresso}%"></div></div><p class="cartao-destaque-vacina__contagem-regressiva">${escapar(textoDias)}</p></article>`;

        listaDestaques.append(li);
    }

    // Cria o cronograma a partir dos registros mais recentes.
    const cronograma = maisRecentes.slice().sort((a, b) =>
        String(a.proximaDose ?? a.dataAplicacao)
            .localeCompare(String(b.proximaDose ?? b.dataAplicacao))
    );

    if (!cronograma.length) {
        listaCronograma.append(listaVazia('Nenhuma vacina registrada.'));
    }

    for (const vacina of cronograma) {
        const nome = vacina.nome === 'outra'
            ? vacina.nomePersonalizado
            : nomesVacina[vacina.nome] ?? vacina.nome;

        const temProxima = Boolean(vacina.proximaDose);
        const atrasada = temProxima && vacina.proximaDose < hoje;

        // Usa a próxima dose como data principal quando ela existe;
        // caso contrário, usa a data em que a vacina foi aplicada.
        const data = temProxima ? vacina.proximaDose : vacina.dataAplicacao;
        const detalhe = temProxima
            ? `Próxima dose prevista para ${formatarData(data)}`
            : `Aplicada em ${formatarData(data)}`;

        // Define o texto, a classe e o ícone de acordo com a situação da vacina.
        const statusTexto = atrasada
            ? 'Atrasada'
            : temProxima
                ? 'Agendada'
                : 'Aplicada';

        const classeStatus = atrasada
            ? 'atrasada'
            : temProxima
                ? 'agendada'
                : 'aplicada';

        const icone = atrasada
            ? 'fa-triangle-exclamation'
            : temProxima
                ? 'fa-syringe'
                : 'fa-circle-check';

        const li = document.createElement('li');

        // Cria a linha do cronograma com dados variáveis escapados.
        li.innerHTML = `<article class="item-vacina item-vacina--${classeStatus}"><i class="fa-solid ${icone} icone" aria-hidden="true"></i><div class="item-vacina__informacoes"><h3 class="item-vacina__nome">${escapar(nome)}</h3><p class="item-vacina__detalhe">${escapar(detalhe)}${vacina.observacao ? ` · ${escapar(vacina.observacao)}` : ''}</p></div><span class="etiqueta-status etiqueta-status--${classeStatus}">${statusTexto}</span></article>`;

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

        // Mostra o nome, a data de aplicação e, se houver, a observação.
        li.innerHTML = `<article class="card item-vacina item-vacina--registro"><i class="fa-solid fa-clock-rotate-left icone" aria-hidden="true"></i><div class="item-vacina__informacoes"><h3 class="item-vacina__nome">${escapar(nome)}</h3><p class="item-vacina__detalhe">Aplicada em <time datetime="${escapar(vacina.dataAplicacao)}">${escapar(formatarData(vacina.dataAplicacao, { day: '2-digit', month: 'short', year: 'numeric' }))}</time>${vacina.observacao ? ` · ${escapar(vacina.observacao)}` : ''}</p></div></article>`;

        listaHistorico.append(li);
    }
}

// Atualiza a mensagem e o botão na página de cadastro.
function atualizarFormulario() {
    const botao = form.querySelector('.formulario-adicionar-vacina__enviar');
    const aviso = document.getElementById('aviso-integracao-vacina');

    // Não permite enviar o formulário sem selecionar um pet.
    botao.disabled = !petAtual;

    if (!petAtual) {
        const mensagem = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de registrar uma vacina.';

        aviso.textContent = mensagem;
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = 'O registro será salvo neste navegador.';
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

    // Exige a data da aplicação e impede escolher uma data futura.
    dataAplicacao.required = true;
    dataAplicacao.max = dataLocalISO();

    // Os campos condicionais começam ocultos.
    campoOutra.hidden = true;
    campoProxima.hidden = true;

    // Quando a próxima dose muda, apaga uma mensagem de validação anterior.
    form.elements.prox_dose.addEventListener('input', () =>
        form.elements.prox_dose.setCustomValidity('')
    );

    // Ajusta os campos visíveis conforme as opções escolhidas.
    form.addEventListener('change', event => {
        if (event.target.name === 'nome_vacina') {
            const mostrar = event.target.value === 'outra';
            campoOutra.hidden = !mostrar;
            vacinaOutra.required = mostrar;

            // Limpa o nome personalizado se "outra" deixar de estar selecionada.
            if (!mostrar) vacinaOutra.value = '';
        }

        if (event.target.name === 'frequencia') {
            const fracionada =
                event.target.value === 'doses_fracionadas';

            // A data da próxima dose só é exigida para doses fracionadas.
            campoProxima.hidden = !fracionada;
            form.elements.prox_dose.required = fracionada;

            if (!fracionada) form.elements.prox_dose.value = '';
        }
    });

    // Valida os dados e salva a nova vacina quando o formulário é enviado.
    form.addEventListener('submit', event => {
        event.preventDefault();

        // Sem pet selecionado, não há onde salvar o registro.
        if (!petAtual) return;

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

        const aplicadaEm = dataAplicacao.value;
        const fracionada = frequencia.value === 'doses_fracionadas';

        // Reforços anuais recebem automaticamente a data de um ano depois.
        // Para doses fracionadas, usa a data preenchida no campo.
        // Nos demais casos, deixa a próxima dose vazia.
        const proximaDose = frequencia.value === 'reforco_anual'
            ? adicionarAno(aplicadaEm)
            : fracionada
                ? form.elements.prox_dose.value
                : '';

        // A próxima dose de uma série fracionada não pode ser anterior
        // à data da aplicação.
        if (fracionada && proximaDose < aplicadaEm) {
            form.elements.prox_dose.setCustomValidity(
                'A próxima dose deve ser na data de aplicação ou depois.'
            );
            form.elements.prox_dose.reportValidity();
            return;
        }

        form.elements.prox_dose.setCustomValidity('');

        // Desabilita o botão para evitar envios repetidos.
        botao.disabled = true;

        // Reúne os dados da nova vacina em um objeto.
        const novaVacina = {
            id: crypto.randomUUID(),
            nome: escolhida.value,
            nomePersonalizado: escolhida.value === 'outra'
                ? vacinaOutra.value.trim()
                : '',
            dataAplicacao: aplicadaEm,
            frequencia: frequencia.value,
            proximaDose,
            observacao: form.elements.observacao_vacina.value.trim(),
            criadaEm: new Date().toISOString()
        };

        try {
            // Acrescenta o novo registro às vacinas já salvas para o pet.
            persistir([...vacinasDoPet(), novaVacina]);

            // Avisa que salvou e abre o cronograma do pet.
            aviso.textContent = 'Vacina salva. Abrindo o cronograma…';
            location.href =
                `vacinacoes.html?petId=${encodeURIComponent(petAtual.id)}`;
        } catch (erro) {
            // Se o salvamento falhar, mostra o erro e reabilita o botão.
            aviso.textContent =
                erro.message || 'Não foi possível salvar a vacina.';
            botao.disabled = false;
        }
    });
}

// Quando a pessoa muda o pet selecionado, atualiza a página.
seletorPet.addEventListener('change', () => {
    selecionarPet(
        pets.find(pet => pet.id === seletorPet.value) ?? null
    );
});

// Configura o formulário somente na página de cadastro.
if (!paginaLista) {
    configurarFormulario();
}

// Carrega os pets ao iniciar.
// Se houver erro, desabilita o seletor e mostra uma mensagem.
try {
    carregarPets();
} catch {
    seletorPet.disabled = true;
    informar('Não foi possível carregar os pets salvos.', true);
}

// Recarrega a lista quando outra parte da aplicação atualizar os pets.
window.addEventListener('keeperhub:pets-atualizados', () => {
    try {
        carregarPets();
    } catch {
        informar('Não foi possível carregar os pets salvos.', true);
    }
});