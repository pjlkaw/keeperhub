// Controla o carregamento e o salvamento dos dados de emergência do tutor.

// Importa as funções que buscam e atualizam um pet no armazenamento.
import { atualizarPet, buscarPetPorId } from './armazenamento.js';

// Busca no HTML o formulário, a mensagem de status e o botão de envio.
const form = document.getElementById('formulario-pet-tutor');
const status = document.getElementById('status-tutor');
const botao = form.querySelector('[type="submit"]');

// Lê da URL o ID do pet que está sendo editado.
// Exemplo: ?petId=123
const petId = new URLSearchParams(window.location.search).get('petId');

// Guarda os dados do pet carregado e indica se o salvamento está em andamento.
let petAtual = null;
let salvando = false;

// Exibe uma mensagem de sucesso ou erro na página.
function informar(mensagem, erro = false) {
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';

    // Informa leitores de tela sobre o tipo de mensagem exibida.
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Preenche o formulário com os dados do pet e do contato de emergência.
function preencherFormulario(pet) {
    // Guarda o ID do pet no formulário e no elemento <main>.
    form.dataset.petId = pet.id;
    form.closest('main').dataset.petId = pet.id;

    // Usa um objeto vazio caso o pet ainda não tenha contato de emergência.
    const contato = pet.contatoEmergencia ?? {};

    // Preenche os campos. Se os dados não existirem, deixa os campos vazios.
    form.elements['nome-tutor'].value = contato.nomeTutor ?? '';
    form.elements['telefone-emergencia'].value = contato.telefone ?? '';

    // Acrescenta o ID do pet aos links das abas de edição.
    // Assim, a seleção do pet é preservada ao navegar entre elas.
    document.querySelectorAll('.abas-pet a').forEach(link => {
        const destino = new URL(link.href, window.location.href);
        destino.searchParams.set('petId', pet.id);
        link.href = destino.href;
    });
}

// Desabilita todos os campos e controles do formulário.
function desabilitarFormulario() {
    [...form.elements].forEach(campo => {
        campo.disabled = true;
    });
}

// Busca o pet pelo ID da URL e carrega seus dados no formulário.
function carregarPet() {
    try {
        // Sem ID, não há como identificar qual pet deve ser editado.
        if (!petId) {
            informar('Pet não informado. Volte à lista e escolha um pet para editar.', true);
            desabilitarFormulario();
            return;
        }

        // Busca o pet no armazenamento.
        petAtual = buscarPetPorId(petId);

        // Se o pet não existir, mostra uma mensagem e desabilita o formulário.
        if (!petAtual) {
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            desabilitarFormulario();
            return;
        }

        // Preenche os campos com os dados encontrados.
        preencherFormulario(petAtual);
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível carregar os dados do pet.', true);
        desabilitarFormulario();
    }
}

// Quando a pessoa altera um campo, limpa uma mensagem de validação anterior.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

// Trata campos inválidos segundo as regras do HTML,
// como campos obrigatórios ou formatos incorretos.
// O terceiro argumento, true, faz o formulário capturar esse evento.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informar('Confira o campo indicado e tente novamente.', true);
}, true);

// Executa quando a pessoa envia o formulário.
form.addEventListener('submit', event => {
    // Impede o envio padrão do formulário, que recarregaria a página.
    event.preventDefault();

    // Evita envios duplicados e interrompe se nenhum pet foi carregado.
    if (salvando || !petAtual) return;

    // Lê e remove espaços extras dos dados preenchidos.
    const nomeTutor = form.elements['nome-tutor'].value.trim();
    const telefone = form.elements['telefone-emergencia'].value.trim();

    // Indica que o salvamento começou e atualiza o botão.
    salvando = true;
    botao.disabled = true;
    botao.textContent = 'Salvando…';

    try {
        // Atualiza os dados de contato de emergência do pet.
        const atualizado = atualizarPet(petId, {
            contatoEmergencia: {
                // Preserva outras propriedades que já existam nesse objeto.
                ...(petAtual.contatoEmergencia ?? {}),

                // Substitui o nome e o telefone pelos valores do formulário.
                nomeTutor,
                telefone
            }
        });

        // Se o pet não foi encontrado durante a atualização,
        // desabilita o formulário e mostra uma mensagem.
        if (!atualizado) {
            petAtual = null;
            desabilitarFormulario();
            informar('Este pet não foi encontrado no armazenamento deste navegador.', true);
            return;
        }

        // Atualiza os dados locais com o resultado salvo.
        petAtual = atualizado;
        informar('Dados do tutor salvos com sucesso.');
    } catch (erro) {
        // Mostra o erro recebido ou uma mensagem padrão.
        informar(erro.message || 'Não foi possível salvar os dados do tutor.', true);
    } finally {
        // Este bloco executa tanto após sucesso quanto após erro.
        // Libera o botão novamente se ainda houver um pet carregado.
        salvando = false;

        if (petAtual) {
            botao.disabled = false;
            botao.textContent = 'Salvar Alterações';
        }
    }
});

// Carrega o pet assim que o script é executado.
carregarPet();