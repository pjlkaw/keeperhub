/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: despesas-repositorio.js
Lê e altera despesas por uma interface própria do módulo.
Hoje usa o armazenamento local; a implementação poderá ser
substituída pela API sem mudar as telas de despesas.
Depende de: armazenamento.js, selecao-pets.js
Usado por: despesas.js, cadastrar-despesa.js
================================================== */

import { listarPets } from './armazenamento.js';
import {
    agruparRegistros,
    gravarRegistroDosPets,
    removerRegistrosDosPets,
    salvarEdicaoRegistroLocal
} from './selecao-pets.js';

const CAMPO_DESPESAS = 'despesas';

// Normaliza uma despesa agrupada para o formato usado pelas telas.
function normalizarDespesa(grupo) {
    const registro = grupo.membros[0]?.registro;
    if (!registro) return null;

    return {
        ...registro,
        id: String(grupo.grupoId ?? registro.id),
        petIds: grupo.membros.map(({ pet }) => String(pet.id)),
        petNome: grupo.nomesPets.join(', ')
    };
}

// Agrupa os registros locais de acordo com os pets associados a eles.
function agruparDespesas(pets) {
    return agruparRegistros(pets, pet =>
        Array.isArray(pet?.[CAMPO_DESPESAS])
            ? pet[CAMPO_DESPESAS].filter(registro => registro && typeof registro === 'object')
            : []
    );
}

// Encontra um lançamento pelo identificador comum da tela.
function localizarGrupo(pets, id) {
    return agruparDespesas(pets).find(grupo =>
        String(grupo.grupoId ?? grupo.membros[0]?.registro.id) === String(id)
    ) ?? null;
}

// Lista as despesas dos pets informados; sem IDs, considera todos os pets.
export async function listarDespesas(petIds) {
    const todosOsPets = listarPets();
    const filtro = Array.isArray(petIds) ? new Set(petIds.map(String)) : null;
    const pets = filtro ? todosOsPets.filter(pet => filtro.has(String(pet.id))) : todosOsPets;
    return agruparDespesas(pets).map(normalizarDespesa).filter(Boolean);
}

// Busca uma despesa incluindo todos os pets associados, independentemente do filtro atual.
export async function buscarDespesa(id) {
    const grupo = localizarGrupo(listarPets(), id);
    return grupo ? normalizarDespesa(grupo) : null;
}

// Cria um lançamento para os pets selecionados.
export async function criarDespesa(petIds, dados) {
    const ids = new Set((Array.isArray(petIds) ? petIds : []).map(String));
    const pets = listarPets().filter(pet => ids.has(String(pet.id)));
    if (!pets.length || pets.length !== ids.size) {
        throw new Error('Não foi possível localizar todos os pets selecionados.');
    }

    gravarRegistroDosPets(pets, CAMPO_DESPESAS, {
        ...dados,
        criadaEm: new Date().toISOString()
    });
}

// Atualiza os dados e os pets associados ao lançamento.
export async function atualizarDespesa(id, petIds, dados) {
    const petsAtuais = listarPets();
    const grupo = localizarGrupo(petsAtuais, id);
    const idsDestino = new Set((Array.isArray(petIds) ? petIds : []).map(String));
    const petsDestino = petsAtuais.filter(pet => idsDestino.has(String(pet.id)));
    if (!grupo || !petsDestino.length || petsDestino.length !== idsDestino.size) return false;

    return salvarEdicaoRegistroLocal(
        grupo.membros.map(({ pet }) => pet),
        grupo.membros.map(({ registro }) => registro.id),
        petsDestino,
        CAMPO_DESPESAS,
        dados
    );
}

// Remove o lançamento dos pets visíveis no filtro atual.
export async function excluirDespesa(id, petIds) {
    const grupo = localizarGrupo(listarPets(), id);
    if (!grupo) return false;

    const idsPermitidos = Array.isArray(petIds) ? new Set(petIds.map(String)) : null;
    const membros = idsPermitidos
        ? grupo.membros.filter(({ pet }) => idsPermitidos.has(String(pet.id)))
        : grupo.membros;
    if (!membros.length) return false;

    return removerRegistrosDosPets(
        membros.map(({ pet }) => pet),
        CAMPO_DESPESAS,
        membros.map(({ registro }) => registro.id)
    );
}
