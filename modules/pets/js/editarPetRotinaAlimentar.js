// Controla as refeições e as observações da rotina alimentar do pet.

// Importa as funções para atualizar um pet e buscá-lo pelo ID.
import { atualizarPet, buscarPetPorId } from './armazenamento.js';

// Busca no HTML o formulário e os elementos que a página vai atualizar.
const form = document.getElementById('formulario-rotina-alimentar');
const statusBox = document.getElementById('aviso-rotina');
const status = document.getElementById('status-rotina');
const botaoDesfazer = document.getElementById('desfazer-exclusao');
const botaoAdicionar = document.getElementById('adicionar-refeicao');
const editorContainer = document.getElementById('nova-refeicao');
const lista = document.getElementById('lista-refeicoes');
const mensagemVazia = document.getElementById('refeicoes-vazias');
const modeloCartao = document.getElementById('modelo-cartao-refeicao');
const modeloEditor = document.getElementById('modelo-editor-refeicao');
const campoObservacoes = document.getElementById('observacoes-rotina');
const botaoSalvar = form.querySelector('[type="submit"]');

// Lê da URL o ID do pet que está sendo editado.
// Exemplo: ?petId=123
const petId = new URLSearchParams(window.location.search).get('petId');

// Guarda os dados do pet, a lista de refeições,
// a refeição excluída mais recentemente e o estado do salvamento.
let petAtual = null;
let refeicoes = [];
let ultimaExclusao = null;
let salvando = false;

// Cria um identificador para uma refeição.
// Usa crypto.randomUUID quando disponível; caso contrário,
// monta um ID usando a data atual e um valor aleatório.
function novoIdRefeicao() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

    return 'refeicao-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

// Exibe uma mensagem de sucesso ou de erro.
function informar(mensagem, erro = false) {
    // Mostra a caixa de aviso apenas se houver uma mensagem.
    statusBox.hidden = !mensagem;

    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';

    // Informa leitores de tela sobre a mensagem.
    status.setAttribute('role', erro ? 'alert' : 'status');

    // Só mostra o botão "desfazer" se houver uma exclusão que possa ser revertida.
    botaoDesfazer.hidden = !ultimaExclusao;
}

// Indica que existem alterações no formulário que ainda precisam ser salvas.
function marcarAlteracoes(mensagem = 'Há alterações não salvas.') {
    informar(mensagem);
}

// Limpa e padroniza a lista de refeições recebida do armazenamento.
function normalizarRefeicoes(valor) {
    // Se o valor não for uma lista, retorna uma lista vazia.
    if (!Array.isArray(valor)) return [];

    return valor
        // Mantém somente itens que sejam objetos comuns.
        .filter(item => item && typeof item === 'object' && !Array.isArray(item))

        // Cria uma cópia padronizada de cada refeição.
        .map(item => ({
            ...item,

            // Mantém o ID existente ou cria um novo.
            id: typeof item.id === 'string' && item.id
                ? item.id
                : novoIdRefeicao(),

            // Remove espaços extras do nome, se ele for texto.
            nome: typeof item.nome === 'string' ? item.nome.trim() : '',

            // Mantém o horário se for texto; caso contrário, usa string vazia.
            horario: typeof item.horario === 'string' ? item.horario : ''
        }))

        // Descarta refeições sem nome ou com horário fora do formato HH:MM.
        .filter(item =>
            item.nome &&
            /^([01]\d|2[0-3]):[0-5]\d$/.test(item.horario)
        )

        // Ordena as refeições pelo horário.
        .sort((a, b) => a.horario.localeCompare(b.horario));
}

