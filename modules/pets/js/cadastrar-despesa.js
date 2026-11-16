/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: cadastrar-despesa.js
Carrega, valida, cadastra e edita despesas no armazenamento local.
Depende de: armazenamento.js, selecao-pets.js
Usado por: components/cadastrar-despesa.html
================================================== */

import { carregarPets, listarPets } from './armazenamento.js';
import { criarSelecaoMultipla } from './selecao-pets.js';
import { atualizarDespesa, buscarDespesa, criarDespesa } from './despesas-repositorio.js';

const parametros = new URLSearchParams(location.search);
const idEdicao = parametros.get('id');
const modoEdicao = Boolean(idEdicao);
const petOrigem = parametros.get('petId');
const todosNaOrigem = parametros.get('todos') === '1';
const mesOrigem = parametros.get('mes');

function urlDespesas(mes = mesOrigem) {
    const url = new URL('/modules/pets/components/despesas.html', location.origin);
    if (petOrigem) url.searchParams.set('petId', petOrigem);
    else url.searchParams.set('todos', '1');
    if (todosNaOrigem) url.searchParams.set('todos', '1');
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(mes || '')) url.searchParams.set('mes', mes);
    return url.href;
}

// Ajusta o retorno e os textos antes de o carregador inserir o cabeçalho.
window.keeperhubModuleConfig.backUrl = urlDespesas();
if (modoEdicao) {
    window.keeperhubModuleConfig.title = 'Editar despesa';
    window.keeperhubModuleConfig.subtitle = 'Atualize os dados deste lançamento.';
    document.title = 'Editar despesa • Pets • KeeperHub';
}

await carregarPets();

const form = document.getElementById('formulario-despesa');
const seletorPet = document.getElementById('pet-destino-despesa');
const orientacaoPet = document.getElementById('orientacao-pet-despesa');
const campoData = document.getElementById('data-despesa');
const botaoSalvar = document.getElementById('salvar-despesa');
const mensagem = document.getElementById('mensagem-despesa');
const selecaoMultipla = criarSelecaoMultipla(seletorPet);
const categorias = ['alimentacao', 'saude', 'higiene', 'lazer'];
let pets = [];
let despesaOriginal = null;
let salvando = false;

function validarData(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor || '')) return false;
    const data = new Date(valor + 'T12:00:00');
    return !Number.isNaN(data.getTime()) &&
        data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' +
        String(data.getDate()).padStart(2, '0') === valor;
}

function mensagemFormulario(texto, estado = 'informativo') {
    mensagem.textContent = texto;
    mensagem.dataset.estado = estado;
    mensagem.hidden = !texto;
    mensagem.setAttribute('role', estado === 'erro' ? 'alert' : 'status');
}

function criarCampoDataPadrao() {
    const hoje = new Date();
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(mesOrigem || '')) {
        const partes = mesOrigem.split('-').map(Number);
        if (partes[0] !== hoje.getFullYear() || partes[1] !== hoje.getMonth() + 1) {
            campoData.value = partes[0] + '-' + String(partes[1]).padStart(2, '0') + '-01';
            return;
        }
    }
    campoData.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') +
        '-' + String(hoje.getDate()).padStart(2, '0');
}

function prepararSeletor() {
    pets = listarPets();
    seletorPet.replaceChildren(new Option(
        pets.length ? 'Selecione um pet' : 'Cadastre um pet antes de registrar despesas',
        ''
    ));
    seletorPet.options[0].disabled = true;
    seletorPet.options[0].hidden = true;
    selecaoMultipla.preparar(pets, true);
    pets.forEach(pet => seletorPet.add(new Option(pet.nome, pet.id)));
    seletorPet.disabled = pets.length === 0;
    botaoSalvar.disabled = pets.length === 0;

    if (!idEdicao && petOrigem && pets.some(pet => pet.id === petOrigem)) {
        seletorPet.value = petOrigem;
    } else if (!idEdicao && pets.length === 1) {
        seletorPet.value = pets[0].id;
    }

    selecaoMultipla.selecionados(pets);
    seletorPet.addEventListener('change', () => selecaoMultipla.selecionados(pets));
}

