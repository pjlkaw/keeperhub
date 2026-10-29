// Importa a função que padroniza os dados do pet,
// por exemplo, removendo espaços desnecessários.
import { padronizarDadosPet } from './validacao-pet.js';

// Chave usada para localizar os dados dos pets no localStorage.
// Somente este arquivo acessa o armazenamento; outras partes do sistema
// usam as funções exportadas abaixo.
export const PETS_STORAGE_KEY = 'keeperhub-pets';

// Lê os pets salvos no localStorage e verifica se os dados têm o formato esperado.
function lerPets() {
    try {
        const petsSalvos = localStorage.getItem(PETS_STORAGE_KEY);

        // Se ainda não houver dados salvos, começa com uma lista vazia.
        // Caso contrário, converte o texto JSON para um valor JavaScript.
        const pets = petsSalvos ? JSON.parse(petsSalvos) : [];

        // Confirma que os dados são uma lista e que cada item é um objeto.
        // Arrays e valores nulos não são aceitos como registros de pets.
        if (
            !Array.isArray(pets) ||
            pets.some(pet => !pet || typeof pet !== 'object' || Array.isArray(pet))
        ) {
            throw new Error('Formato inválido');
        }

        return pets;
    } catch {
        // Captura erros de leitura, conversão do JSON ou formato inválido.
        // A mensagem informa que os dados existentes não foram apagados.
        throw new Error(
            'Não foi possível ler os pets salvos. Os dados existentes foram preservados. Verifique o armazenamento do navegador e tente novamente.'
        );
    }
}

// Salva a lista de pets no localStorage.
function gravarPets(pets) {
    try {
        // Converte a lista para texto JSON, pois o localStorage armazena strings.
        localStorage.setItem(PETS_STORAGE_KEY, JSON.stringify(pets));
    } catch {
        // Pode ocorrer, por exemplo, se não houver espaço disponível
        // ou se o navegador impedir o uso do armazenamento.
        throw new Error(
            'Não foi possível salvar o pet. Verifique o espaço disponível e a permissão de armazenamento do navegador e tente novamente.'
        );
    }

    // Avisa outras partes da aplicação que a lista de pets foi atualizada.
    window.dispatchEvent(new Event('keeperhub:pets-atualizados'));
}

// Cria e retorna um identificador único para um pet.
export function criarIdPet() {
    return crypto.randomUUID();
}

// Retorna a lista de pets salvos.
// Também corrige identificadores ausentes ou repetidos e padroniza alguns campos.
export function listarPets() {
    const pets = lerPets();

    // O Set permite verificar rapidamente se um identificador já apareceu.
    const ids = new Set();

    // Indica se algum registro foi alterado e precisa ser salvo novamente.
    let alterado = false;

    // Compatibilidade com cadastros feitos por uma versão anterior
    // do arquivo cadastroPet.js.
    for (const pet of pets) {
        // Se o pet não tiver um ID válido, ou se o ID estiver repetido,
        // cria um novo identificador.
        if (typeof pet.id !== 'string' || !pet.id || ids.has(pet.id)) {
            pet.id = criarIdPet();
            alterado = true;
        }

        // Registra o ID para detectar possíveis repetições nos próximos pets.
        ids.add(pet.id);

        // Cria uma versão padronizada dos dados do pet.
        const padronizado = padronizarDadosPet(pet);

        // Atualiza apenas estes campos se estiverem diferentes do padrão.
        for (const campo of ['nome', 'raca', 'idade']) {
            if (pet[campo] !== padronizado[campo]) {
                pet[campo] = padronizado[campo];
                alterado = true;
            }
        }
    }

    // Se algum registro foi corrigido, salva a lista atualizada.
    if (alterado) gravarPets(pets);

    return pets;
}

// Busca um pet pelo identificador usado nas URLs do módulo.
export function buscarPetPorId(id) {
    if (typeof id !== 'string' || !id.trim()) return null;
    return listarPets().find(pet => pet.id === id) ?? null;
}

// Atualiza somente os dados enviados, preservando identificador, data de criação
// e outros dados do registro que não pertencem a este formulário.
export function atualizarPet(id, dados) {
    if (typeof id !== 'string' || !id.trim()) return null;

    const pets = listarPets();
    const indice = pets.findIndex(pet => pet.id === id);
    if (indice === -1) return null;

    const existente = pets[indice];
    const atualizado = {
        ...existente,
        ...padronizarDadosPet({ ...existente, ...dados }),
        id: existente.id
    };

    if (Object.prototype.hasOwnProperty.call(existente, 'criadoEm')) {
        atualizado.criadoEm = existente.criadoEm;
    }

    pets[indice] = atualizado;
    gravarPets(pets);
    return atualizado;
}

// Cadastra um pet e retorna o registro criado.
// O ID pode ser informado; caso contrário, um novo é gerado.
export function cadastroPet(dados, id = criarIdPet()) {
    // Lê e prepara os pets que já estão salvos.
    const pets = listarPets();

    // Se esse ID já existir, trata a chamada como uma repetição do mesmo envio.
    // Assim, uma nova tentativa não cria um registro duplicado.
    const existente = pets.find(pet => pet.id === id);
    if (existente) return existente;

    // Padroniza os dados e acrescenta o ID e a data de criação.
    const novoPet = {
        ...padronizarDadosPet(dados),
        id,
        criadoEm: new Date().toISOString()
    };

    // Adiciona o novo pet à lista e salva a lista atualizada.
    pets.push(novoPet);
    gravarPets(pets);

    return novoPet;
}