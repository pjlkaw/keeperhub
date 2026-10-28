// Importa do arquivo armazenamento.js as funções usadas para salvar o pet
// e criar um identificador para o envio.
import { cadastroPet, criarIdPet } from './armazenamento.js';

// Importa a função que verifica se os dados do pet são válidos.
import { validarDadosPet } from './validacao-pet.js';

// Busca no HTML o formulário, a área de mensagens e o botão de cadastro.
const form = document.getElementById('cadastro-pet-form');
const status = document.getElementById('cadastro-pet-status');
const botao = document.getElementById('btnCadastro');

// Guarda o identificador do envio atual e controla se um cadastro está em andamento.
let idEnvio;
let enviando = false;

// Mostra uma mensagem na página e indica se ela representa sucesso ou erro.
function informar(mensagem, erro = false) {
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';

    // Define o comportamento acessível da mensagem para leitores de tela.
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Atualiza o botão conforme o estado do envio.
// Enquanto salva, o botão fica desabilitado e mostra outra mensagem.
function atualizarBotao() {
    botao.disabled = enviando;
    botao.textContent = enviando ? 'Salvando…' : 'Cadastrar Pet';
}

// Quando a pessoa altera um campo, apaga uma mensagem de validação anterior.
// Isso permite que o campo seja validado novamente com o novo valor.
form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

// O evento "invalid" acontece quando um campo não passa pela validação do navegador.
// O terceiro argumento, true, faz o formulário capturar o evento durante a propagação.
form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informar('Confira o campo indicado e preencha todos os dados obrigatórios.', true);
}, true);

// Executa esta função quando a pessoa tenta enviar o formulário.
form.addEventListener('submit', function (event) {
    // Impede o envio padrão do formulário, que recarregaria a página.
    event.preventDefault();

    // Evita que um segundo envio comece enquanto o primeiro ainda está em andamento.
    if (enviando) return;

    // Lê os valores dos campos.
    // trim() remove espaços extras no começo e no fim do texto.
    const nome = document.getElementById('nome').value.trim();

    // Busca a opção marcada para a espécie do animal.
    // Se nenhuma opção estiver marcada, usa uma string vazia.
    const especieSelecionada = document.querySelector('input[name="tipo_animal"]:checked');
    const especie = especieSelecionada ? especieSelecionada.value : '';

    const raca = document.getElementById('raca').value.trim();
    const idade = document.getElementById('idade').value.trim();

    // Lê o peso sem aplicar trim(), pois o campo pode ser numérico.
    const peso = document.getElementById('peso').value;

    // Busca a opção marcada para o gênero.
    const generoSelecionado = document.querySelector('input[name="genero"]:checked');
    const genero = generoSelecionado ? generoSelecionado.value : '';

    // Agrupa os dados do formulário em um objeto.
    const novoPet = {
        nome: nome,
        especie: especie,
        raca: raca,
        idade: idade,
        peso: peso,
        genero: genero
    };

    // Valida os dados usando a função importada.
    // Se houver erro, a função retorna informações sobre o campo e a mensagem.
    const erroValidacao = validarDadosPet(novoPet);

    if (erroValidacao) {
        // Localiza o campo que causou o erro pelo atributo name.
        const campo = form.querySelector(`[name="${erroValidacao.campo}"]`);

        // Mostra a mensagem de validação nativa do navegador para esse campo.
        campo.setCustomValidity(erroValidacao.mensagem);
        campo.setAttribute('aria-invalid', 'true');
        campo.reportValidity();
        campo.focus();

        // Também mostra a mensagem na área de status do formulário.
        informar(erroValidacao.mensagem, true);
        return; // Interrompe o envio porque há um erro.
    }

    // Executa as validações nativas do HTML, como required, min e max.
    // Se algum campo não passar, interrompe o envio.
    if (!form.reportValidity()) return;

    // Informa que o cadastro está em andamento e atualiza o botão.
    enviando = true;
    atualizarBotao();

    try {
        // Cria um identificador para o envio, se ainda não houver um.
        // O operador ||= mantém o valor existente ou atribui um novo.
        idEnvio ||= criarIdPet();

        // Salva os dados do pet, usando o identificador do envio.
        cadastroPet(novoPet, idEnvio);

        // Limpa os campos do formulário após salvar.
        form.reset();

        // Informa que o cadastro deu certo e que o painel será aberto.
        informar('Pet cadastrado com sucesso! Abrindo o painel…');
    } catch (erro) {
        // Se o salvamento falhar, libera o formulário para uma nova tentativa.
        enviando = false;
        atualizarBotao();

        // Mostra a mensagem do erro; se não existir, exibe uma mensagem padrão.
        informar(erro.message || 'Não foi possível salvar o cadastro.', true);
        return; // Interrompe a execução para não redirecionar.
    }

    // Redireciona para o painel e informa pela URL que o cadastro teve sucesso.
    window.location.replace('/modules/pets/index.html?cadastro=sucesso');
});

// O evento "pageshow" ocorre quando a página é exibida,
// inclusive quando a pessoa volta para ela pelo histórico do navegador.
// Nesse caso, o botão volta ao estado inicial.
window.addEventListener('pageshow', () => {
    enviando = false;
    atualizarBotao();
});

// Define o estado inicial do botão quando o script é carregado.
atualizarBotao();