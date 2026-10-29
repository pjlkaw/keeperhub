// Controla o cadastro e o resumo mensal das despesas do pet.

// Importa as funções para atualizar um pet e listar os pets salvos.
import { atualizarPet, listarPets } from './armazenamento.js';

// Busca no HTML os elementos usados pela página.
const main = document.getElementById('conteudo-principal');
const seletorPet = document.getElementById('pet-despesas');
const statusPet = document.getElementById('status-pet-despesas');
const conteudo = document.querySelector('.despesas-conteudo');
const botaoAdicionar = document.querySelector('.despesas-adicionar');
const popover = document.getElementById('nova-despesa');
const form = document.getElementById('formulario-despesa');
const statusForm = document.getElementById('mensagem-despesa');
const botaoSalvar = form.querySelector('[data-acao="salvar-despesa"]');
const campoData = document.getElementById('data-despesa');

// Lista de categorias permitidas para classificar as despesas.
const CATEGORIAS = ['alimentacao', 'saude', 'higiene', 'lazer'];

// Orçamento mensal padrão em centavos: 60000 centavos correspondem a R$ 600,00.
const ORCAMENTO_MENSAL_PADRAO = 60000;

// Guarda os pets, o pet selecionado, o mês exibido e o estado do salvamento.
let pets = [];
let petAtual = null;
let mesAtual = new Date();
let salvando = false;

// Converte uma data para o formato usado como chave mensal: AAAA-MM.
function chaveMes(data) {
    return data.getFullYear() + '-' +
        String(data.getMonth() + 1).padStart(2, '0');
}

// Formata um valor em centavos como moeda brasileira.
function formatarMoeda(centavos) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(centavos / 100);
}

// Formata uma data no formato AAAA-MM-DD para exibição, por exemplo "28 out".
function formatarData(dataISO) {
    // Acrescenta o horário para interpretar a data sem deslocamento de fuso.
    const data = new Date(dataISO + 'T00:00:00');

    // Separa o dia e o mês formatados segundo as convenções brasileiras.
    const partes = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short'
    }).formatToParts(data);

    const dia = partes.find(parte => parte.type === 'day')?.value ?? '';
    const mes = partes.find(parte => parte.type === 'month')
        ?.value.replace('.', '') ?? '';

    return dia + ' ' + mes;
}

// Exibe uma mensagem relacionada à seleção do pet.
function informarSelecao(mensagem, erro = false) {
    statusPet.hidden = !mensagem;
    statusPet.textContent = mensagem;
    statusPet.dataset.estado = erro ? 'erro' : 'sucesso';
    statusPet.setAttribute('role', erro ? 'alert' : 'status');
}

// Exibe uma mensagem relacionada ao formulário de despesas.
function informarFormulario(mensagem, erro = false) {
    statusForm.textContent = mensagem;
    statusForm.dataset.estado = erro ? 'erro' : 'sucesso';
    statusForm.setAttribute('role', erro ? 'alert' : 'status');
}

