// Armazenamento do módulo Pets.
// Os dados principais do pet, as vacinas e as consultas vêm do banco pela API.
// Medicações, despesas e rotina alimentar
// ainda ficam no localStorage deste navegador, guardadas pelo id do pet no banco,
// até que cada parte ganhe sua própria API.
import { listarPetsApi } from './api.js';

// Chave dos dados que continuam locais, separados por id do pet.
export const PETS_STORAGE_KEY = 'keeperhub-pets-dados-locais';
const GRUPOS_STORAGE_KEY = 'keeperhub-pets-grupos';

// Campos que pertencem ao banco e não podem ser gravados no localStorage.
const CAMPOS_DO_BANCO = new Set([
    'id', 'nome', 'especie', 'raca', 'dataNascimento',
    'peso', 'genero', 'foto', 'contatoEmergencia', 'vacinas', 'consultas'
]);

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
    }
    if (indice === -1) lista.push(normalizado);
    else lista[indice] = normalizado;
    petsDoBanco = lista;
}

// Substitui na memória as consultas devolvidas pela API (objeto { idDoPet: [consultas] }).
export function definirConsultasDoBanco(consultasPorPet, idsDoGrupo) {
    if (!petsDoBanco || !consultasPorPet) return;
    guardarGrupo('consultas', idsDoGrupo);
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

// Substitui na memória as vacinas devolvidas pela API (objeto { idDoPet: [vacinas] }).
export function definirVacinasDoBanco(vacinasPorPet, idsDoGrupo) {
    if (!petsDoBanco || !vacinasPorPet) return;
    guardarGrupo('vacinas', idsDoGrupo);
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        vacinas: Array.isArray(vacinasPorPet[pet.id]) ? vacinasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
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

function lerGrupos() {
    try {
        const grupos = JSON.parse(localStorage.getItem(GRUPOS_STORAGE_KEY) ?? '{}');
        if (grupos && typeof grupos === 'object' && !Array.isArray(grupos)) return grupos;
    } catch {
        // Os registros do banco continuam disponíveis sem o agrupamento visual.
    }
    return {};
}

// Associa somente os IDs devolvidos pelo mesmo cadastro na API.
function guardarGrupo(campo, criados) {
    if (!Array.isArray(criados) || criados.length < 2) return;
    const grupos = lerGrupos();
    const gruposDoCampo = { ...grupos[campo] };
    for (const id of criados) gruposDoCampo[id] = String(criados[0]);
    grupos[campo] = gruposDoCampo;
    try {
        localStorage.setItem(GRUPOS_STORAGE_KEY, JSON.stringify(grupos));
    } catch {
        // A gravação no servidor já terminou; o card pode aparecer separado.
    }
}

// Separa um registro editado individualmente de um cadastro feito para vários pets.
export function separarRegistrosDoGrupo(campo, ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    const grupos = lerGrupos();
    const gruposDoCampo = { ...(grupos[campo] ?? {}) };
    let alterado = false;
    for (const id of ids) {
        if (Object.hasOwn(gruposDoCampo, String(id))) {
            delete gruposDoCampo[String(id)];
            alterado = true;
        }
    }
    if (!alterado) return;
    grupos[campo] = gruposDoCampo;
    try {
        localStorage.setItem(GRUPOS_STORAGE_KEY, JSON.stringify(grupos));
    } catch {
        // O dado principal já está salvo no servidor; só perde a junção visual.
    }
}

// Junta os dados locais ao pet e aplica o agrupamento visual aos registros da API.
function combinar(pet, dadosLocais, grupos) {
    const combinado = { ...(dadosLocais[pet.id] ?? {}), ...pet };
    for (const campo of ['consultas', 'vacinas']) {
        if (!Array.isArray(pet[campo]) || !grupos[campo]) continue;
        combinado[campo] = pet[campo].map(registro => {
            const grupoId = grupos[campo][registro.id];
            return typeof grupoId === 'string' ? { ...registro, grupoId } : registro;
        });
    }
    return combinado;
}

// Retorna os pets do usuário. Lança erro se carregarPets() não tiver funcionado.
export function listarPets() {
    if (!petsDoBanco) {
        throw erroCarregamento ?? new Error('Não foi possível carregar os pets do servidor.');
    }
    const dadosLocais = lerDadosLocais();
    const grupos = lerGrupos();
    return petsDoBanco.map(pet => combinar(pet, dadosLocais, grupos));
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

    const grupos = lerGrupos();
    return ids.map(id => combinar(petsDoBanco.find(pet => pet.id === id), dadosLocais, grupos));
}

// Atualiza os dados locais de um pet, mantendo a assinatura usada pelo restante do módulo.
export function atualizarPet(id, dados) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return atualizarVariosPets({ [id]: dados })?.[0] ?? null;
}