// Atualiza a lista de cartões de refeição na página.
function renderizarRefeicoes() {
    // Cria um cartão a partir do modelo HTML para cada refeição.
    const cartoes = refeicoes.map(refeicao => {
        const fragmento = modeloCartao.content.cloneNode(true);
        const item = fragmento.querySelector('li');
        const cartao = item.querySelector('.cartao-refeicao');
        const botaoEditar = item.querySelector('.cartao-refeicao__editar');
        const botaoRemover = item.querySelector('.cartao-refeicao__remover');
        const horario = item.querySelector('.cartao-refeicao__horario');

        // Guarda o ID no cartão para localizar a refeição ao editar ou remover.
        cartao.dataset.refeicaoId = refeicao.id;

        // Preenche o título e o horário do cartão.
        item.querySelector('.cartao-refeicao__titulo').textContent = refeicao.nome;
        horario.dateTime = refeicao.horario;
        horario.textContent = refeicao.horario;

        // Define rótulos acessíveis para os botões.
        botaoEditar.setAttribute('aria-label', 'Editar ' + refeicao.nome);
        botaoRemover.setAttribute('aria-label', 'Excluir ' + refeicao.nome);

        return item;
    });

    // Substitui os cartões atuais pelos recém-criados.
    lista.replaceChildren(...cartoes);

    // Mostra a mensagem de lista vazia se não houver refeições.
    mensagemVazia.hidden = refeicoes.length > 0;
}

// Fecha e limpa o editor de refeição.
function fecharEditor() {
    editorContainer.replaceChildren();
    editorContainer.hidden = true;

    // Atualiza os atributos e o estado do botão de adicionar.
    botaoAdicionar.setAttribute('aria-expanded', 'false');
    botaoAdicionar.disabled = false;
}

// Abre o editor para criar uma refeição ou alterar uma existente.
function abrirEditor(refeicao = null) {
    // Não abre o editor se ainda não houver um pet carregado.
    if (!petAtual) return;

    // Exige que a edição atual seja concluída ou cancelada antes de abrir outra.
    if (!editorContainer.hidden) {
        informar('Conclua ou cancele a edição aberta antes de iniciar outra.');
        return;
    }

    // Copia o modelo HTML do editor e busca os seus campos e botões.
    const fragmento = modeloEditor.content.cloneNode(true);
    const editor = fragmento.querySelector('.editor-refeicao');
    const nome = editor.querySelector('[name="nome_refeicao"]');
    const horario = editor.querySelector('[name="horario_refeicao"]');
    const titulo = editor.querySelector('.editor-refeicao__titulo');
    const botaoConfirmar = editor.querySelector('[data-acao="confirmar"]');
    const botaoCancelar = editor.querySelector('[data-acao="cancelar"]');

    // Define o título e preenche os valores quando estiver editando.
    titulo.textContent = refeicao ? 'Editar refeição' : 'Nova refeição';
    nome.value = refeicao?.nome ?? '';
    horario.value = refeicao?.horario ?? '';

    // Guarda o ID no editor. Sem ID, será uma nova refeição.
    editor.dataset.refeicaoId = refeicao?.id ?? '';

    // Mostra o editor e desabilita o botão de adicionar enquanto ele estiver aberto.
    editorContainer.replaceChildren(fragmento);
    editorContainer.hidden = false;
    botaoAdicionar.setAttribute('aria-expanded', 'true');
    botaoAdicionar.disabled = true;

    // Ao confirmar, valida os campos e adiciona ou atualiza a refeição.
    botaoConfirmar.addEventListener('click', () => {
        // Limpa uma mensagem de validação anterior do campo nome.
        nome.setCustomValidity('');

        // Exige que o nome não fique vazio depois de remover os espaços.
        if (!nome.value.trim()) {
            nome.setCustomValidity('Informe o nome da refeição.');
            nome.reportValidity();
            nome.focus();
            return;
        }

        // Executa as validações HTML dos campos, como required e formato.
        if (!nome.reportValidity() || !horario.reportValidity()) return;

        // Reúne os dados preenchidos no editor.
        const dados = {
            nome: nome.value.trim(),
            horario: horario.value
        };

        // Se houver ID, a refeição está sendo editada.
        const id = editor.dataset.refeicaoId;

        if (id) {
            // Encontra a refeição correspondente na lista atual.
            const indice = refeicoes.findIndex(item => item.id === id);

            // Se não for encontrada, fecha o editor e informa o problema.
            if (indice === -1) {
                fecharEditor();
                informar('Esta refeição não foi encontrada na rotina atual.', true);
                return;
            }

            // Atualiza os campos da refeição, preservando outras propriedades.
            refeicoes[indice] = { ...refeicoes[indice], ...dados };
        } else {
            // Sem ID, cria uma nova refeição e adiciona à lista.
            refeicoes.push({ id: novoIdRefeicao(), ...dados });
        }

        // Mantém a lista em ordem de horário.
        refeicoes.sort((a, b) => a.horario.localeCompare(b.horario));

        // Fecha o editor, redesenha a lista e avisa que é preciso salvar.
        fecharEditor();
        renderizarRefeicoes();
        marcarAlteracoes('Refeição atualizada. Salve as alterações para persistir.');
    });

    // O botão cancelar fecha o editor sem aplicar as mudanças feitas nele.
    botaoCancelar.addEventListener('click', fecharEditor);

    // Coloca o cursor no campo nome para facilitar o preenchimento.
    nome.focus();
}