// Atualiza o parâmetro petId na URL sem recarregar a página.
function atualizarUrlPet(id) {
    const url = new URL(window.location.href);

    // Se há um ID, adiciona-o à URL; caso contrário, remove o parâmetro.
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');

    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

// Prepara a lista de pets disponíveis no seletor.
function prepararSelecao() {
    pets = listarPets();
    seletorPet.replaceChildren();

    // Cria a primeira opção do seletor. O texto depende de haver pets cadastrados.
    const opcaoInicial = document.createElement('option');
    opcaoInicial.value = '';
    opcaoInicial.textContent = pets.length
        ? 'Selecione um pet'
        : 'Cadastre um pet para acompanhar despesas';
    seletorPet.append(opcaoInicial);

    // Adiciona uma opção para cada pet.
    pets.forEach(pet => {
        const opcao = document.createElement('option');
        opcao.value = pet.id;
        opcao.textContent = pet.nome;
        seletorPet.append(opcao);
    });

    // Tenta selecionar o pet indicado na URL.
    const idDaUrl = new URLSearchParams(window.location.search).get('petId');
    const petDaUrl = pets.find(pet => pet.id === idDaUrl);

    // Se a URL não indicar um pet e só existir um, seleciona esse automaticamente.
    const petInicial = petDaUrl || (pets.length === 1 ? pets[0] : null);

    if (petInicial) {
        seletorPet.value = petInicial.id;
        selecionarPet(petInicial.id, false);
    } else {
        // Sem pet selecionado, oculta o conteúdo e desabilita o salvamento.
        petAtual = null;
        main.dataset.petId = '';
        conteudo.hidden = true;
        botaoAdicionar.hidden = true;
        botaoSalvar.disabled = true;
        seletorPet.disabled = pets.length === 0;

        // Informa por que ainda não é possível mostrar as despesas.
        if (idDaUrl && !petDaUrl) {
            informarSelecao('O pet informado não foi encontrado. Escolha outro pet.', true);
        } else if (!pets.length) {
            informarSelecao('Cadastre um pet antes de registrar despesas.', true);
        } else {
            informarSelecao('Escolha o pet para consultar ou registrar despesas.');
        }
    }
}

// Seleciona um pet e atualiza a página para mostrar suas despesas.
function selecionarPet(id, atualizarUrl = true) {
    const pet = pets.find(item => item.id === id);
    if (!pet) return;

    petAtual = pet;
    seletorPet.value = pet.id;
    seletorPet.disabled = false;
    main.dataset.petId = pet.id;
    conteudo.hidden = false;
    botaoAdicionar.hidden = false;
    botaoSalvar.disabled = false;
    informarSelecao('');

    // Atualiza a URL, a menos que a seleção esteja sendo feita no carregamento inicial.
    if (atualizarUrl) atualizarUrlPet(pet.id);

    // Define a data inicial do formulário e mostra os dados do mês selecionado.
    campoData.value = dataPadraoParaMes();
    renderizarMes();
}

// Retorna uma data padrão para o mês atualmente exibido.
function dataPadraoParaMes() {
    const hoje = new Date();

    // No mês atual, usa a data de hoje.
    if (chaveMes(hoje) === chaveMes(mesAtual)) {
        return hoje.getFullYear() + '-' +
            String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoje.getDate()).padStart(2, '0');
    }

    // Em outro mês, usa o primeiro dia daquele mês.
    return mesAtual.getFullYear() + '-' +
        String(mesAtual.getMonth() + 1).padStart(2, '0') + '-01';
}

// Retorna somente as despesas válidas do pet para o mês exibido.
function despesasDoMes() {
    if (!Array.isArray(petAtual?.despesas)) return [];

    const mes = chaveMes(mesAtual);

    return petAtual.despesas.filter(despesa =>
        despesa &&
        typeof despesa.data === 'string' &&
        despesa.data.slice(0, 7) === mes &&
        CATEGORIAS.includes(despesa.categoria) &&
        Number.isSafeInteger(Number(despesa.valorCentavos)) &&
        Number(despesa.valorCentavos) > 0
    );
}

// Soma em centavos todas as despesas de uma categoria.
function totalPorCategoria(despesas, categoria) {
    return despesas
        .filter(despesa => despesa.categoria === categoria)
        .reduce((total, despesa) => total + Number(despesa.valorCentavos), 0);
}

