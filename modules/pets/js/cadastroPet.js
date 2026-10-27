import { cadastroPet, criarIdPet } from './armazenamento.js';
import { validarDadosPet } from './validacao-pet.js';

const form = document.getElementById('cadastro-pet-form');
const status = document.getElementById('cadastro-pet-status');
const botao = document.getElementById('btnCadastro');
let idEnvio;
let enviando = false;

function informar(mensagem, erro = false) {
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'sucesso';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

function atualizarBotao() {
    botao.disabled = enviando;
    botao.textContent = enviando ? 'Salvando…' : 'Cadastrar Pet';
}

form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') {
        event.target.setCustomValidity('');
        event.target.removeAttribute('aria-invalid');
    }
});

form.addEventListener('invalid', event => {
    event.target.setAttribute('aria-invalid', 'true');
    informar('Confira o campo indicado e preencha todos os dados obrigatórios.', true);
}, true);

form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (enviando) return;

    const nome = document.getElementById('nome').value.trim();
    const especieSelecionada = document.querySelector('input[name="tipo_animal"]:checked');
    const especie = especieSelecionada ? especieSelecionada.value : '';
    const raca = document.getElementById('raca').value.trim();
    const idade = document.getElementById('idade').value.trim();
    const peso = document.getElementById('peso').value;
    const generoSelecionado = document.querySelector('input[name="genero"]:checked');
    const genero = generoSelecionado ? generoSelecionado.value : '';

    const novoPet = {
        nome: nome,
        especie: especie,
        raca: raca,
        idade: idade,
        peso: peso,
        genero: genero
    };

    const erroValidacao = validarDadosPet(novoPet);
    if (erroValidacao) {
        const campo = form.querySelector(`[name="${erroValidacao.campo}"]`);
        campo.setCustomValidity(erroValidacao.mensagem);
        campo.setAttribute('aria-invalid', 'true');
        campo.reportValidity();
        campo.focus();
        informar(erroValidacao.mensagem, true);
        return;
    }
    if (!form.reportValidity()) return;
    enviando = true;
    atualizarBotao();
    try {
        idEnvio ||= criarIdPet();
        cadastroPet(novoPet, idEnvio);
        form.reset();
        informar('Pet cadastrado com sucesso! Abrindo o painel…');
    } catch (erro) {
        enviando = false;
        atualizarBotao();
        informar(erro.message || 'Não foi possível salvar o cadastro.', true);
        return;
    }
    window.location.replace('/modules/pets/index.html?cadastro=sucesso');
});

window.addEventListener('pageshow', () => {
    enviando = false;
    atualizarBotao();
});
atualizarBotao();
