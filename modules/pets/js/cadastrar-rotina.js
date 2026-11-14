/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: cadastrar-rotina.js
Formulário único de rotina (higiene, alimentar e lazer): seleção de pets,
campos por tipo, validação, cadastro e edição.
Depende de: rotinas.js, rotinas-armazenamento.js, selecao-pets.js, armazenamento.js
Usado por: components/cadastrar-rotina.html
================================================== */

import { carregarPets, listarPets } from './armazenamento.js';
import { criarSelecaoMultipla } from './selecao-pets.js';
import { CATALOGO, TIPOS_ROTINA, validarRotina } from './rotinas.js';
import { buscarMembrosDaRotina, editarRotina, rotinasDoPet, salvarRotina } from './rotinas-armazenamento.js';

// ==================================================
// PARÂMETROS DA URL E CABEÇALHO
// ==================================================
const parametros = new URLSearchParams(location.search);
const tipoParametro = parametros.get('tipo');
const tipoInicial = TIPOS_ROTINA.includes(tipoParametro) ? tipoParametro : 'higiene';
const petOrigem = parametros.get('petId');
const todosNaOrigem = !petOrigem && parametros.get('todos') === '1';
const idEdicao = parametros.get('id');
const modoEdicao = Boolean(idEdicao);

// Ajusta o retorno e o título antes de o load-components.js ler a configuração.
const retornoCadastro = new URL('rotina-diaria.html', location.href);
if (petOrigem) retornoCadastro.searchParams.set('petId', petOrigem);
if (todosNaOrigem) retornoCadastro.searchParams.set('todos', '1');
window.keeperhubModuleConfig.backUrl = retornoCadastro.href;
if (modoEdicao) {
    window.keeperhubModuleConfig.title = 'Editar rotina';
    window.keeperhubModuleConfig.subtitle = 'Atualize as informações salvas do seu pet.';
    document.title = 'Editar rotina • Pets • KeeperHub';
}

// ==================================================
// ELEMENTOS E ESTADO
// ==================================================
const form = document.querySelector('.formulario-adicionar-rotina');
const seletorTipo = document.getElementById('tipo-rotina');
const botao = form.querySelector('.formulario-adicionar-rotina__enviar');
const aviso = document.getElementById('aviso-integracao-rotina');
const grupos = Object.fromEntries(
    TIPOS_ROTINA.map(tipo => [tipo, form.querySelector(`fieldset[data-tipo="${tipo}"]`)])
);

let pets = [];
let petsAlvo = [];
let petsOrigemEdicao = [];
let idsOrigemEdicao = [];
let rotinaNaoEncontrada = false;

// Cria o seletor de pet (mesmo comportamento do formulário de medicamento).
function criarSeletor() {
    const secao = document.createElement('section');
    secao.className = 'seletor-pet-rotina-cadastro';
    secao.innerHTML =
        '<label for="pet-rotina-cadastro">Pet</label>' +
        '<select id="pet-rotina-cadastro" aria-describedby="status-pet-rotina-cadastro"></select>' +
        '<p id="status-pet-rotina-cadastro" role="status" aria-live="polite" hidden></p>';
    form.before(secao);
    return { select: secao.querySelector('select'), status: secao.querySelector('p') };
}

const { select: seletorPet, status } = criarSeletor();
const selecaoMultipla = criarSelecaoMultipla(seletorPet);

// Exibe uma orientação informativa ou uma mensagem de erro.
function informar(mensagem, erro = false) {
    status.hidden = !mensagem;
    status.textContent = mensagem;
    status.dataset.estado = erro ? 'erro' : 'informativo';
    status.setAttribute('role', erro ? 'alert' : 'status');
}

