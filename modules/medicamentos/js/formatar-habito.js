const UNIDADES_PLURAIS = new Map([
    ["vez", "vezes"],
    ["minuto", "minutos"],
    ["copo", "copos"],
    ["página", "páginas"],
    ["litro", "litros"],
    ["quilômetro", "quilômetros"],
]);

const UNIDADES_SINGULARES = new Map(
    [...UNIDADES_PLURAIS].map(([singular, plural]) => [plural, singular]),
);

export function formatarMetaHabito(meta, unidade) {
    const quantidade = Number(meta);
    const unidadeBase = String(unidade ?? "").trim().replace(/\s+por dia$/i, "");
    const unidadeFormatada = quantidade === 1
        ? UNIDADES_SINGULARES.get(unidadeBase) || unidadeBase
        : UNIDADES_PLURAIS.get(unidadeBase) || unidadeBase;
    const metaFormatada = Number.isFinite(quantidade)
        ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(quantidade)
        : String(meta);

    return `${metaFormatada} ${unidadeFormatada}`.trim();
}
