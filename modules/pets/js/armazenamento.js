// Armazenamento do módulo Pets.
// Os dados principais do pet, as vacinas, as consultas, os exames, as receitas, as medicações, as despesas,
// o orçamento mensal das despesas e as rotinas (higiene, lazer e alimentar) vêm do banco pela API.
// A observação geral da rotina alimentar ainda fica no
// localStorage deste navegador, guardada pelo id do pet no banco.
import { listarPetsApi } from './api.js';

// Chave dos dados que continuam locais, separados por id do pet.
export const PETS_STORAGE_KEY = 'keeperhub-pets-dados-locais';
const GRUPOS_STORAGE_KEY = 'keeperhub-pets-grupos';

// Campos que pertencem ao banco e não podem ser gravados no localStorage.
const CAMPOS_DO_BANCO = new Set([
    'id', 'nome', 'especie', 'raca', 'dataNascimento',
    'peso', 'genero', 'foto', 'contatoEmergencia', 'vacinas', 'consultas', 'medicacoes', 'despesas',
    'rotinaHigiene', 'rotinaLazer', 'rotinaAlimentar', 'exames', 'orcamentosDespesas', 'receitas'
]);

// Campo de cada tipo de rotina no pet e no agrupamento visual (keeperhub-pets-grupos).
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
        for (const campo of [...CAMPOS_ROTINA, 'rotinaAlimentar', 'exames', 'orcamentosDespesas', 'receitas']) {
            if (!(campo in normalizado)) normalizado[campo] = lista[indice][campo];
        }
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

// Substitui na memória as despesas devolvidas pela API (objeto { idDoPet: [despesas] }).
export function definirDespesasDoBanco(despesasPorPet, idsDoGrupo) {
    if (!petsDoBanco || !despesasPorPet) return;
    guardarGrupo('despesas', idsDoGrupo);
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        despesas: Array.isArray(despesasPorPet[pet.id]) ? despesasPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as medicações devolvidas pela API (objeto { idDoPet: [medicações] }).
export function definirMedicacoesDoBanco(medicacoesPorPet, idsDoGrupo) {
    if (!petsDoBanco || !medicacoesPorPet) return;
    guardarGrupo('medicacoes', idsDoGrupo);
    petsDoBanco = petsDoBanco.map(pet => ({
        ...pet,
        medicacoes: Array.isArray(medicacoesPorPet[pet.id]) ? medicacoesPorPet[pet.id] : []
    }));
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Substitui na memória as rotinas devolvidas pela API (objeto { idDoPet: { higiene, lazer, refeicoes } }).
// tipo indica onde guardar o agrupamento dos IDs criados ou editados juntos.
export function definirRotinasDoBanco(rotinasPorPet, tipo, idsDoGrupo) {
    if (!petsDoBanco || !rotinasPorPet) return;
    if (GRUPO_DA_ROTINA[tipo]) guardarGrupo(GRUPO_DA_ROTINA[tipo], idsDoGrupo);
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
    const local = dadosLocais[pet.id] ?? {};
    const combinado = { ...local, ...pet };
    const comGrupo = (campo, lista) => (grupos[campo]
        ? lista.map(registro => {
            // O vínculo do banco é compartilhado entre dispositivos; o localStorage
            // só serve como compatibilidade para registros antigos sem grupo salvo.
            if (registro.grupoId) return registro;
            const grupoId = grupos[campo][registro.id];
            return typeof grupoId === 'string' ? { ...registro, grupoId } : registro;
        })
        : lista);
    for (const campo of ['consultas', 'vacinas', 'medicacoes', 'despesas', ...CAMPOS_ROTINA]) {
        if (!Array.isArray(pet[campo])) continue;
        combinado[campo] = comGrupo(campo, pet[campo]);
    }
    // As refeições vêm do banco; a observação geral da rotina alimentar continua local.
    if (pet.rotinaAlimentar && typeof pet.rotinaAlimentar === 'object') {
        const alimentarLocal = local.rotinaAlimentar && typeof local.rotinaAlimentar === 'object'
            ? local.rotinaAlimentar
            : {};
        const refeicoes = Array.isArray(pet.rotinaAlimentar.refeicoes) ? pet.rotinaAlimentar.refeicoes : [];
        combinado.rotinaAlimentar = { ...alimentarLocal, refeicoes: comGrupo('refeicoes', refeicoes) };
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

// Atualiza os dados locais (rotina alimentar, orçamentos de despesas...) de vários pets.
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