// Mantém na URL o pet e o tipo atuais, sem recarregar a página.
function atualizarUrl(id) {
    // Em edição a URL (petId e id) precisa continuar apontando para a rotina aberta.
    if (modoEdicao) return;
    const url = new URL(location.href);
    if (seletorPet.value === '__todos__') url.searchParams.set('todos', '1');
    else url.searchParams.delete('todos');
    if (id) url.searchParams.set('petId', id);
    else url.searchParams.delete('petId');
    url.searchParams.set('tipo', tipoAtual());
    history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function tipoAtual() {
    return seletorTipo.value;
}

// ==================================================
// CAMPOS POR TIPO
// ==================================================
function campo(tipo, chave) {
    return grupos[tipo].querySelector(`[data-campo="${chave}"]`);
}

function valorRadio(tipo, nome) {
    return grupos[tipo].querySelector(`input[name="${tipo}_${nome}"]:checked`)?.value ?? '';
}

function valorTexto(tipo, id) {
    return grupos[tipo].querySelector(`#${tipo}-${id}`)?.value ?? '';
}

function definirRadio(tipo, nome, valor) {
    grupos[tipo].querySelectorAll(`input[name="${tipo}_${nome}"]`).forEach(input => {
        input.checked = input.value === valor;
    });
}

function definirTexto(tipo, id, valor) {
    const input = grupos[tipo].querySelector(`#${tipo}-${id}`);
    if (input) input.value = valor ?? '';
}

// Lê os campos do tipo ativo no formato esperado por validarRotina.
function lerDados(tipo) {
    const dados = {
        horario: valorTexto(tipo, 'horario'),
        observacao: valorTexto(tipo, 'observacao')
    };
    if (tipo === 'alimentar') {
        dados.refeicao = valorRadio(tipo, 'refeicao');
        dados.refeicaoOutra = valorTexto(tipo, 'refeicao-outra');
        return dados;
    }
    dados.atividade = valorRadio(tipo, 'atividade');
    dados.frequencia = valorRadio(tipo, 'frequencia');
    dados.data = valorTexto(tipo, 'data');
    if (tipo === 'higiene') return dados;
    dados.atividadeOutra = valorTexto(tipo, 'atividade-outra');
    dados.duracaoMin = valorTexto(tipo, 'duracao');
    dados.diasSemana = [...grupos.lazer.querySelectorAll('input[name="lazer_dias"]:checked')]
        .map(input => input.value);
    return dados;
}

// Mostra "Outro", dias da semana e data só quando necessários.
function atualizarCondicionais() {
    alternarCampo(campo('alimentar', 'refeicaoOutra'), valorRadio('alimentar', 'refeicao') === 'outro');
    alternarCampo(campo('lazer', 'atividadeOutra'), valorRadio('lazer', 'atividade') === 'outro');
    alternarCampo(campo('lazer', 'diasSemana'), valorRadio('lazer', 'frequencia') === 'dias_semana');
    alternarCampo(campo('lazer', 'data'), valorRadio('lazer', 'frequencia') === 'uma_vez');
}

// Mostra ou oculta um campo condicional; ao ocultar, limpa o valor e o erro.
function alternarCampo(elemento, visivel) {
    if (!elemento || elemento.hidden === !visivel) return;
    elemento.hidden = !visivel;
    if (visivel) return;
    elemento.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
        else input.value = '';
    });
    limparErroDoCampo(elemento);
}

// Alterna o grupo de campos visível conforme o tipo escolhido.
function mostrarTipo(tipo) {
    for (const [nome, grupo] of Object.entries(grupos)) {
        const ativo = nome === tipo;
        grupo.hidden = !ativo;
        grupo.inert = !ativo;
    }
    limparErros();
}

// ==================================================
// ERROS POR CAMPO
// ==================================================
function limparErroDoCampo(elemento) {
    const erro = elemento?.querySelector('.erro-campo');
    if (erro) {
        erro.textContent = '';
        erro.hidden = true;
    }
    elemento?.querySelectorAll('input, textarea').forEach(input => input.removeAttribute('aria-invalid'));
}

function limparErros() {
    form.querySelectorAll('[data-campo]').forEach(limparErroDoCampo);
}

