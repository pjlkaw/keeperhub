export const ESPECIES = new Set([
    'cachorro', 'gato', 'passaro', 'cavalo', 'reptil',
    'pequeno-mamifero', 'peixe', 'animal-fazenda', 'anfibio', 'exotico'
]);

function padronizarTexto(texto) {
    if (typeof texto !== 'string') return texto;
    return texto.trim().toLocaleLowerCase('pt-BR')
        .replace(/\s+/g, ' ')
        .replace(/(^|[\s\-'’])\p{L}/gu, inicio => inicio.toLocaleUpperCase('pt-BR'));
}

export function padronizarDadosPet(dados) {
    const idade = typeof dados.idade === 'string'
        ? dados.idade.trim().replace(/^(\d+(?:[.,]\d+)?)\s*(mês|meses)$/i,
            (_, numero, unidade) => `${numero} ${unidade.toLocaleLowerCase('pt-BR') === 'mês' ? 'Mês' : 'Meses'}`)
        : dados.idade;
    return {
        ...dados,
        nome: padronizarTexto(dados.nome),
        raca: padronizarTexto(dados.raca),
        idade: idade
    };
}

// A idade atual é um campo de texto: aceita, por exemplo, 3 anos ou 6 meses.
export function validarDadosPet(dados) {
    if (!dados.nome || dados.nome.length > 60) return { campo: 'nome', mensagem: 'Informe o nome do pet (até 60 caracteres).' };
    if (!ESPECIES.has(dados.especie)) return { campo: 'tipo_animal', mensagem: 'Selecione um tipo de animal.' };
    if (!dados.raca || dados.raca.length > 80) return { campo: 'raca', mensagem: 'Informe a raça do pet (até 80 caracteres).' };
    if (!/^\d+(?:[.,]\d+)?\s*(?:anos?|meses|mês|dias?|semanas?)?$/i.test(dados.idade) || dados.idade.length > 20) {
        return { campo: 'idade', mensagem: 'Informe uma idade válida, sem valores negativos. Ex.: 3 anos ou 6 meses.' };
    }
    if (dados.peso === '' || !Number.isFinite(Number(dados.peso)) || Number(dados.peso) < 0) {
        return { campo: 'peso', mensagem: 'Informe um peso válido em quilogramas, sem valores negativos.' };
    }
    if (!['macho', 'femea'].includes(dados.genero)) return { campo: 'genero', mensagem: 'Selecione o gênero do pet.' };
    return null;
}