// Atualiza os totais, o orçamento, o saldo e os indicadores visuais do mês.
function atualizarResumo(despesas) {
    // Cria um objeto com o total de cada categoria.
    const totais = Object.fromEntries(
        CATEGORIAS.map(categoria => [
            categoria,
            totalPorCategoria(despesas, categoria)
        ])
    );

    // Soma todas as categorias para obter o total mensal.
    const total = Object.values(totais)
        .reduce((soma, valor) => soma + valor, 0);

    const mes = chaveMes(mesAtual);

    // Usa os orçamentos salvos do pet se forem um objeto.
    const orcamentos = petAtual.orcamentosDespesas &&
        typeof petAtual.orcamentosDespesas === 'object'
        ? petAtual.orcamentosDespesas
        : {};

    // Usa o orçamento configurado para o mês, se for um inteiro válido.
    // Caso não exista, usa o orçamento padrão.
    const orcamento = Number.isSafeInteger(Number(orcamentos[mes])) &&
        Number(orcamentos[mes]) >= 0
        ? Number(orcamentos[mes])
        : ORCAMENTO_MENSAL_PADRAO;

    // Calcula quanto ainda resta e qual porcentagem do orçamento foi usada.
    const saldo = orcamento - total;
    const percentual = orcamento > 0 ? total / orcamento * 100 : 0;

    // Cria o nome do mês e ano, por exemplo "outubro de 2026".
    const formatadorMes = new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    });
    const dataMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const nomeMes = formatadorMes.format(dataMes);

    // Atualiza o título do resumo, deixando inicial do mês maiúscula.
    document.getElementById('resumo-despesas-heading').textContent =
        'Total em ' +
        nomeMes.charAt(0).toLocaleUpperCase('pt-BR') +
        nomeMes.slice(1);

    // Atualiza o elemento <time> com o mês e o ano separados em elementos <span>.
    const tempoMes = document.querySelector('.resumo-despesas__mes time');
    tempoMes.dateTime = mes;
    tempoMes.replaceChildren();

    const [mesTexto, anoTexto] = nomeMes.split(' de ');
    const spanMes = document.createElement('span');
    spanMes.textContent = mesTexto;
    const spanAno = document.createElement('span');
    spanAno.textContent = anoTexto || String(mesAtual.getFullYear());
    tempoMes.append(spanMes, spanAno);

    // Mostra o total gasto. O atributo value usa o formato decimal em reais.
    const valorTotal = document.querySelector('.resumo-despesas__valor');
    valorTotal.value = (total / 100).toFixed(2);
    valorTotal.textContent = formatarMoeda(total);

    // Mostra o orçamento mensal.
    const valorOrcamento = document.querySelector(
        '.resumo-despesas__orcamento data'
    );
    valorOrcamento.value = (orcamento / 100).toFixed(2);
    valorOrcamento.textContent = formatarMoeda(orcamento);

    // Mostra a porcentagem consumida do orçamento.
    document.querySelector('.resumo-despesas__linha strong').textContent =
        new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
            .format(percentual) + '% consumido';

    // Atualiza a barra de progresso do orçamento.
    const progresso = document.getElementById('progresso-orcamento');
    progresso.max = orcamento || 1;
    progresso.value = Math.min(total, orcamento || 1);
    progresso.textContent = Math.round(percentual) + '%';

    // Mostra o saldo. Um saldo negativo indica que o orçamento foi ultrapassado.
    const saldoData = document.querySelector('.resumo-despesas__livre data');
    saldoData.value = (saldo / 100).toFixed(2);
    saldoData.textContent = formatarMoeda(saldo);
    saldoData.nextSibling.textContent =
        saldo >= 0 ? ' livres' : ' acima do teto';

    // Atualiza os valores e percentuais dos cartões de categoria.
    document.querySelectorAll('.categoria-despesa').forEach(card => {
        // Obtém o nome da categoria a partir do fragmento do link, por exemplo
        // "#despesas-alimentacao".
        const categoria = card.getAttribute('href')
            .replace('#despesas-', '');

        const valor = totais[categoria] || 0;
        const percentualCategoria = total > 0 ? valor / total * 100 : 0;

        card.querySelector('.categoria-despesa__percentual').textContent =
            new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
                .format(percentualCategoria) + '%';

        const data = card.querySelector('.categoria-despesa__valor');
        data.value = (valor / 100).toFixed(2);
        data.textContent = formatarMoeda(valor);
    });

    // Mostra quantas categorias têm gastos e quantas despesas foram lançadas.
    document.querySelector('.secao-despesas__contador').textContent =
        CATEGORIAS.filter(categoria => totais[categoria] > 0).length +
        ' grupos ativos';

    document.querySelector(
        '.historico-despesas .secao-despesas__contador'
    ).textContent =
        despesas.length +
        (despesas.length === 1 ? ' lançamento' : ' lançamentos');

    // Devolve os totais por categoria para outras funções.
    return totais;
}

// Cria um item visual do histórico para uma despesa.
function criarLancamento(despesa) {
    const item = document.createElement('li');
    const artigo = document.createElement('article');
    artigo.className = 'lancamento';
    artigo.dataset.categoria = despesa.categoria;

    // Cria o ícone correspondente à categoria.
    const icone = document.createElement('span');
    icone.className = 'despesa-icone lancamento__icone';

    const glyph = document.createElement('i');
    glyph.className =
        'fa-solid despesa-glyph ' + classeIcone(despesa.categoria);
    glyph.setAttribute('aria-hidden', 'true');
    icone.append(glyph);

    // Cria a área com a descrição, data e estabelecimento.
    const informacoes = document.createElement('div');
    informacoes.className = 'lancamento__informacoes';

    const titulo = document.createElement('h4');
    titulo.className = 'lancamento__titulo';
    titulo.textContent = despesa.descricao;

    const detalhes = document.createElement('p');
    detalhes.className = 'lancamento__detalhes';

    const data = document.createElement('time');
    data.dateTime = despesa.data;
    data.textContent = formatarData(despesa.data);
    detalhes.append(data);

    // Acrescenta o estabelecimento se tiver sido informado.
    if (despesa.estabelecimento) {
        detalhes.append(
            document.createTextNode(' · ' + despesa.estabelecimento)
        );
    }

    informacoes.append(titulo, detalhes);

    // Cria o valor da despesa, formatado em reais.
    const valor = document.createElement('data');
    valor.className = 'lancamento__valor';
    valor.value = (Number(despesa.valorCentavos) / 100).toFixed(2);
    valor.textContent = formatarMoeda(Number(despesa.valorCentavos));

    artigo.append(icone, informacoes, valor);
    item.append(artigo);
    return item;
}

