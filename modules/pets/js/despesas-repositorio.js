/* ==================================================
KEEPERHUB — MÓDULO PETS
Arquivo: despesas-repositorio.js
Lê e altera despesas por uma interface própria do módulo.
As despesas ficam no banco (tabela pet_despesa, com lançamento em Finanças)
e são gravadas pela API; a leitura usa os pets já carregados na memória.
Depende de: armazenamento.js, api.js, selecao-pets.js
Usado por: despesas.js, cadastrar-despesa.js
================================================== */

import { definirDespesasDoBanco, listarPets, separarRegistrosDoGrupo } from './armazenamento.js';
import { atualizarDespesasApi, cadastrarDespesaApi, excluirDespesasApi } from './api.js';
import { agruparRegistros } from './selecao-pets.js';

const CAMPO_DESPESAS = 'despesas';

// Normaliza uma despesa agrupada para o formato usado pelas telas.
// O valor da despesa é a soma das partes de cada pet incluído no grupo.
function normalizarDespesa(grupo) {
    const registro = grupo.membros[0]?.registro;
    if (!registro) return null;

    return {
        ...registro,
        id: String(grupo.grupoId ?? registro.id),
        valorCentavos: grupo.membros.reduce(
            (soma, { registro: membro }) => soma + Number(membro.valorCentavos || 0), 0
        ),
        petIds: grupo.membros.map(({ pet }) => String(pet.id)),
        petNome: grupo.nomesPets.join(', ')
    };
}

// Agrupa os registros de acordo com os pets associados a eles (mesmo cadastro para vários pets).
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

// Cria um lançamento para os pets selecionados (o valor total é dividido entre eles).
export async function criarDespesa(petIds, dados) {
    const ids = [...new Set((Array.isArray(petIds) ? petIds : []).map(String))];
    if (!ids.length) throw new Error('Não foi possível localizar todos os pets selecionados.');
    const resposta = await cadastrarDespesaApi({ ...dados, petIds: ids.map(Number) });
    definirDespesasDoBanco(resposta.despesas, resposta.criados);
}

// Atualiza os dados e os pets associados ao lançamento.
export async function atualizarDespesa(id, petIds, dados) {
    const grupo = localizarGrupo(listarPets(), id);
    const destino = [...new Set((Array.isArray(petIds) ? petIds : []).map(String))];
    if (!grupo || !destino.length) return false;

    const ids = grupo.membros.map(({ registro }) => String(registro.id));
    const resposta = await atualizarDespesasApi({
        ...dados,
        ids: ids.map(Number),
        petIdsOrigem: grupo.membros.map(({ pet }) => Number(pet.id)),
        petIds: destino.map(Number)
    });
    separarRegistrosDoGrupo(CAMPO_DESPESAS, ids);
    definirDespesasDoBanco(resposta.despesas, resposta.grupoIds);
    return true;
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

    const ids = membros.map(({ registro }) => String(registro.id));
    const despesas = await excluirDespesasApi(ids.map(Number));
    separarRegistrosDoGrupo(CAMPO_DESPESAS, ids);
    definirDespesasDoBanco(despesas);
    return true;
}
