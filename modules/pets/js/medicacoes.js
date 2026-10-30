// Cadastro, busca e organização local das medicações dos pets.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { atualizarPet, listarPets } from './armazenamento.js';

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
    document.querySelector('.section-header-section')
        ?.insertAdjacentElement('afterend', secao);

    return {
        select: secao.querySelector('select'),
        status: secao.querySelector('p')
    };
}

// Cria o seletor e guarda referências aos elementos que serão usados.
const { select: seletorPet, status } = criarSeletor();

// Exibe uma mensagem de sucesso ou de erro.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Retorna as medicações do pet atual.
// Se o valor salvo não for uma lista, retorna uma lista vazia.
function medicacoesDoPet() {
    return Array.isArray(petAtual?.medicacoes)
        ? petAtual.medicacoes.filter(
            item => item && typeof item === 'object'
        )
        : [];
}

// Salva a lista de medicações e atualiza os dados do pet em memória.
function persistir(medicacoes) {
    const atualizado = atualizarPet(petAtual.id, { medicacoes });

    if (!atualizado) {
        throw new Error('Não foi possível localizar esse pet.');
    }

    petAtual = atualizado;
}

// Atualiza os links de cadastro e as abas de navegação
// para manter o pet selecionado.
function atualizarLinks() {
    // Acrescenta o ID do pet aos links para cadastrar medicação.
    document.querySelectorAll('a[href="cadastrar-medicacao.html"]')
        .forEach(link => {
            link.href = petAtual
                ? `cadastrar-medicacao.html?petId=${encodeURIComponent(petAtual.id)}`
                : 'cadastrar-medicacao.html';
        });

    // Acrescenta o ID do pet às abas da página.
    document.querySelectorAll('.abas-pet a').forEach(link => {
        const destino = new URL(link.href, location.href);

        if (petAtual) destino.searchParams.set('petId', petAtual.id);

        // Mantém apenas o nome do arquivo e os parâmetros da URL.
        link.href = destino.pathname.split('/').pop() + destino.search;
    });
}

// Lê os pets salvos e preenche o seletor.
function carregarPets() {
    pets = listarPets();
    seletorPet.replaceChildren();

    // Cria a opção inicial do seletor.
    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet primeiro';
    seletorPet.append(inicial);

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

    // Se não houver ID na URL e existir apenas um pet, seleciona-o.
    selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
}

// Define qual pet está selecionado e atualiza a página correspondente.
function selecionarPet(pet) {
    petAtual = pet;
    seletorPet.value = pet?.id ?? '';
    atualizarUrl(pet?.id);
    atualizarLinks();

    if (paginaLista) renderizarLista();
    else atualizarFormulario();
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
        medicacao.observacao
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
    li.innerHTML = `<article class="card cartao-medicacao cartao-medicacao--${tipo}${historico ? ' cartao-medicacao--aplicada' : ''}${baixo ? ' cartao-medicacao--estoque-baixo' : ''}"><i class="fa-solid ${icone} icone" aria-hidden="true"></i><div class="cartao-medicacao__informacoes"><h3 class="cartao-medicacao__nome">${escapar(medicacao.nome)}</h3><p class="cartao-medicacao__dosagem">${escapar(detalhe || 'Dosagem não informada')}</p>${detalhesEstoque}${termino}${medicacao.observacao ? `<p class="cartao-medicacao__observacao">${escapar(medicacao.observacao)}</p>` : ''}</div><span class="etiqueta-status etiqueta-status--${classeStatus}">${status}</span></article>`;

    return li;
}

