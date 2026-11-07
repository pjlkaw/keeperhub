// Calcula a idade exibida a partir da data de nascimento (AAAA-MM-DD).

function lerData(texto) {
    if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
    const [ano, mes, dia] = texto.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.getMonth() === mes - 1 ? data : null;
}

function plural(quantidade, singular, varios) {
    return `${quantidade} ${quantidade === 1 ? singular : varios}`;
}

// Mostra anos completos; abaixo de um ano, meses; abaixo de um mês, semanas ou dias.
export function formatarIdadePet(dataNascimento, hoje = new Date()) {
    const nascimento = lerData(dataNascimento);
    if (!nascimento) return '';

    const referencia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    if (nascimento > referencia) return '';

    let meses = (referencia.getFullYear() - nascimento.getFullYear()) * 12
        + (referencia.getMonth() - nascimento.getMonth());
    if (referencia.getDate() < nascimento.getDate()) meses -= 1;

    if (meses >= 12) return plural(Math.floor(meses / 12), 'ano', 'anos');
    if (meses >= 1) return plural(meses, 'mês', 'meses');

    const dias = Math.round((referencia - nascimento) / 86400000);
    if (dias >= 7) return plural(Math.floor(dias / 7), 'semana', 'semanas');
    if (dias >= 1) return plural(dias, 'dia', 'dias');
    return 'Recém-nascido';
}
