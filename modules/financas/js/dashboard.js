import { formatarData, formatarMoeda, obterTransacoes } from './dados.js';

const ICONE_CATEGORIA = {
    Alimentação: 'fa-utensils',
    Transporte: 'fa-bus',
    Renda: 'fa-arrow-trend-up',
    Lazer: 'fa-gamepad',
    Assinaturas: 'fa-credit-card',
    Transferência: 'fa-right-left'
};

function dataValida(valor) {
    const partes = String(valor || '').split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) return null;
    const [ano, mes, dia] = partes;
    return new Date(Date.UTC(ano, mes - 1, dia));
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

function nomeMes(data) {
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function atualizarFluxo(transacoes, referencia) {
    const fluxo = transacoes.filter((transacao) => mesmaCompetencia(transacao.data, referencia));
    const receitas = fluxo.filter((transacao) => transacao.tipo === 'receita')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
    const despesas = fluxo.filter((transacao) => transacao.tipo === 'despesa')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
    const maiorValor = Math.max(receitas, despesas, 1);

    document.querySelector('#overview-month').textContent = nomeMes(referencia);
    document.querySelector('#overview-flow-income').textContent = formatarMoeda(receitas);
    document.querySelector('#overview-flow-expense').textContent = formatarMoeda(despesas);
    document.querySelector('.cash-flow .income-bar').style.width = `${receitas / maiorValor * 100}%`;
    document.querySelector('.cash-flow .expense-bar').style.width = `${despesas / maiorValor * 100}%`;
}

function atualizarDespesasMensais(transacoes, referencia) {
    const lista = document.querySelector('.monthly-expenses-chart');
    const meses = [];
    for (let deslocamento = 3; deslocamento >= 0; deslocamento -= 1) {
        const data = new Date(referencia.getFullYear(), referencia.getMonth() - deslocamento, 1);
        const chave = `${data.getFullYear()}-${data.getMonth()}`;
        const despesas = transacoes
            .filter((transacao) => transacao.tipo === 'despesa' && competencia(transacao.data) === chave)
            .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
        meses.push({ data, despesas, atual: deslocamento === 0 });
    }

    const maiorDespesa = Math.max(...meses.map((mes) => mes.despesas), 1);
    lista.replaceChildren(...meses.map((mes) => {
        const item = document.createElement('li');
        const valor = document.createElement('b');
        const barra = document.createElement('i');
        const rotulo = document.createElement('span');
        item.className = mes.atual ? 'current' : '';
        valor.textContent = Math.round(mes.despesas).toLocaleString('pt-BR');
        barra.style.height = `${mes.despesas / maiorDespesa * 58}px`;
        rotulo.textContent = mes.data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        item.append(valor, barra, rotulo);
        return item;
    }));
}

function atualizarCategorias(transacoes, referencia) {
    const lista = document.querySelector('.top-spending-list');
    const despesas = transacoes.filter((transacao) =>
        transacao.tipo === 'despesa' && mesmaCompetencia(transacao.data, referencia)
    );
    const total = despesas.reduce((soma, transacao) => soma + Number(transacao.valor || 0), 0);
    const categorias = [...despesas.reduce((mapa, transacao) => {
        const categoria = transacao.categoria || 'Outros';
        mapa.set(categoria, (mapa.get(categoria) || 0) + Number(transacao.valor || 0));
        return mapa;
    }, new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const cores = ['var(--tool-financas)', 'var(--tool-pets)', '#9b72f2'];
    if (!categorias.length) {
        lista.textContent = 'Nenhuma despesa no mês atual.';
        document.querySelector('.top-spending-card header span').textContent = '0 categorias';
        return;
    }
    lista.replaceChildren(...categorias.map(([categoria, valor], indice) => {
        const item = document.createElement('li');
        const linha = document.createElement('p');
        const icone = document.createElement('i');
        const nome = document.createElement('b');
        const valorElemento = document.createElement('strong');
        const percentual = document.createElement('small');
        const barra = document.createElement('span');
        const percentualValor = total ? Math.round(valor / total * 100) : 0;
        item.style.setProperty('--spending-color', cores[indice]);
        item.style.setProperty('--spending-width', `${percentualValor}%`);
        icone.className = `fa-solid ${ICONE_CATEGORIA[categoria] || 'fa-receipt'}`;
        icone.setAttribute('aria-hidden', 'true');
        nome.textContent = categoria;
        valorElemento.textContent = formatarMoeda(valor);
        percentual.textContent = `${percentualValor}%`;
        valorElemento.append(' ', percentual);
        linha.append(icone, nome, valorElemento);
        item.append(linha, barra);
        return item;
    }));
    document.querySelector('.top-spending-card header span').textContent = `${categorias.length} categorias`;
}

function atualizarRecentes(transacoes) {
    const lista = document.querySelector('.recent-transactions-list');
    const recentes = [...transacoes]
        .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || Number(b.id) - Number(a.id))
        .slice(0, 3);

    if (!recentes.length) {
        lista.textContent = 'Nenhuma transação cadastrada.';
        return;
    }

    lista.replaceChildren(...recentes.map((transacao) => {
        const link = document.createElement('a');
        const icone = document.createElement('i');
        const detalhes = document.createElement('span');
        const titulo = document.createElement('b');
        const subtitulo = document.createElement('small');
        const valor = document.createElement('strong');
        const data = document.createElement('small');
        const despesa = transacao.tipo === 'despesa';
        link.href = 'components/transacoes.html';
        link.className = despesa ? '' : 'income';
        icone.className = `fa-solid ${despesa ? 'fa-receipt' : 'fa-arrow-up'}`;
        icone.setAttribute('aria-hidden', 'true');
        titulo.textContent = transacao.descricao || 'Sem descrição';
        subtitulo.textContent = [transacao.categoria, formatarData(transacao.data)].filter(Boolean).join(' · ');
        valor.textContent = `${despesa ? '- ' : '+ '}${formatarMoeda(transacao.valor)}`;
        data.textContent = formatarData(transacao.data);
        detalhes.append(titulo, subtitulo);
        valor.append(data);
        link.append(icone, detalhes, valor);
        return link;
    }));
}

export async function inicializarDashboard() {
    if (!document.querySelector('.preview-balance')) return;

    const transacoes = await obterTransacoes();
    const referencia = new Date();
    const receitas = transacoes.filter((transacao) => transacao.tipo === 'receita')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);
    const despesas = transacoes.filter((transacao) => transacao.tipo === 'despesa')
        .reduce((total, transacao) => total + Number(transacao.valor || 0), 0);

    document.querySelector('.preview-balance output').textContent = formatarMoeda(receitas - despesas);
    document.querySelector('#overview-income').textContent = formatarMoeda(receitas);
    document.querySelector('#overview-expense').textContent = formatarMoeda(despesas);
    document.querySelector('.preview-balance mark').textContent = transacoes.length ? 'Dados atualizados' : 'Sem transações';
    atualizarFluxo(transacoes, referencia);
    atualizarDespesasMensais(transacoes, referencia);
    atualizarCategorias(transacoes, referencia);
    atualizarRecentes(transacoes);
}
