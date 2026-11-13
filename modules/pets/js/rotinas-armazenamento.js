/* ==========================================================================
   KEEPERHUB — MÓDULO PETS
   Arquivo: js/rotinas-armazenamento.js
   Função: persistência local das rotinas (higiene, alimentar e lazer).
   ========================================================================== */

import { atualizarVariosPets, listarPets } from './armazenamento.js';
import {
    gravarRegistroDosPets,
    registrosDoPet,
    removerRegistrosDosPets,
    salvarEdicaoRegistroLocal
} from './selecao-pets.js';
import { adicionarRefeicao, removerRefeicao, substituirRefeicao } from './rotinas.js';

export const CAMPO_ROTINA = { higiene: 'rotinaHigiene', lazer: 'rotinaLazer' };

// Campos opcionais: se o usuário limpar, o valor antigo não pode sobreviver à mesclagem.
const CAMPOS_OPCIONAIS = {
    higiene: ['observacao', 'duracaoMin', 'atividadeOutra', 'diasSemana', 'data'],
    lazer: ['observacao', 'duracaoMin', 'atividadeOutra', 'diasSemana', 'data'],
    alimentar: ['observacao']
};

export function rotinasDoPet(pet, tipo) {
    if (tipo === 'alimentar') return registrosDoPet(pet?.rotinaAlimentar, 'refeicoes');
    return registrosDoPet(pet, CAMPO_ROTINA[tipo]);
}

// Marca como undefined (descartado na serialização) todo opcional ausente no novo registro.
function limparOpcionaisAusentes(tipo, registro) {
    const resultado = { ...registro };
    for (const campo of CAMPOS_OPCIONAIS[tipo] ?? []) {
        if (!(campo in registro) || registro[campo] === undefined) resultado[campo] = undefined;
    }
    return resultado;
}

function rotinaAlimentarDe(pet) {
    return pet?.rotinaAlimentar && typeof pet.rotinaAlimentar === 'object' ? pet.rotinaAlimentar : {};
}

export function salvarRotina(tipo, pets, registro) {
    if (!Array.isArray(pets) || !pets.length || !CAMPOS_OPCIONAIS[tipo]) {
        throw new Error('Não foi possível localizar todos os pets selecionados.');
    }
    const base = { ...registro, criadaEm: registro.criadaEm ?? new Date().toISOString() };

    if (tipo !== 'alimentar') {
        gravarRegistroDosPets(pets, CAMPO_ROTINA[tipo], base);
        return;
    }

    const atuais = listarPets();
    const grupoId = pets.length > 1 ? crypto.randomUUID() : undefined;
    const atualizacoes = {};
    for (const alvo of pets) {
        const pet = atuais.find(item => item.id === alvo.id);
        if (!pet) throw new Error('Não foi possível localizar todos os pets selecionados.');
        const refeicao = { ...base, id: crypto.randomUUID(), grupoId };
        atualizacoes[pet.id] = { rotinaAlimentar: adicionarRefeicao(rotinaAlimentarDe(pet), refeicao) };
    }
    if (!atualizarVariosPets(atualizacoes)) {
        throw new Error('Não foi possível salvar a rotina alimentar.');
    }
}

export function buscarMembrosDaRotina(tipo, petId, id) {
    if (!CAMPOS_OPCIONAIS[tipo]) return null;
    const todos = listarPets();
    const pet = todos.find(item => item.id === String(petId));
    const registro = rotinasDoPet(pet, tipo).find(item => String(item.id) === String(id));
    if (!pet || !registro) return null;

    const pets = [pet];
    const ids = [String(registro.id)];
    if (registro.grupoId) {
        for (const outro of todos) {
            if (outro.id === pet.id) continue;
            const membro = rotinasDoPet(outro, tipo).find(item => item.grupoId === registro.grupoId);
            if (membro) {
                pets.push(outro);
                ids.push(String(membro.id));
            }
        }
    }
    return { pets, ids };
}

function editarAlimentar(petsOrigem, idsOrigem, petsDestino, dados) {
    const atuais = listarPets();
    const origens = new Map();
    for (let i = 0; i < idsOrigem.length; i += 1) {
        const petId = String(petsOrigem[i]?.id ?? '');
        const registroId = String(idsOrigem[i] ?? '');
        const pet = atuais.find(item => item.id === petId);
        const refeicao = rotinasDoPet(pet, 'alimentar').find(item => String(item.id) === registroId);
        if (!pet || !refeicao || origens.has(petId)) return false;
        origens.set(petId, { pet, refeicao, registroId });
    }

    const destinos = new Map();
    for (const item of petsDestino) {
        const petId = String(item?.id ?? '');
        const pet = atuais.find(atual => atual.id === petId);
        if (!pet || destinos.has(petId)) return false;
        destinos.set(petId, pet);
    }

    const modelo = origens.values().next().value;
    const grupoId = destinos.size > 1 ? crypto.randomUUID() : undefined;
    const atualizacoes = {};

    for (const [petId, origem] of origens) {
        if (destinos.has(petId)) continue;
        atualizacoes[petId] = { rotinaAlimentar: removerRefeicao(rotinaAlimentarDe(origem.pet), origem.registroId) };
    }

    for (const [petId, pet] of destinos) {
        const origem = origens.get(petId);
        const rotina = rotinaAlimentarDe(pet);
        if (origem) {
            const novos = { ...dados, criadaEm: origem.refeicao.criadaEm ?? dados.criadaEm, grupoId };
            atualizacoes[petId] = { rotinaAlimentar: substituirRefeicao(rotina, origem.registroId, novos) };
        } else {
            const nova = {
                ...modelo.refeicao,
                ...dados,
                id: crypto.randomUUID(),
                criadaEm: dados.criadaEm ?? modelo.refeicao.criadaEm,
                grupoId
            };
            atualizacoes[petId] = { rotinaAlimentar: adicionarRefeicao(rotina, nova) };
        }
    }

    return Boolean(atualizarVariosPets(atualizacoes));
}

export function editarRotina(tipo, petsOrigem, idsOrigem, petsDestino, registro) {
    if (!CAMPOS_OPCIONAIS[tipo] || !Array.isArray(petsOrigem) || !Array.isArray(idsOrigem) ||
        !Array.isArray(petsDestino) || !petsOrigem.length || !idsOrigem.length || !petsDestino.length) {
        return false;
    }
    const dados = limparOpcionaisAusentes(tipo, registro);
    if (tipo === 'alimentar') return editarAlimentar(petsOrigem, idsOrigem, petsDestino, dados);
    return salvarEdicaoRegistroLocal(petsOrigem, idsOrigem, petsDestino, CAMPO_ROTINA[tipo], dados);
}

export function removerRotina(tipo, pet, id) {
    if (!pet || !CAMPOS_OPCIONAIS[tipo]) return false;
    if (tipo !== 'alimentar') return removerRegistrosDosPets([pet], CAMPO_ROTINA[tipo], [id]);

    const atual = listarPets().find(item => item.id === String(pet.id));
    if (!atual || !rotinasDoPet(atual, 'alimentar').some(item => String(item.id) === String(id))) return false;
    const rotinaAlimentar = removerRefeicao(rotinaAlimentarDe(atual), String(id));
    return Boolean(atualizarVariosPets({ [atual.id]: { rotinaAlimentar } }));
}
