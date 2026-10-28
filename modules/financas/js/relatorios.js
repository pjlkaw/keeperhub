import { formatarMoeda, obterTransacoes } from './dados.js';

function dataValida(valor) {
    const partes = String(valor || '').split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) return null;
    return new Date(Date.UTC(partes[0], partes[1] - 1, partes[2]));
}

function mesmaCompetencia(valor, referencia) {
    const data = dataValida(valor);
    return data
        && data.getUTCFullYear() === referencia.getFullYear()
        && data.getUTCMonth() === referencia.getMonth();
}

function competencia(valor) {
    const data = dataValida(valor);
    return data ? `${data.getUTCFullYear()}-${data.getUTCMonth()}` : null;
}

function nomeMes(data, formato = 'long') {
    return data.toLocaleDateString('pt-BR', { month: formato, year: 'numeric' });
}

function somar(transacoes, tipo) {
    return transacoes
        .filter((transacao) => transacao.tipo === tipo)
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
}

function atualizarVariacao(elemento, atual, anterior) {
    const diferenca = atual - anterior;
    const percentual = anterior ? Math.round(Math.abs(diferenca) / anterior * 100) : 0;
    const sinal = diferenca >= 0 ? '+' : '-';
    const direcao = diferenca >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    elemento.replaceChildren();
    const icone = document.createElement('span');
    icone.className = `fa-solid ${direcao}`;
    icone.setAttribute('aria-hidden', 'true');
    elemento.append(icone, ` ${sinal}${percentual}% vs mês anterior`);
}

function atualizarGrafico(transacoes, referencia) {
    const meses = [];
    for (let deslocamento = 3; deslocamento >= 0; deslocamento -= 1) {
        const data = new Date(referencia.getFullYear(), referencia.getMonth() - deslocamento, 1);
        const chave = `${data.getFullYear()}-${data.getMonth()}`;
        const registros = transacoes.filter((transacao) => competencia(transacao.data) === chave);
        meses.push({
            data,
            receitas: somar(registros, 'receita'),
            despesas: somar(registros, 'despesa'),
            atual: deslocamento === 0
        });
    }

    const maiorValor = Math.max(...meses.flatMap((mes) => [mes.receitas, mes.despesas]), 1);
    const grafico = document.getElementById('report-chart');
    grafico.replaceChildren(...meses.map((mes) => {
        const item = document.createElement('li');
        const barras = document.createElement('span');
        const receita = document.createElement('i');
        const despesa = document.createElement('i');
        const receitaValor = document.createElement('b');
        const despesaValor = document.createElement('b');
        const rotulo = document.createElement('span');
        item.className = `report-month${mes.atual ? ' current' : ''}`;
        receita.className = 'income-bar';
        despesa.className = 'expense-bar';
        receita.style.height = `${mes.receitas / maiorValor * 108}px`;
        despesa.style.height = `${mes.despesas / maiorValor * 108}px`;
        receitaValor.textContent = `${(mes.receitas / 1000).toFixed(1)}k`;
        despesaValor.textContent = `${(mes.despesas / 1000).toFixed(1)}k`;
        rotulo.textContent = mes.data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        receita.append(receitaValor);
        despesa.append(despesaValor);
        barras.append(receita, despesa);
        item.append(barras, rotulo);
        return item;
    }));
}

function atualizarCategorias(transacoes, referencia) {
    const registros = transacoes.filter((transacao) =>
        transacao.tipo === 'despesa' && mesmaCompetencia(transacao.data, referencia)
    );
    const total = somar(registros, 'despesa');
    const categorias = [...registros.reduce((mapa, transacao) => {
        const categoria = transacao.categoria || 'Outros';
        mapa.set(categoria, (mapa.get(categoria) || 0) + Number(transacao.valor || 0));
        return mapa;
    }, new Map())].sort((a, b) => b[1] - a[1]);
    const lista = document.getElementById('report-spending-list');
    const cores = ['var(--tool-financas)', 'var(--tool-pets)', '#8c63e8', 'var(--text-muted)'];

    document.getElementById('report-spending-total').textContent = formatarMoeda(total);
    lista.replaceChildren(...categorias.map(([categoria, valor], indice) => {
        const item = document.createElement('li');
        const linha = document.createElement('p');
        const nome = document.createElement('b');
        const icone = document.createElement('span');
        const valorTexto = document.createElement('span');
        const percentual = document.createElement('strong');
        const barra = document.createElement('i');
        const percentualValor = total ? Math.round(valor / total * 100) : 0;
        item.style.setProperty('--category-color', cores[indice % cores.length]);
        item.style.setProperty('--category-width', `${percentualValor}%`);
        icone.className = 'fa-solid fa-circle';
        icone.setAttribute('aria-hidden', 'true');
        nome.append(icone, ` ${categoria}`);
        percentual.textContent = `${percentualValor}%`;
        valorTexto.append(formatarMoeda(valor), '  ', percentual);
        linha.append(nome, valorTexto);
        item.append(linha, barra);
        return item;
    }));
}