// Atualiza as categorias e o histórico de medicações na página.
function renderizarLista() {
    const grupos = [...main.querySelectorAll('.grupo-medicacoes')];
    const listas = grupos.map(grupo => grupo.querySelector('ul'));

    // Aplica a busca e o filtro atual à lista do pet.
    const registros = medicacoesDoPet()
        .filter(correspondeBusca)
        .filter(correspondeFiltro);

    const tipos = ['continuo', 'temporario', 'eventual'];

    // Preenche os grupos de uso contínuo, temporário e eventual.
    for (let indice = 0; indice < tipos.length; indice++) {
        const tipo = tipos[indice];

        // Não inclui no grupo ativo os tratamentos que já terminaram.
        const itens = registros.filter(
            item => item.tipoUso === tipo && !estaNoHistorico(item)
        );

        listas[indice].replaceChildren();

        if (!itens.length) {
            // Mostra uma mensagem quando a categoria não tem itens.
            const vazio = document.createElement('li');
            vazio.className = 'medicacao-vazia';
            vazio.textContent = petAtual
                ? 'Nenhuma medicação nesta categoria.'
                : 'Selecione um pet para ver os registros.';
            listas[indice].append(vazio);
        } else {
            // Cria um cartão para cada medicação encontrada.
            itens.forEach(item => listas[indice].append(criarCartao(item)));
        }
    }

    // Seleciona os tratamentos concluídos e ordena pelos mais recentes.
    const historico = registros
        .filter(estaNoHistorico)
        .sort((a, b) =>
            String(b.dataFim).localeCompare(String(a.dataFim))
        );

    listas[3].replaceChildren();

    if (!historico.length) {
        const vazio = document.createElement('li');
        vazio.className = 'medicacao-vazia';
        vazio.textContent = petAtual
            ? 'Nenhum tratamento concluído.'
            : 'Selecione um pet para ver o histórico.';
        listas[3].append(vazio);
    } else {
        // Cria os cartões do histórico indicando que são tratamentos concluídos.
        historico.forEach(item =>
            listas[3].append(criarCartao(item, true))
        );
    }

    // Mostra ou oculta cada grupo conforme o filtro selecionado.
    grupos.forEach((grupo, indice) => {
        const temItens = listas[indice]
            .querySelector('.cartao-medicacao');

        grupo.hidden = filtroAtual === 'historico'
            ? indice !== 3
            : filtroAtual !== 'todos' &&
                indice !== tipos.indexOf(filtroAtual) &&
                indice !== 3;

        // No filtro por categoria, oculta o histórico se estiver vazio.
        if (indice === 3 && filtroAtual !== 'historico') {
            grupo.hidden = !historico.length && filtroAtual !== 'todos';
        }

        // Marca grupos sem resultados de busca, quando há pet selecionado.
        if (!temItens && buscaAtual && petAtual) {
            grupo.dataset.semResultados = 'true';
        } else {
            delete grupo.dataset.semResultados;
        }
    });

    // Mostra uma mensagem apropriada para a seleção, busca ou filtro atual.
    if (!petAtual) {
        informar(
            pets.length
                ? 'Escolha um pet para consultar as medicações.'
                : 'Cadastre um pet para acompanhar medicações.',
            !pets.length
        );
    } else if (!registros.length && (buscaAtual || filtroAtual !== 'todos')) {
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
    botao.disabled = !petAtual;

    if (!petAtual) {
        const mensagem = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de adicionar uma medicação.';

        aviso.textContent = mensagem;
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = 'A medicação será salva neste navegador.';
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
        if (!petAtual) return;

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
            id: crypto.randomUUID(),
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
            // Acrescenta a medicação à lista existente e salva.
            persistir([...medicacoesDoPet(), medicamento]);

            // Avisa que salvou e abre a lista de medicações daquele pet.
            aviso.textContent = 'Medicação salva. Abrindo a lista…';
            location.href =
                `medicacoes.html?petId=${encodeURIComponent(petAtual.id)}`;
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
    selecionarPet(
        pets.find(pet => pet.id === seletorPet.value) ?? null
    );
});

// Configura os controles apropriados para a página atual.
if (paginaLista) montarFiltro();
else configurarFormulario();

// Carrega os pets. Se ocorrer um erro, desabilita o seletor e informa a pessoa.
try {
    carregarPets();
} catch {
    seletorPet.disabled = true;
    informar('Não foi possível carregar os pets salvos.', true);
}

// Recarrega os pets quando outra parte do sistema sinaliza uma atualização.
window.addEventListener('keeperhub:pets-atualizados', () => {
    try {
        carregarPets();
    } catch {
        informar('Não foi possível carregar os pets salvos.', true);
    }
});