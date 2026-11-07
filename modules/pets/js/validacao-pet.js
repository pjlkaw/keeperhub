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
    // Mantém os outros dados e substitui os campos padronizados.
    return {
        ...dados,
        nome: padronizarTexto(dados.nome),
        raca: padronizarTexto(dados.raca)
    };
}

// Retorna a data de hoje no formato AAAA-MM-DD, no fuso do navegador.
export function dataDeHoje(hoje = new Date()) {
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${hoje.getFullYear()}-${mes}-${dia}`;
}

// Confere se o texto é uma data real no formato AAAA-MM-DD.
function dataValida(texto) {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const [ano, mes, dia] = texto.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

// Valida os dados do pet.
// Retorna informações sobre o primeiro erro encontrado.
// Se não houver erro, retorna null.
//
// A data de nascimento usa o formato AAAA-MM-DD do campo <input type="date">.
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

    // A data de nascimento é obrigatória, precisa ser real e não pode estar no futuro.
    if (
        !dataValida(dados.dataNascimento) ||
        dados.dataNascimento < '1900-01-01' ||
        dados.dataNascimento > dataDeHoje()
    ) {
        return {
            campo: 'data_nascimento',
            mensagem: 'Informe uma data de nascimento válida, que não esteja no futuro.'
        };
    }

    // Verifica se o peso foi informado, se é um número válido
    // e se não é negativo.
    if (
        dados.peso === '' ||
        !Number.isFinite(Number(dados.peso)) ||
        Number(dados.peso) < 0 ||
        Number(dados.peso) > 9999.99
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