function atualizarInsight(transacoes, referencia) {
    const atuais = transacoes.filter((transacao) =>
        transacao.tipo === 'despesa' && mesmaCompetencia(transacao.data, referencia)
    );
    const anterior = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 1);
    const anteriores = transacoes.filter((transacao) =>
        transacao.tipo === 'despesa' && mesmaCompetencia(transacao.data, anterior)
    );
    const agrupar = (registros) => registros.reduce((mapa, transacao) => {
        const categoria = transacao.categoria || 'Outros';
        mapa.set(categoria, (mapa.get(categoria) || 0) + Number(transacao.valor || 0));
        return mapa;
    }, new Map());
    const atuaisPorCategoria = [...agrupar(atuais)].sort((a, b) => b[1] - a[1]);
    const anterioresPorCategoria = agrupar(anteriores);
    const texto = document.getElementById('report-insight-text');
    const detalhe = document.getElementById('report-insight-detail');

    if (!atuaisPorCategoria.length) {
        texto.textContent = 'Ainda não há despesas no mês atual para gerar um insight.';
        detalhe.textContent = '';
        return;
    }

    const [categoria, valorAtual] = atuaisPorCategoria[0];
    const valorAnterior = anterioresPorCategoria.get(categoria) || 0;
    const diferenca = valorAtual - valorAnterior;
    const acao = diferenca >= 0 ? 'aumentaram' : 'diminuíram';
    const percentual = valorAnterior ? Math.round(Math.abs(diferenca) / valorAnterior * 100) : 0;
    texto.textContent = `Seus gastos com ${categoria.toLowerCase()} ${acao} ${percentual}% em relação ao mês anterior.`;
    detalhe.textContent = `${diferenca >= 0 ? 'Isso representa aproximadamente ' : 'A economia foi de '}${formatarMoeda(Math.abs(diferenca))}.`;
}

function atualizarMaiorDespesa(transacoes, referencia) {
    const maior = transacoes
        .filter((transacao) => transacao.tipo === 'despesa' && mesmaCompetencia(transacao.data, referencia))
        .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];
    document.getElementById('report-largest-name').textContent = maior?.descricao || 'Nenhuma despesa';
    document.getElementById('report-largest-category').textContent = maior?.categoria
        ? `Categoria: ${maior.categoria}`
        : '';
    document.getElementById('report-largest-value').textContent = formatarMoeda(maior?.valor || 0);
}

export async function inicializarRelatorios() {
    if (!document.getElementById('report-balance')) return;

    const transacoes = await obterTransacoes();
    const seletor = document.getElementById('report-month-selector');
    const hoje = new Date();
    const mesesDisponiveis = Array.from({ length: 12 }, (_, indice) =>
        new Date(hoje.getFullYear(), hoje.getMonth() - indice, 1)
    );
    seletor.replaceChildren(...mesesDisponiveis.map((mes) => {
        const opcao = new Option(nomeMes(mes), `${mes.getFullYear()}-${mes.getMonth()}`);
        opcao.selected = indiceCompetencia(mes) === indiceCompetencia(hoje);
        return opcao;
    }));

    const renderizar = () => {
        const [ano, mes] = seletor.value.split('-').map(Number);
        const referencia = new Date(ano, mes, 1);
        const mesAtual = transacoes.filter((transacao) => mesmaCompetencia(transacao.data, referencia));
        const mesAnterior = new Date(referencia.getFullYear(), referencia.getMonth() - 1, 1);
        const registrosAnteriores = transacoes.filter((transacao) => mesmaCompetencia(transacao.data, mesAnterior));
        const receitas = somar(mesAtual, 'receita');
        const despesas = somar(mesAtual, 'despesa');
        const receitasAnteriores = somar(registrosAnteriores, 'receita');
        const despesasAnteriores = somar(registrosAnteriores, 'despesa');
        const saldo = receitas - despesas;
        const saldoAnterior = receitasAnteriores - despesasAnteriores;
        const margem = receitas ? Math.max(0, Math.round(saldo / receitas * 100)) : 0;

        document.getElementById('report-kicker').textContent = `${nomeMes(referencia)} · análise financeira`;
        document.getElementById('report-summary-title').textContent = `Resumo de ${nomeMes(referencia)}`;
        document.getElementById('report-summary-period').textContent = nomeMes(referencia, 'short');
        document.getElementById('report-income').textContent = formatarMoeda(receitas);
        document.getElementById('report-expense').textContent = formatarMoeda(despesas);
        document.getElementById('report-balance').textContent = formatarMoeda(saldo);
        document.getElementById('report-margin').textContent = `${margem}%`;
        atualizarVariacao(document.getElementById('report-income-change'), receitas, receitasAnteriores);
        atualizarVariacao(document.getElementById('report-expense-change'), despesas, despesasAnteriores);

        document.getElementById('report-comparison-title').textContent = `COMPARAÇÃO COM ${nomeMes(mesAnterior).toUpperCase()}`;
        document.getElementById('report-comparison-income').textContent = formatarMoeda(receitas - receitasAnteriores);
        document.getElementById('report-comparison-expense').textContent = formatarMoeda(despesas - despesasAnteriores);
        document.getElementById('report-comparison-balance').textContent = formatarMoeda(saldo - saldoAnterior);
        atualizarGrafico(transacoes, referencia);
        atualizarCategorias(transacoes, referencia);
        atualizarInsight(transacoes, referencia);
        atualizarMaiorDespesa(transacoes, referencia);
    };

    seletor.addEventListener('change', renderizar);
    renderizar();
}

function indiceCompetencia(data) {
    return `${data.getFullYear()}-${data.getMonth()}`;
}
