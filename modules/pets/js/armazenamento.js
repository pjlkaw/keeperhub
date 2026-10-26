import { padronizarDadosPet } from './validacao-pet.js';

// Somente este serviço conhece o localStorage; a interface usa estas operações.
export const PETS_STORAGE_KEY = 'keeperhub-pets';

function lerPets() {
    try {
        const petsSalvos = localStorage.getItem(PETS_STORAGE_KEY);
        const pets = petsSalvos ? JSON.parse(petsSalvos) : [];
        if (!Array.isArray(pets) || pets.some(pet => !pet || typeof pet !== 'object' || Array.isArray(pet))) {
            throw new Error('Formato inválido');
        }
        return pets;
    } catch {
        throw new Error('Não foi possível ler os pets salvos. Os dados existentes foram preservados. Verifique o armazenamento do navegador e tente novamente.');
    }
}

function gravarPets(pets) {
    try {
        localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(pets));
    } catch {
        throw new Error('Não foi possível salvar o pet. Verifique o espaço disponível e a permissão de armazenamento do navegador e tente novamente.');
    }
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

export function criarIdPet() {
    return crypto.randomUUID();
}

export function listarPets() {
    const pets = lerPets();
    const ids = new Set();
    let alterado = false;
    // Compatibilidade com os cadastros feitos pelo cadastroPet.js anterior.
    for (const pet of pets) {
        if (typeof pet.id !== 'string' || !pet.id || ids.has(pet.id)) {
            pet.id = criarIdPet();
            alterado = true;
        }
        ids.add(pet.id);
        const padronizado = padronizarDadosPet(pet);
        for (const campo of ['nome', 'raca', 'idade']) {
            if (pet[campo] !== padronizado[campo]) {
                pet[campo] = padronizado[campo];
                alterado = true;
            }
        }
    }
    if (alterado) gravarPets(pets);
    return pets;
}

export function cadastroPet(dados, id = criarIdPet()) {
    const pets = listarPets();
    // Uma nova tentativa do mesmo envio não cria outro registro.
    const existente = pets.find(pet => pet.id === id);
    if (existente) return existente;
    const novoPet = { ...padronizarDadosPet(dados), id, criadoEm: new Date().toISOString() };
    pets.push(novoPet);
    gravarPets(pets);
    return novoPet;
}