async function preencherEdicao() {
    despesaOriginal = await buscarDespesa(idEdicao);
    if (!despesaOriginal) {
        mensagemFormulario('Não foi possível encontrar esta despesa para edição.', 'erro');
        botaoSalvar.disabled = true;
        return;
    }

    document.getElementById('descricao-despesa').value = despesaOriginal.descricao || '';
    form.elements.categoria.value = despesaOriginal.categoria || '';
    document.getElementById('valor-despesa').value =
        (Number(despesaOriginal.valorCentavos) / 100).toFixed(2);
    campoData.value = despesaOriginal.data || '';
    document.getElementById('estabelecimento-despesa').value = despesaOriginal.estabelecimento || '';
    document.getElementById('observacoes-despesa').value = despesaOriginal.observacoes || '';
    selecaoMultipla.selecionarPets(pets, despesaOriginal.petIds);
    document.querySelector('#headerSection h1')?.replaceChildren('Editar despesa');
    botaoSalvar.textContent = 'Salvar alterações';
    orientacaoPet.textContent = 'Confira ou altere os pets associados a este lançamento.';
    mensagemFormulario('');
}

function validarFormulario() {
    const descricao = form.elements.descricao.value.trim();
    const categoria = form.elements.categoria.value;
    const valor = Number(form.elements.valor.value);
    const valorCentavos = Math.round(valor * 100);
    const data = campoData.value;
    const estabelecimento = form.elements.estabelecimento.value.trim();
    const observacoes = form.elements.observacoes.value.trim();

    if (!descricao || descricao.length > 100) return { erro: 'Informe o que foi comprado ou feito.' };
    if (!categorias.includes(categoria)) return { erro: 'Escolha uma categoria para a despesa.' };
    if (!Number.isFinite(valor) || valor <= 0 || !Number.isSafeInteger(valorCentavos)) {
        return { erro: 'Informe um valor maior que zero.' };
    }
    if (!validarData(data)) return { erro: 'Informe uma data válida para o gasto.' };
    if (estabelecimento.length > 100 || observacoes.length > 500) {
        return { erro: 'Confira o limite de caracteres dos campos opcionais.' };
    }
    return { dados: { descricao, categoria, valorCentavos, data, estabelecimento, observacoes } };
}

async function salvar(event) {
    event.preventDefault();
    if (salvando) return;

    const validacao = validarFormulario();
    if (validacao.erro) {
        mensagemFormulario(validacao.erro, 'erro');
        return;
    }

    const petsDestino = selecaoMultipla.selecionados(pets);
    if (!petsDestino.length) {
        mensagemFormulario('Escolha a qual pet pertence este gasto.', 'erro');
        seletorPet.focus();
        return;
    }
    if (!form.reportValidity()) return;

    salvando = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = 'Salvando…';

    try {
        if (despesaOriginal) {
            const atualizada = await atualizarDespesa(
                despesaOriginal.id,
                petsDestino.map(pet => pet.id),
                validacao.dados
            );
            if (!atualizada) throw new Error('Não foi possível salvar as alterações desta despesa.');
        } else {
            await criarDespesa(petsDestino.map(pet => pet.id), validacao.dados);
        }

        const retornoTodos = todosNaOrigem ||
            (Boolean(petOrigem) && !petsDestino.some(pet => pet.id === petOrigem)) ||
            (!petOrigem && petsDestino.length > 1);
        const retornoPet = petOrigem || (petsDestino.length === 1 ? petsDestino[0].id : '');
        const mes = validacao.dados.data.slice(0, 7);
        const url = new URL('/modules/pets/components/despesas.html', location.origin);
        if (retornoTodos || !retornoPet) url.searchParams.set('todos', '1');
        else url.searchParams.set('petId', retornoPet);
        url.searchParams.set('mes', mes);
        url.searchParams.set('resultado', despesaOriginal ? 'atualizada' : 'criada');
        location.assign(url.href);
    } catch (erro) {
        mensagemFormulario(erro.message || 'Não foi possível salvar a despesa.', 'erro');
        salvando = false;
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = despesaOriginal ? 'Salvar alterações' : 'Salvar despesa';
    }
}

async function iniciar() {
    try {
        prepararSeletor();
        criarCampoDataPadrao();
        if (idEdicao) await preencherEdicao();
        form.addEventListener('submit', salvar);
    } catch (erro) {
        mensagemFormulario(erro.message || 'Não foi possível carregar os pets.', 'erro');
        botaoSalvar.disabled = true;
    }
}

void iniciar();
