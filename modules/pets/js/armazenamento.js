// Armazenamento do módulo Pets.
// Todos os dados vêm do banco pela API: o pet, as vacinas, as consultas, os exames, as receitas,
// as medicações, as despesas, o orçamento mensal, as rotinas (higiene, lazer e alimentar) e as
// notas de comportamento. Os registros feitos para vários pets chegam com o mesmo grupoId.
// Nada do módulo fica salvo no navegador; esta camada só guarda a lista na memória da página.
import { listarPetsApi } from './api.js';

// Chaves que versões antigas gravavam neste navegador. São apagadas ao abrir o módulo.
const CHAVES_ANTIGAS = ['keeperhub-pets-dados-locais', 'keeperhub-pets-grupos'];
try {
    for (const chave of CHAVES_ANTIGAS) localStorage.removeItem(chave);
} catch {
    // Sem acesso ao navegador: não há nada para limpar.
}

// Campo de cada tipo de rotina no pet.
const CAMPOS_ROTINA = ['rotinaHigiene', 'rotinaLazer'];
export const GRUPO_DA_ROTINA = { higiene: 'rotinaHigiene', lazer: 'rotinaLazer', alimentar: 'refeicoes' };

// Estado da página: pets carregados da API e o erro da última tentativa.
let petsDoBanco = null;
let erroCarregamento = null;
let carregamentoEmAndamento = null;

// Busca os pets na API e guarda na memória. Deve ser chamada antes de listar.
// Chamadas simultâneas compartilham a mesma busca, como no cadastro unificado.
export function carregarPets({ reutilizar = false } = {}) {
    if (reutilizar && petsDoBanco) return Promise.resolve(true);
    if (!carregamentoEmAndamento) {
        carregamentoEmAndamento = buscarPetsDoServidor().finally(() => {
            carregamentoEmAndamento = null;
        });
    }
    return carregamentoEmAndamento;
}

async function buscarPetsDoServidor() {
    try {
        const pets = await listarPetsApi();
        petsDoBanco = pets.map(pet => ({ ...pet, id: String(pet.id) }));
        erroCarregamento = null;
    } catch (erro) {
        petsDoBanco = null;
        erroCarregamento = erro;
    }
    return petsDoBanco !== null;
}

// Atualiza na memória um pet devolvido pela API após cadastro ou edição.
export function definirPetDoBanco(pet) {
    if (!pet) return;
    const normalizado = { ...pet, id: String(pet.id) };
    const lista = petsDoBanco ?? [];
    const indice = lista.findIndex(item => item.id === normalizado.id);
    // As rotas de edição não devolvem vacinas e consultas; mantém as que já estão na memória.
    if (indice !== -1) {
        if (!Array.isArray(normalizado.vacinas)) normalizado.vacinas = lista[indice].vacinas;
        if (!Array.isArray(normalizado.consultas)) normalizado.consultas = lista[indice].consultas;
        if (!Array.isArray(normalizado.medicacoes)) normalizado.medicacoes = lista[indice].medicacoes;
        if (!Array.isArray(normalizado.despesas)) normalizado.despesas = lista[indice].despesas;
        for (const campo of [...CAMPOS_ROTINA, 'rotinaAlimentar', 'observacoes', 'exames', 'orcamentosDespesas', 'receitas']) {
            if (!(campo in normalizado)) normalizado[campo] = lista[indice][campo];
        }
    }
    if (indice === -1) lista.push(normalizado);
    else lista[indice] = normalizado;
    petsDoBanco = lista;
}

// Substitui na memória as consultas devolvidas pela API (objeto { idDoPet: [consultas] }).
export function definirConsultasDoBanco(consultasPorPet) {
    if (!petsDoBanco || !consultasPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        consultas: Array.isArray(consultasPorPet[pet.id]) ? consultasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Troca na memória uma consulta alterada pela API e devolve o pet atualizado.
export function definirConsultaDoBanco(consulta) {
    if (!petsDoBanco || !consulta) return null;
    let petAlterado = null;
    petsDoBanco = petsDoBanco.map(pet => {
        if (pet.id !== String(consulta.petId)) return pet;
        petAlterado = {
            ...pet,
            consultas: (pet.consultas ?? []).map(item => item.id === consulta.id ? consulta : item)
        };
        return petAlterado;
    });
    return petAlterado ? buscarPetPorId(petAlterado.id) : null;
}

// Substitui na memória as despesas devolvidas pela API (objeto { idDoPet: [despesas] }).
export function definirDespesasDoBanco(despesasPorPet) {
    if (!petsDoBanco || !despesasPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        despesas: Array.isArray(despesasPorPet[pet.id]) ? despesasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as medicações devolvidas pela API (objeto { idDoPet: [medicações] }).
export function definirMedicacoesDoBanco(medicacoesPorPet) {
    if (!petsDoBanco || !medicacoesPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        medicacoes: Array.isArray(medicacoesPorPet[pet.id]) ? medicacoesPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as rotinas devolvidas pela API (objeto { idDoPet: { higiene, lazer, refeicoes } }).
export function definirRotinasDoBanco(rotinasPorPet) {
    if (!petsDoBanco || !rotinasPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => {
        const rotinas = rotinasPorPet[pet.id] ?? {};
        return {
            ...pet,
            rotinaHigiene: Array.isArray(rotinas.higiene) ? rotinas.higiene : [],
            rotinaLazer: Array.isArray(rotinas.lazer) ? rotinas.lazer : [],
            rotinaAlimentar: { refeicoes: Array.isArray(rotinas.refeicoes) ? rotinas.refeicoes : [] }
        };
    });
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as receitas devolvidas pela API (objeto { idDoPet: [receitas] }).
export function definirReceitasDoBanco(receitasPorPet) {
    if (!petsDoBanco || !receitasPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        receitas: Array.isArray(receitasPorPet[pet.id]) ? receitasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória os orçamentos devolvidos pela API (objeto { idDoPet: { 'AAAA-MM': centavos } }).
export function definirOrcamentosDoBanco(orcamentosPorPet) {
    if (!petsDoBanco || !orcamentosPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        orcamentosDespesas: orcamentosPorPet[pet.id] && typeof orcamentosPorPet[pet.id] === 'object'
            ? orcamentosPorPet[pet.id]
            : {}
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória os exames devolvidos pela API (objeto { idDoPet: [exames] }).
export function definirExamesDoBanco(examesPorPet) {
    if (!petsDoBanco || !examesPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        exames: Array.isArray(examesPorPet[pet.id]) ? examesPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as notas de comportamento devolvidas pela API (objeto { idDoPet: [notas] }).
export function definirObservacoesDoBanco(observacoesPorPet) {
    if (!petsDoBanco || !observacoesPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        observacoes: Array.isArray(observacoesPorPet[pet.id]) ? observacoesPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as vacinas devolvidas pela API (objeto { idDoPet: [vacinas] }).
export function definirVacinasDoBanco(vacinasPorPet) {
    if (!petsDoBanco || !vacinasPorPet) return;
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        vacinas: Array.isArray(vacinasPorPet[pet.id]) ? vacinasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Retorna os pets do usuário. Lança erro se carregarPets() não tiver funcionado.
export function listarPets() {
    if (!petsDoBanco) {
        throw erroCarregamento ?? new Error('Não foi possível carregar os pets do servidor.');
    }
    return petsDoBanco.map(pet => ({ ...pet }));
}

// Busca um pet pelo identificador usado nas URLs do módulo.
export function buscarPetPorId(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return listarPets().find(pet => pet.id === id) ?? null;
}
