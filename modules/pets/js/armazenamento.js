// Armazenamento do módulo Pets.
// Os dados principais do pet (nome, espécie, raça, nascimento, peso, gênero, foto e tutor)
// vêm do banco pela API. Consultas, vacinas, medicações, despesas e rotina alimentar
// ainda ficam no localStorage deste navegador, guardadas pelo id do pet no banco,
// até que cada parte ganhe sua própria API.
import { listarPetsApi } from './api.js';

// Chave dos dados que continuam locais, separados por id do pet.
export const PETS_STORAGE_KEY = 'keeperhub-pets-dados-locais';

// Campos que pertencem ao banco e não podem ser gravados no localStorage.
const CAMPOS_DO_BANCO = new Set([
    'id', 'nome', 'especie', 'raca', 'dataNascimento',
    'peso', 'genero', 'foto', 'contatoEmergencia'
]);

// Estado da página: pets carregados da API e o erro da última tentativa.
let petsDoBanco = null;
let erroCarregamento = null;

// Busca os pets na API e guarda na memória. Deve ser chamada antes de listar.
export async function carregarPets() {
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
    if (indice === -1) lista.push(normalizado);
    else lista[indice] = normalizado;
    petsDoBanco = lista;
}

function lerDadosLocais() {
    let conteudo;
    try {
        conteudo = localStorage.getItem(PETS_STORAGE_KEY);
    } catch {
        throw new Error('Não foi possível acessar o armazenamento deste navegador.');
    }
    if (!conteudo) return {};

    try {
        const dados = JSON.parse(conteudo);
        if (dados && typeof dados === 'object' && !Array.isArray(dados)) return dados;
    } catch {
        // Tratado abaixo.
    }
    throw new Error(
        'Não foi possível ler os dados locais dos pets. Os dados existentes foram preservados.'
    );
}

function gravarDadosLocais(dados) {
    try {
        localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(dados));
    } catch {
        throw new Error(
            'Não foi possível salvar os dados. Verifique o espaço disponível e a permissão de armazenamento do navegador.'
        );
    }
    // Avisa outras partes da aplicação que os dados dos pets mudaram.
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

function somenteCamposLocais(dados) {
    return Object.fromEntries(
        Object.entries(dados).filter(([campo]) => !CAMPOS_DO_BANCO.has(campo))
    );
}

// Junta os dados do banco com os dados locais de cada pet.
function combinar(pet, dadosLocais) {
    return { ...(dadosLocais[pet.id] ?? {}), ...pet };
}

// Retorna os pets do usuário. Lança erro se carregarPets() não tiver funcionado.
export function listarPets() {
    if (!petsDoBanco) {
        throw erroCarregamento ?? new Error('Não foi possível carregar os pets do servidor.');
    }
    const dadosLocais = lerDadosLocais();
    return petsDoBanco.map(pet => combinar(pet, dadosLocais));
}

// Busca um pet pelo identificador usado nas URLs do módulo.
export function buscarPetPorId(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return listarPets().find(pet => pet.id === id) ?? null;
}

// Atualiza os dados locais (consultas, vacinas, medicações, despesas, rotina...) de vários pets.
// Campos do banco são ignorados aqui: use as funções de js/api.js para alterá-los.
export function atualizarVariosPets(atualizacoes) {
    if (!atualizacoes || typeof atualizacoes !== 'object' || Array.isArray(atualizacoes)) {
        return null;
    }

    const ids = Object.keys(atualizacoes);
    if (!ids.length || ids.some(id => !id.trim())) return null;

    const pets = listarPets();
    if (ids.some(id => !pets.some(pet => pet.id === id))) return null;

    const dadosLocais = lerDadosLocais();
    for (const id of ids) {
        dadosLocais[id] = { ...(dadosLocais[id] ?? {}), ...somenteCamposLocais(atualizacoes[id] ?? {}) };
    }
    gravarDadosLocais(dadosLocais);

    return ids.map(id => combinar(petsDoBanco.find(pet => pet.id === id), dadosLocais));
}

// Atualiza os dados locais de um pet, mantendo a assinatura usada pelo restante do módulo.
export function atualizarPet(id, dados) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return atualizarVariosPets({ [id]: dados })?.[0] ?? null;
}
