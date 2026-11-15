/* ==========================================================================
   KEEPERHUB — MÓDULO PETS
   Arquivo: js/rotinas-armazenamento.js
   Função: salvar, editar e remover as rotinas (higiene, alimentar e lazer)
   pela API, mantendo a memória da página e o agrupamento visual atualizados.
   ========================================================================== */

import {
    GRUPO_DA_ROTINA,
    carregarPets,
    definirRotinasDoBanco,
    listarPets,
    separarRegistrosDoGrupo
} from './armazenamento.js';
import { atualizarRotinasApi, cadastrarRotinaApi, excluirRotinasApi } from './api.js';
import { registrosDoPet } from './selecao-pets.js';

export const CAMPO_ROTINA = { higiene: 'rotinaHigiene', lazer: 'rotinaLazer' };

export function rotinasDoPet(pet, tipo) {
    if (tipo === 'alimentar') return registrosDoPet(pet?.rotinaAlimentar, 'refeicoes');
    return registrosDoPet(pet, CAMPO_ROTINA[tipo]);
}

// Cada resposta da API traz a foto das rotinas no momento em que foi gerada. Se duas
// gravações correm juntas (ex.: duas remoções seguidas), a resposta que chega por último
// pode ser a mais antiga; então, quando a última delas termina, a lista é recarregada.
let gravacoesEmAndamento = 0;
let houveSobreposicao = false;

async function gravarNoServidor(tipo, chamada, idsDoGrupo) {
    gravacoesEmAndamento += 1;
    if (gravacoesEmAndamento > 1) houveSobreposicao = true;
    try {
        const { rotinas, grupo } = await chamada();
        definirRotinasDoBanco(rotinas, tipo, grupo ?? idsDoGrupo);
        if (gravacoesEmAndamento === 1 && houveSobreposicao) {
            houveSobreposicao = false;
            await carregarPets();
        }
    } finally {
        gravacoesEmAndamento -= 1;
        if (gravacoesEmAndamento === 0) houveSobreposicao = false;
    }
}

function idsNumericos(lista) {
    return lista.map(item => Number(typeof item === 'object' ? item?.id : item));
}

// Cadastra a mesma rotina para um ou vários pets. Lança erro se a API recusar.
export async function salvarRotina(tipo, pets, registro) {
    if (!Array.isArray(pets) || !pets.length || !GRUPO_DA_ROTINA[tipo]) {
        throw new Error('Não foi possível localizar todos os pets selecionados.');
    }
    await gravarNoServidor(tipo, async () => {
        const resposta = await cadastrarRotinaApi({ ...registro, tipo, petIds: idsNumericos(pets) });
        return { rotinas: resposta.rotinas, grupo: resposta.criados };
    });
}

export function buscarMembrosDaRotina(tipo, petId, id) {
    if (!GRUPO_DA_ROTINA[tipo]) return null;
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

// Edita a rotina de todos os pets do grupo; pets que saem perdem o registro e pets que entram ganham um.
export async function editarRotina(tipo, petsOrigem, idsOrigem, petsDestino, registro) {
    if (!GRUPO_DA_ROTINA[tipo] || !Array.isArray(petsOrigem) || !Array.isArray(idsOrigem) ||
        !Array.isArray(petsDestino) || !petsOrigem.length || !idsOrigem.length || !petsDestino.length) {
        return false;
    }
    await gravarNoServidor(tipo, async () => {
        const resposta = await atualizarRotinasApi({
            ...registro,
            tipo,
            ids: idsNumericos(idsOrigem),
            petIdsOrigem: idsNumericos(petsOrigem),
            petIds: idsNumericos(petsDestino)
        });
        separarRegistrosDoGrupo(GRUPO_DA_ROTINA[tipo], idsOrigem.map(String));
        return { rotinas: resposta.rotinas, grupo: resposta.grupoIds };
    });
    return true;
}

// Remove a rotina só do pet informado; os outros pets do grupo continuam com ela.
export async function removerRotina(tipo, pet, id) {
    if (!pet || !GRUPO_DA_ROTINA[tipo]) return false;
    await gravarNoServidor(tipo, async () => {
        const rotinas = await excluirRotinasApi(tipo, [Number(id)]);
        separarRegistrosDoGrupo(GRUPO_DA_ROTINA[tipo], [String(id)]);
        return { rotinas };
    });
    return true;
}