// Retorna a classe do ícone correspondente à categoria da despesa.
function classeIcone(categoria) {
    return {
        alimentacao: 'fa-bowl-food',
        saude: 'fa-heart-pulse',
        higiene: 'fa-soap',
        lazer: 'fa-bone'
    }[categoria] || 'fa-receipt';
}

// Atualiza a lista de despesas de cada categoria.
function renderizarGrupos(despesas) {
    CATEGORIAS.forEach(categoria => {
        const grupo = document.getElementById('despesas-' + categoria);
        const lista = grupo.querySelector('.lista-lancamentos');

        // Filtra a categoria e ordena as despesas da mais recente para a mais antiga.
        const linhas = despesas
            .filter(despesa => despesa.categoria === categoria)
            .sort((a, b) => b.data.localeCompare(a.data));

        // Atualiza o subtotal da categoria.
        const subtotal = totalPorCategoria(despesas, categoria);
        const valorSubtotal = grupo.querySelector(
            '.grupo-despesas__subtotal data'
        );
        valorSubtotal.value = (subtotal / 100).toFixed(2);
        valorSubtotal.textContent = formatarMoeda(subtotal);
        lista.replaceChildren();

        // Se não houver despesas, mostra uma mensagem para essa categoria.
        if (!linhas.length) {
            const vazio = document.createElement('li');
            vazio.className = 'lancamentos-vazios';
            vazio.textContent = 'Nenhum lançamento neste mês.';
            lista.append(vazio);
            return;
        }

        // Caso existam despesas, cria e mostra um item para cada uma.
        lista.replaceChildren(...linhas.map(criarLancamento));
    });
}

// Atualiza o resumo e os grupos de despesas do mês atual.
function renderizarMes() {
    if (!petAtual) return;

    const despesas = despesasDoMes();
    atualizarResumo(despesas);
    renderizarGrupos(despesas);

    // Habilita os botões de navegação entre meses e remove títulos antigos.
    document.querySelectorAll('.despesas-navegar').forEach(botao => {
        botao.disabled = false;
        botao.removeAttribute('title');
    });
}

// Avança ou volta o mês exibido pelo valor de diferença recebido.
// Por exemplo, -1 volta um mês e 1 avança um mês.
function mudarMes(diferenca) {
    mesAtual = new Date(
        mesAtual.getFullYear(),
        mesAtual.getMonth() + diferenca,
        1
    );
    campoData.value = dataPadraoParaMes();
    renderizarMes();
}

// Cria o objeto de uma despesa, incluindo ID e data de criação.
function criarDespesa(dados) {
    return {
        // Usa um UUID quando disponível; caso contrário, cria um ID alternativo.
        id: globalThis.crypto?.randomUUID?.() ||
            'despesa-' + Date.now() + '-' + Math.random().toString(36).slice(2),

        descricao: dados.descricao,
        categoria: dados.categoria,
        valorCentavos: dados.valorCentavos,
        data: dados.data,
        estabelecimento: dados.estabelecimento,
        observacoes: dados.observacoes,

        // Guarda a data e hora em que o registro foi criado.
        criadaEm: new Date().toISOString()
    };
}

// Lê e valida os valores do formulário.
// Retorna uma mensagem de erro ou os dados já preparados para salvar.
function validarFormulario() {
    const descricao =
        document.getElementById('descricao-despesa').value.trim();
    const categoria =
        document.getElementById('categoria-despesa').value;
    const valor =
        Number(document.getElementById('valor-despesa').value);
    const data = campoData.value;
    const estabelecimento =
        document.getElementById('estabelecimento-despesa').value.trim();
    const observacoes =
        document.getElementById('observacoes-despesa').value.trim();

    // Exige uma descrição de até 100 caracteres.
    if (!descricao || descricao.length > 100) {
        return { erro: 'Informe uma descrição com até 100 caracteres.' };
    }

    // Confirma que a categoria escolhida é permitida.
    if (!CATEGORIAS.includes(categoria)) {
        return { erro: 'Selecione uma categoria válida.' };
    }

    // Exige um valor numérico maior que zero.
    if (!Number.isFinite(valor) || valor <= 0) {
        return { erro: 'Informe um valor maior que zero.' };
    }

    // Converte reais para centavos e confirma que o resultado é válido.
    const valorCentavos = Math.round(valor * 100);
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
        return { erro: 'Informe um valor válido em reais.' };
    }

    // Confirma que a data está no formato AAAA-MM-DD e representa
    // uma data real, como 2026-10-28.
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
        Number.isNaN(new Date(data + 'T00:00:00').getTime()) ||
        new Date(data + 'T00:00:00').toISOString().slice(0, 10) !== data
    ) {
        return { erro: 'Informe uma data válida.' };
    }

    // Limita o tamanho dos campos opcionais.
    if (estabelecimento.length > 100 || observacoes.length > 500) {
        return {
            erro: 'Confira o limite de caracteres dos campos opcionais.'
        };
    }

    // Se tudo estiver válido, devolve os dados preparados para salvar.
    return {
        dados: {
            descricao,
            categoria,
            valorCentavos,
            data,
            estabelecimento,
            observacoes
        }
    };
}

