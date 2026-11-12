import { atualizarVariosPets, listarPets } from './armazenamento.js';

export function criarSelecaoMultipla(seletor) {
    const campo = document.createElement('fieldset');
    campo.className = 'selecao-pets';
    campo.hidden = true;
    campo.innerHTML = '<legend>Quais pets?</legend><div class="selecao-pets__lista"></div>';
    const lista = campo.lastElementChild;
    seletor.after(campo);
    campo.addEventListener('change', () => {
        if (seletor.value === '__todos__') {
            const podeEscolherVarios = [...seletor.options].some(opcao => opcao.value === '__selecionar__');
            seletor.value = podeEscolherVarios ? '__selecionar__' : lista.querySelector(':checked')?.value ?? '';
        }
        seletor.dispatchEvent(new Event('change'));
    });

    return {
        preparar(pets, incluirTodos = false) {
            const marcados = new Set([...lista.querySelectorAll(':checked')].map(input => input.value));
            if (pets.length > 2 || (incluirTodos && pets.length > 1)) seletor.add(new Option('Todos os pets', '__todos__'));
            if (pets.length > 2) seletor.add(new Option('Selecionar vários pets…', '__selecionar__'));
            lista.replaceChildren(...pets.map(pet => {
                const opcao = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.value = pet.id;
                input.checked = marcados.has(pet.id);
                opcao.append(input, document.createTextNode(pet.nome));
                return opcao;
            }));
        },

        selecionados(pets) {
            const todos = seletor.value === '__todos__';
            campo.hidden = !todos && seletor.value !== '__selecionar__';
            if (todos) lista.querySelectorAll('input').forEach(input => { input.checked = true; });
            else if (seletor.value !== '__selecionar__') {
                lista.querySelectorAll('input').forEach(input => {
                    input.checked = input.value === seletor.value;
                });
            }
            if (!campo.hidden) {
                const ids = new Set([...lista.querySelectorAll(':checked')].map(input => input.value));
                return pets.filter(pet => ids.has(pet.id));
            }
            return pets.filter(pet => pet.id === seletor.value);
        },

        selecionarPets(pets, ids) {
            const selecionados = new Set(ids);
            lista.querySelectorAll('input').forEach(input => {
                input.checked = selecionados.has(input.value);
                input.disabled = false;
            });
            seletor.disabled = false;
            if ([...seletor.options].some(opcao => opcao.value === '__selecionar__')) {
                seletor.value = '__selecionar__';
            } else if (ids.length === pets.length && [...seletor.options].some(opcao => opcao.value === '__todos__')) {
                seletor.value = '__todos__';
            } else {
                seletor.value = ids[0] ?? '';
            }
            campo.hidden = seletor.value !== '__selecionar__';
        }
    };
}

export function registrosDoPet(pet, campo) {
    return Array.isArray(pet?.[campo])
        ? pet[campo].filter(item => item && typeof item === 'object')
        : [];
}

export function gravarRegistroDosPets(pets, campo, registro) {
    const grupoId = pets.length > 1 ? crypto.randomUUID() : undefined;
    const atualizacoes = Object.fromEntries(pets.map(pet => [
        pet.id,
        { [campo]: [...registrosDoPet(pet, campo), { ...registro, id: crypto.randomUUID(), grupoId }] }
    ]));
    if (!atualizarVariosPets(atualizacoes)) throw new Error('Não foi possível localizar todos os pets selecionados.');
}

// Atualiza um registro local e permite trocar os pets associados a ele.
export function salvarEdicaoRegistroLocal(petsOrigem, idsOrigem, petsDestino, campo, dados) {
    if (!Array.isArray(petsOrigem) || !Array.isArray(idsOrigem) ||
        !Array.isArray(petsDestino) || !petsOrigem.length || !idsOrigem.length || !petsDestino.length) {
        return false;
    }

    const petsAtuais = listarPets();
    const origens = new Map();
    for (let indice = 0; indice < idsOrigem.length; indice += 1) {
        const petId = String(petsOrigem[indice]?.id ?? '');
        const registroId = String(idsOrigem[indice] ?? '');
        const pet = petsAtuais.find(item => item.id === petId);
        const registro = registrosDoPet(pet, campo).find(item => String(item.id) === registroId);
        if (!pet || !registro || origens.has(petId) || [...origens.values()].some(item => item.registroId === registroId)) {
            return false;
        }
        origens.set(petId, { pet, registro, registroId });
    }

    const destinos = new Map();
    for (const item of petsDestino) {
        const petId = String(item?.id ?? '');
        const pet = petsAtuais.find(atual => atual.id === petId);
        if (!pet || destinos.has(petId)) return false;
        destinos.set(petId, pet);
    }

    const grupoId = destinos.size > 1 ? crypto.randomUUID() : undefined;
    const atualizacoes = {};
    for (const [petId, origem] of origens) {
        if (destinos.has(petId)) continue;
        atualizacoes[petId] = {
            [campo]: registrosDoPet(origem.pet, campo)
                .filter(registro => String(registro.id) !== origem.registroId)
        };
    }

    for (const [petId, pet] of destinos) {
        const origem = origens.get(petId);
        const lista = registrosDoPet(pet, campo);
        const registro = origem
            ? {
                ...origem.registro,
                ...dados,
                id: origem.registro.id,
                criadaEm: origem.registro.criadaEm ?? dados.criadaEm,
                grupoId
            }
            : {
                ...origens.values().next().value.registro,
                ...dados,
                id: crypto.randomUUID(),
                criadaEm: dados.criadaEm ?? origens.values().next().value.registro.criadaEm,
                grupoId
            };
        const atualizados = origem
            ? lista.map(item => String(item.id) === origem.registroId ? registro : item)
            : [...lista, registro];
        atualizacoes[petId] = { ...(atualizacoes[petId] ?? {}), [campo]: atualizados };
    }

    return Boolean(atualizarVariosPets(atualizacoes));
}

// Remove um ou mais registros locais, sem alterar os dados guardados pela API.
export function removerRegistrosDosPets(pets, campo, ids) {
    if (!Array.isArray(pets) || !Array.isArray(ids) || !pets.length || !ids.length) return false;

    const todosOsPets = listarPets();
    const idsPermitidos = new Set(pets.map(pet => String(pet.id)));
    const atualizacoes = {};
    for (const id of ids) {
        const pet = todosOsPets.find(item =>
            idsPermitidos.has(String(item.id)) &&
            registrosDoPet(item, campo).some(registro => String(registro.id) === String(id))
        );
        if (!pet) return false;
        const lista = atualizacoes[pet.id]?.[campo] ?? registrosDoPet(pet, campo);
        const restantes = lista.filter(registro => String(registro.id) !== String(id));
        atualizacoes[pet.id] = { ...(atualizacoes[pet.id] ?? {}), [campo]: restantes };
    }

    return Boolean(atualizarVariosPets(atualizacoes));
}

export function agruparRegistros(pets, registros, estado = () => '') {
    const resultado = [];
    const grupos = new Map();

    for (const pet of pets) {
        for (const registro of registros(pet)) {
            const chave = registro.grupoId ? JSON.stringify([registro.grupoId, estado(registro)]) : null;
            let grupo = chave ? grupos.get(chave) : null;
            if (!grupo) {
                grupo = { ...registro, nomesPets: [], membros: [] };
                resultado.push(grupo);
                if (chave) grupos.set(chave, grupo);
            }
            grupo.nomesPets.push(pet.nome);
            grupo.membros.push({ pet, registro });
        }
    }
    return resultado;
}