// Exibe cada mensagem de erro no próprio campo e foca o primeiro com problema.
function mostrarErros(tipo, erros) {
    let primeiro = null;
    for (const [chave, mensagem] of Object.entries(erros)) {
        const elemento = campo(tipo, chave);
        const erro = elemento?.querySelector('.erro-campo');
        if (!erro) continue;
        erro.textContent = mensagem;
        erro.hidden = false;
        elemento.querySelectorAll('input, textarea').forEach(input => input.setAttribute('aria-invalid', 'true'));
        primeiro ??= elemento;
    }
    primeiro?.querySelector('input, textarea')?.focus();
}

// ==================================================
// SELEÇÃO DE PETS
// ==================================================
// Habilita o envio e atualiza o aviso conforme os pets escolhidos.
function atualizarFormulario() {
    if (rotinaNaoEncontrada) return;
    botao.disabled = !petsAlvo.length;

    if (!petsAlvo.length) {
        const mensagem = pets.length
            ? 'Selecione um pet para continuar.'
            : 'Cadastre um pet antes de adicionar uma rotina.';
        aviso.textContent = mensagem;
        aviso.dataset.estado = pets.length ? 'informativo' : 'erro';
        informar(mensagem, !pets.length);
    } else {
        aviso.textContent = petsAlvo.length > 1
            ? 'A rotina será salva para ' + petsAlvo.length + ' pets.'
            : 'A rotina será salva neste navegador.';
        aviso.dataset.estado = 'informativo';
        informar('');
    }
}

function selecionarPet(pet) {
    petsAlvo = pet ? [pet] : [];
    seletorPet.value = pet?.id ?? '';
    atualizarUrl(pet?.id);
    atualizarFormulario();
}

// Lê os pets já carregados e preenche o seletor.
function montarSeletorDePets() {
    pets = listarPets();
    seletorPet.replaceChildren();

    const inicial = document.createElement('option');
    inicial.disabled = true;
    inicial.hidden = true;
    inicial.value = '';
    inicial.textContent = pets.length ? 'Selecione um pet' : 'Cadastre um pet primeiro';
    seletorPet.append(inicial);
    selecaoMultipla.preparar(pets, true);

    pets.forEach(pet => seletorPet.append(new Option(pet.nome, pet.id)));
    seletorPet.disabled = !pets.length;

    const petQuery = pets.find(pet => pet.id === petOrigem);
    selecionarPet(petQuery ?? (pets.length === 1 ? pets[0] : null));
    if (pets.length > 1 && todosNaOrigem) {
        seletorPet.value = '__todos__';
        seletorPet.dispatchEvent(new Event('change'));
    }
}

seletorPet.addEventListener('change', () => {
    petsAlvo = selecaoMultipla.selecionados(pets);
    atualizarUrl(petsAlvo.length === 1 ? petsAlvo[0].id : null);
    atualizarFormulario();
});