// Preenche o formulário com a rotina alimentar salva do pet.
function preencherFormulario(pet) {
    // Guarda o ID do pet no formulário e no elemento <main>.
    form.dataset.petId = pet.id;
    form.closest('main').dataset.petId = pet.id;

    // Usa a rotina salva se ela for um objeto; caso contrário, usa um objeto vazio.
    const rotina = pet.rotinaAlimentar && typeof pet.rotinaAlimentar === 'object'
        ? pet.rotinaAlimentar
        : {};

    // Padroniza as refeições e preenche as observações.
    refeicoes = normalizarRefeicoes(rotina.refeicoes);
    campoObservacoes.value =
        typeof rotina.observacoes === 'string' ? rotina.observacoes : '';

    // Acrescenta o ID do pet aos links das abas para mantê-lo selecionado
    // durante a navegação entre páginas.
    document.querySelectorAll('.abas-pet a').forEach(link => {
        const destino = new URL(link.href, window.location.href);
        destino.searchParams.set('petId', pet.id);
        link.href = destino.href;
    });

    // Mostra as refeições na página.
    renderizarRefeicoes();
}

// Desabilita todos os campos e controles do formulário.
function desabilitarFormulario() {
    [...form.elements].forEach(campo => {
        campo.disabled = true;
    });
}

// Busca o pet usando o ID da URL e carrega seus dados.
function carregarPet() {
    try {
        // Sem ID, não é possível saber qual pet deve ser editado.
        if (!petId) {
            informar('Pet não informado. Volte à lista e escolha um pet para editar.', true);
            desabilitarFormulario();
            return;
        }

        // Busca o pet no armazenamento.
        petAtual = buscarPetPorId(petId);

        // Se não for encontrado, mostra uma mensagem e desabilita o formulário.
        if (!petAtual) {
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            desabilitarFormulario();
            return;
        }

        // Preenche a página com os dados do pet.
        preencherFormulario(petAtual);
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível carregar a rotina alimentar.', true);
        desabilitarFormulario();
    }
}

// O botão abre o editor para adicionar uma nova refeição.
botaoAdicionar.addEventListener('click', () => abrirEditor());

// Usa um único listener para os botões dos cartões da lista.
lista.addEventListener('click', event => {
    // Descobre se o clique ocorreu em um botão dentro de um cartão.
    const botao = event.target.closest('button');
    const cartao = event.target.closest('.cartao-refeicao');

    if (!botao || !cartao) return;

    // Encontra os dados da refeição pelo ID guardado no cartão.
    const refeicao = refeicoes.find(
        item => item.id === cartao.dataset.refeicaoId
    );
    if (!refeicao) return;

    // Se o botão clicado for o de editar, abre o editor preenchido.
    if (botao.classList.contains('cartao-refeicao__editar')) {
        abrirEditor(refeicao);
        return;
    }

    // Se o botão clicado for o de remover, exclui a refeição da lista em memória.
    if (botao.classList.contains('cartao-refeicao__remover')) {
        // Se essa refeição estiver aberta no editor, fecha o editor primeiro.
        const editorAberto = editorContainer.querySelector('.editor-refeicao');
        if (editorAberto?.dataset.refeicaoId === refeicao.id) fecharEditor();

        // Guarda a refeição e sua posição para permitir desfazer a exclusão.
        const indice = refeicoes.findIndex(item => item.id === refeicao.id);
        ultimaExclusao = { refeicao, indice };

        // Remove a refeição da lista e atualiza a interface.
        refeicoes.splice(indice, 1);
        renderizarRefeicoes();

        // A exclusão ainda precisa ser salva. A pessoa também pode desfazê-la.
        marcarAlteracoes('Refeição removida. Você pode desfazer ou salvar as alterações.');
        botaoDesfazer.hidden = false;
    }
});

