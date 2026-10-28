// Conjunto de espécies aceitas pelo sistema.
// Um Set facilita verificar se uma espécie está nessa lista.
export const ESPECIES = new Set([
    'cachorro', 'gato', 'passaro', 'cavalo', 'reptil',
    'pequeno-mamifero', 'peixe', 'animal-fazenda', 'anfibio', 'exotico'
]);

// Padroniza um texto: remove espaços das pontas, reduz espaços repetidos
// e coloca em maiúscula a primeira letra de cada palavra.
function padronizarTexto(texto) {
    // Se o valor não for texto, devolve como está.
    if (typeof texto !== 'string') return texto;

    return texto.trim()
        // Converte o texto para minúsculas considerando as regras do português.
        .toLocaleLowerCase('pt-BR')
        // Troca sequências de espaços por apenas um espaço.
        .replace(/\s+/g, ' ')
        // Coloca em maiúscula a primeira letra e as letras depois de
        // espaços, barras invertidas, hífens ou apóstrofos.
        .replace(/(^|[\s\\'’-])\p{L}/gu, inicio =>
            inicio.toLocaleUpperCase('pt-BR')
        );
}

// Padroniza os campos de texto do cadastro do pet.
export function padronizarDadosPet(dados) {
    // Se a idade for texto, remove espaços extras e padroniza
    // "mês" ou "meses" quando aparecer depois do número.
    const idade = typeof dados.idade === 'string'
        ? dados.idade.trim().replace(
            /^(\d+(?:[.,]\d+)?)\s+(mês|meses)$/i,
            (_, numero, unidade) =>
                `${numero} ${
                    unidade.toLocaleLowerCase('pt-BR') === 'mês'
                        ? 'Mês'
                        : 'Meses'
                }`
        )
        : dados.idade;

    // Mantém os outros dados e substitui os campos padronizados.
    return {
        ...dados,
        nome: padronizarTexto(dados.nome),
        raca: padronizarTexto(dados.raca),
        idade: idade
    };
}

// Valida os dados do pet.
// Retorna informações sobre o primeiro erro encontrado.
// Se não houver erro, retorna null.
//
// A idade é um texto e pode ser informada em anos, meses, semanas ou dias.
export function validarDadosPet(dados) {
    // Verifica se o nome foi informado e se respeita o limite de caracteres.
    if (!dados.nome || dados.nome.length > 60) {
        return {
            campo: 'nome',
            mensagem: 'Informe o nome do pet (até 60 caracteres).'
        };
    }

    // Confirma que a espécie escolhida está entre as opções aceitas.
    if (!ESPECIES.has(dados.especie)) {
        return {
            campo: 'tipo_animal',
            mensagem: 'Selecione um tipo de animal.'
        };
    }

    // Verifica se a raça foi informada e se não ultrapassa 80 caracteres.
    if (!dados.raca || dados.raca.length > 80) {
        return {
            campo: 'raca',
            mensagem: 'Informe a raça do pet (até 80 caracteres).'
        };
    }

    // Aceita um número, com parte decimal opcional, seguido opcionalmente
    // por uma unidade de tempo, como "3 anos", "6 meses" ou "10 dias".
    // Também limita a idade a 20 caracteres.
    if (
        !/^\d+(?:[.,]\d+)?(?:\s+(?:anos?|meses|mês|dias?|semanas?))?$/i.test(dados.idade) ||
        dados.idade.length > 20
    ) {
        return {
            campo: 'idade',
            mensagem: 'Informe uma idade válida, sem valores negativos. Ex.: 3 anos ou 6 meses.'
        };
    }

    // Verifica se o peso foi informado, se é um número válido
    // e se não é negativo.
    if (
        dados.peso === '' ||
        !Number.isFinite(Number(dados.peso)) ||
        Number(dados.peso) < 0
    ) {
        return {
            campo: 'peso',
            mensagem: 'Informe um peso válido em quilogramas, sem valores negativos.'
        };
    }

    // Aceita somente os valores "macho" ou "femea" para o gênero.
    if (!['macho', 'femea'].includes(dados.genero)) {
        return {
            campo: 'genero',
            mensagem: 'Selecione o gênero do pet.'
        };
    }

    // Nenhuma validação falhou, então os dados são válidos.
    return null;
}