// Adiciona uma despesa ao pet selecionado e salva a lista atualizada.
function salvarDespesa(dados) {
    // Usa a lista existente ou começa com uma lista vazia.
    const despesas = Array.isArray(petAtual.despesas)
        ? petAtual.despesas
        : [];

    const despesa = criarDespesa(dados);

    // Atualiza o pet preservando as despesas anteriores e adicionando a nova.
    const atualizado = atualizarPet(petAtual.id, {
        despesas: [...despesas, despesa]
    });

    // Se o pet não foi encontrado durante a atualização, informa o erro.
    if (!atualizado) {
        throw new Error('Este pet não foi encontrado no armazenamento.');
    }

    // Atualiza o pet em memória e mostra o mês da despesa recém-adicionada.
    petAtual = atualizado;
    mesAtual = new Date(dados.data + 'T00:00:00');
    renderizarMes();

    return despesa;
}

// Quando a pessoa muda o pet selecionado, atualiza o conteúdo da página.
seletorPet.addEventListener('change', () => {
    selecionarPet(seletorPet.value);
});

// Botões para navegar para o mês anterior ou seguinte.
document.querySelector('[data-acao="mes-anterior"]')
    .addEventListener('click', () => mudarMes(-1));

document.querySelector('[data-acao="mes-seguinte"]')
    .addEventListener('click', () => mudarMes(1));

// Quando um campo não passa pela validação nativa do HTML,
// marca-o como inválido e mostra uma mensagem.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informarFormulario('Confira os campos destacados e tente novamente.', true);
}, true);

// Ao editar um campo, limpa uma mensagem de validação antiga.
// Também apaga o aviso de erro do formulário enquanto a pessoa corrige os dados.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }

    if (statusForm.dataset.estado === 'erro') {
        informarFormulario('');
    }
});

// Envia o formulário e salva a nova despesa.
form.addEventListener('submit', event => {
    // Impede o envio padrão, que recarregaria a página.
    event.preventDefault();

    // Não permite envios duplicados nem salvamento sem um pet selecionado.
    if (salvando || !petAtual) return;

    // Valida os campos usando as regras da aplicação.
    const validacao = validarFormulario();
    if (validacao.erro) {
        informarFormulario(validacao.erro, true);
        return;
    }

    // Também verifica as regras nativas do navegador, como required e min.
    if (!form.reportValidity()) return;

    // Indica que o salvamento começou e atualiza o botão.
    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando…';

    try {
        // Salva a despesa, limpa o formulário e mostra uma confirmação.
        salvarDespesa(validacao.dados);
        form.reset();

        // Define novamente a data padrão depois de limpar o formulário.
        campoData.value = dataPadraoParaMes();

        informarFormulario('Despesa salva com sucesso.');

        // Fecha o popover se o navegador oferecer essa função.
        popover.hidePopover?.();
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informarFormulario(
            erro.message || 'Não foi possível salvar a despesa.',
            true
        );
    } finally {
        // Libera o botão após sucesso ou erro.
        salvando = false;
        botaoSalvar.disabled = !petAtual;
        botaoSalvar.textContent = 'Salvar despesa';
    }
});

// Carrega os pets e prepara a seleção inicial.
// Se ocorrer um erro, desabilita os controles e informa a pessoa.
try {
    prepararSelecao();
} catch (erro) {
    seletorPet.disabled = true;
    conteudo.hidden = true;
    botaoAdicionar.hidden = true;
    botaoSalvar.disabled = true;

    informarSelecao(
        erro.message || 'Não foi possível carregar os pets.',
        true
    );
}