// Desfaz a exclusão mais recente, se houver uma.
botaoDesfazer.addEventListener('click', () => {
    if (!ultimaExclusao) return;

    // Reinsere a refeição na posição em que estava.
    // Math.min evita usar um índice maior que o tamanho atual da lista.
    const indice = Math.min(ultimaExclusao.indice, refeicoes.length);
    refeicoes.splice(indice, 0, ultimaExclusao.refeicao);

    // Limpa o registro de exclusão desfeita.
    ultimaExclusao = null;

    // Ordena por horário, atualiza a lista e avisa que ainda é preciso salvar.
    refeicoes.sort((a, b) => a.horario.localeCompare(b.horario));
    renderizarRefeicoes();
    marcarAlteracoes('Exclusão desfeita. Salve as alterações para persistir.');
});

// Avisa que existem alterações quando as observações são editadas.
campoObservacoes.addEventListener('input', () => {
    if (petAtual) marcarAlteracoes();
});

// Quando um campo não passa pela validação HTML, marca-o como inválido
// e mostra uma mensagem. O true permite capturar o evento no formulário.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informar('Confira o campo indicado e preencha os dados obrigatórios.', true);
}, true);

// Ao alterar um campo, remove a mensagem de validação personalizada anterior.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

// Salva no armazenamento as refeições e observações.
form.addEventListener('submit', event => {
    // Impede o envio padrão, que recarregaria a página.
    event.preventDefault();

    // Evita envios duplicados ou tentativas antes de carregar um pet.
    if (salvando || !petAtual) return;

    // Não salva enquanto houver uma refeição em edição ainda não confirmada.
    if (!editorContainer.hidden) {
        informar('Confirme ou cancele a edição da refeição antes de salvar.');
        editorContainer.querySelector('[name="nome_refeicao"]')?.focus();
        return;
    }

    // Indica que o salvamento começou e atualiza o botão.
    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando…';

    try {
        // Atualiza a rotina alimentar do pet.
        const atualizado = atualizarPet(petId, {
            rotinaAlimentar: {
                // Preserva outras propriedades existentes da rotina.
                ...(petAtual.rotinaAlimentar ?? {}),

                // Salva a lista atual e as observações sem espaços nas pontas.
                refeicoes,
                observacoes: campoObservacoes.value.trim()
            }
        });

        // Se o pet não for encontrado, desabilita o formulário e informa o erro.
        if (!atualizado) {
            petAtual = null;
            desabilitarFormulario();
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            return;
        }

        // Atualiza os dados locais com o pet retornado pelo armazenamento.
        petAtual = atualizado;

        // Recarrega a lista a partir dos dados salvos e limpa a opção de desfazer.
        refeicoes = normalizarRefeicoes(petAtual.rotinaAlimentar?.refeicoes);
        ultimaExclusao = null;
        renderizarRefeicoes();

        informar('Rotina alimentar salva com sucesso.');
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível salvar a rotina alimentar.', true);
    } finally {
        // Este bloco executa após sucesso ou erro.
        // Libera o botão novamente se ainda houver um pet carregado.
        salvando = false;

        if (petAtual) {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = 'Salvar Alterações';
        }
    }
});

// Carrega o pet e sua rotina alimentar ao iniciar o script.
carregarPet();