// ==================================================
// MODO EDIÇÃO
// ==================================================
function semAcentos(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

// Descobre a chave do catálogo de uma refeição salva (só o nome fica guardado).
function chaveDaRefeicao(nome) {
    const alvo = semAcentos(nome);
    const achada = Object.entries(CATALOGO.alimentar.refeicoes)
        .find(([chave, rotulo]) => chave !== 'outro' && semAcentos(rotulo) === alvo);
    return achada?.[0] ?? 'outro';
}

// Preenche os campos do tipo com o registro salvo.
function preencherRegistro(tipo, registro) {
    definirTexto(tipo, 'horario', registro.horario);
    definirTexto(tipo, 'observacao', registro.observacao);

    if (tipo === 'alimentar') {
        const chave = chaveDaRefeicao(registro.nome);
        definirRadio(tipo, 'refeicao', chave);
        if (chave === 'outro') definirTexto(tipo, 'refeicao-outra', registro.nome);
        return;
    }

    definirRadio(tipo, 'atividade', registro.atividade);
    definirRadio(tipo, 'frequencia', registro.frequencia);
    definirTexto(tipo, 'data', registro.data);
    if (tipo === 'lazer') {
        definirTexto(tipo, 'atividade-outra', registro.atividadeOutra);
        definirTexto(tipo, 'duracao', registro.duracaoMin);
        const dias = new Set((registro.diasSemana ?? []).map(String));
        grupos.lazer.querySelectorAll('input[name="lazer_dias"]').forEach(input => {
            input.checked = dias.has(input.value);
        });
    }
}

// Mostra o erro de edição e impede o envio.
function bloquearEdicao(mensagem) {
    rotinaNaoEncontrada = true;
    botao.disabled = true;
    seletorTipo.disabled = true;
    aviso.textContent = '';
    informar(mensagem, true);
}

function carregarEdicao() {
    const membros = petOrigem ? buscarMembrosDaRotina(tipoInicial, petOrigem, idEdicao) : null;
    if (!membros) {
        bloquearEdicao('Rotina não encontrada.');
        return;
    }

    const registro = rotinasDoPet(membros.pets[0], tipoInicial)
        .find(item => String(item.id) === membros.ids[0]);
    if (!registro) {
        bloquearEdicao('Rotina não encontrada.');
        return;
    }

    preencherRegistro(tipoInicial, registro);
    atualizarCondicionais();

    petsAlvo = membros.pets;
    petsOrigemEdicao = membros.pets.slice();
    idsOrigemEdicao = membros.ids.slice();
    selecaoMultipla.selecionarPets(pets, petsAlvo.map(pet => pet.id));
    atualizarFormulario();
}

// ==================================================
// ENVIO
// ==================================================
function enviar(event) {
    event.preventDefault();
    if (rotinaNaoEncontrada || !petsAlvo.length) return;

    const tipo = tipoAtual();
    limparErros();
    const resultado = validarRotina(tipo, lerDados(tipo));
    if (!resultado.ok) {
        mostrarErros(tipo, resultado.erros);
        return;
    }

    botao.disabled = true;
    try {
        if (modoEdicao) {
            const salvou = editarRotina(tipo, petsOrigemEdicao, idsOrigemEdicao, petsAlvo, resultado.registro);
            if (!salvou) throw new Error('Não foi possível salvar as alterações.');
        } else {
            salvarRotina(tipo, petsAlvo, resultado.registro);
        }
    } catch (erro) {
        botao.disabled = false;
        informar(erro.message || 'Não foi possível salvar a rotina.', true);
        return;
    }

    const destino = new URL('rotina-diaria.html', location.href);
    destino.searchParams.set('petId', petsAlvo[0].id);
    location.href = destino.href;
}

// ==================================================
// INICIALIZAÇÃO
// ==================================================
async function iniciar() {
    try {
        seletorTipo.value = tipoInicial;
        mostrarTipo(tipoInicial);

        if (modoEdicao) {
            document.querySelector('#headerSection h1')?.replaceChildren('Editar rotina');
            botao.textContent = 'Salvar alterações';
            seletorTipo.disabled = true;
        }

        form.addEventListener('change', event => {
            limparErroDoCampo(event.target.closest('[data-campo]'));
            atualizarCondicionais();
        });
        form.addEventListener('input', event => {
            limparErroDoCampo(event.target.closest('[data-campo]'));
        });
        form.addEventListener('submit', enviar);
        seletorTipo.addEventListener('change', () => {
            mostrarTipo(seletorTipo.value);
            atualizarCondicionais();
            atualizarUrl(petsAlvo.length === 1 ? petsAlvo[0].id : null);
        });

        await carregarPets({ reutilizar: true });
        montarSeletorDePets();
        if (modoEdicao) carregarEdicao();
    } catch (erro) {
        botao.disabled = true;
        seletorPet.disabled = true;
        informar(erro.message || 'Não foi possível carregar os pets.', true);
    }
}

iniciar();
