/**
 * ==========================================================================
 * KEEPERHUB — Módulo Finanças: Camada de Armazenamento Local (Offline-First)
 * Arquivo: modules/financas/js/armazenamento.js
 * Padrão: docs/padrao-js.md (Chave com prefixo do projeto)
 * ==========================================================================
 */

const STORAGE_KEY = 'keeperhub-financas:dados';

/**
 * Dados padrão para primeira execução (mock realista e pronto para uso)
 */
const DADOS_INICIAIS = {
    contas: [
        { id: 1, nome: 'Conta principal', tipo: 'Conta corrente' },
        { id: 2, nome: 'Nubank', tipo: 'Cartão' },
        { id: 3, nome: 'Reserva de emergência', tipo: 'Poupança' }
    ],
    transacoes: [
        {
            id: 1,
            tipo: 'despesa',
            valor: 150.45,
            descricao: 'Supermercado',
            categoria: 'Alimentação',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-09-24',
            hora: '14:20',
            status: 'pago'
        },
        {
            id: 2,
            tipo: 'despesa',
            valor: 24.90,
            descricao: 'Uber',
            categoria: 'Transporte',
            conta_id: 2,
            conta_nome: 'Nubank',
            data: '2026-09-24',
            hora: '09:45',
            status: 'pago'
        },
        {
            id: 3,
            tipo: 'receita',
            valor: 5430.00,
            descricao: 'Salário',
            categoria: 'Renda',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-09-23',
            hora: 'Ontem',
            status: 'pago'
        },
        {
            id: 4,
            tipo: 'despesa',
            valor: 1280.00,
            descricao: 'Compras do mês',
            categoria: 'Alimentação',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-09-15',
            status: 'pago'
        },
        {
            id: 5,
            tipo: 'despesa',
            valor: 860.00,
            descricao: 'Passe e Combustível',
            categoria: 'Transporte',
            conta_id: 2,
            conta_nome: 'Nubank',
            data: '2026-09-12',
            status: 'pago'
        },
        {
            id: 6,
            tipo: 'despesa',
            valor: 490.00,
            descricao: 'Assinaturas Streaming',
            categoria: 'Assinaturas',
            conta_id: 2,
            conta_nome: 'Nubank',
            data: '2026-09-08',
            status: 'pago'
        },
        {
            id: 7,
            tipo: 'receita',
            valor: 3050.00,
            descricao: 'Projeto Freelance',
            categoria: 'Renda',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-09-05',
            status: 'pago'
        },
        {
            id: 8,
            tipo: 'despesa',
            valor: 250.00,
            descricao: 'Internet Fibra',
            categoria: 'Moradia',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-09-30',
            vencimento: '2026-09-30',
            status: 'pendente'
        },
        {
            id: 9,
            tipo: 'despesa',
            valor: 180.00,
            descricao: 'Conta de Energia',
            categoria: 'Moradia',
            conta_id: 1,
            conta_nome: 'Conta principal',
            data: '2026-10-05',
            vencimento: '2026-10-05',
            status: 'pendente'
        }
    ]
};

/**
 * Obtém todos os dados do módulo salvos no localStorage
 */
export function obterDados() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (!salvo) {
            salvarDados(DADOS_INICIAIS);
            return JSON.parse(JSON.stringify(DADOS_INICIAIS));
        }
        return JSON.parse(salvo);
    } catch (e) {
        console.error('Erro ao ler localStorage de Finanças:', e);
        return JSON.parse(JSON.stringify(DADOS_INICIAIS));
    }
}

/**
 * Persiste todos os dados no localStorage
 */
export function salvarDados(dados) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch (e) {
        console.error('Erro ao salvar localStorage de Finanças:', e);
    }
}

/**
 * Obtém lista de transações
 */
export function obterTransacoes() {
    const dados = obterDados();
    return dados.transacoes || [];
}

/**
 * Salva uma nova transação ou atualiza existente
 */
export function salvarTransacao(transacao) {
    const dados = obterDados();
    if (transacao.id) {
        const index = dados.transacoes.findIndex((t) => t.id === Number(transacao.id));
        if (index >= 0) {
            dados.transacoes[index] = { ...dados.transacoes[index], ...transacao };
        } else {
            dados.transacoes.unshift(transacao);
        }
    } else {
        const novoId = dados.transacoes.length ? Math.max(...dados.transacoes.map((t) => t.id || 0)) + 1 : 1;
        dados.transacoes.unshift({ ...transacao, id: novoId });
    }
    salvarDados(dados);
    return transacao;
}

/**
 * Marca transação como paga
 */
export function marcarTransacaoComoPaga(id) {
    const dados = obterDados();
    const item = dados.transacoes.find((t) => t.id === Number(id));
    if (item) {
        item.status = 'pago';
        salvarDados(dados);
        return true;
    }
    return false;
}

/**
 * Exclui uma transação
 */
export function excluirTransacao(id) {
    const dados = obterDados();
    dados.transacoes = dados.transacoes.filter((t) => t.id !== Number(id));
    salvarDados(dados);
}

/**
 * Obtém lista de contas
 */
export function obterContas() {
    const dados = obterDados();
    return dados.contas || [];
}

/**
 * Salva ou atualiza uma conta
 */
export function salvarConta(conta) {
    const dados = obterDados();
    if (conta.id) {
        const index = dados.contas.findIndex((c) => c.id === Number(conta.id));
        if (index >= 0) {
            dados.contas[index] = { ...dados.contas[index], ...conta };
        } else {
            dados.contas.push(conta);
        }
    } else {
        const novoId = dados.contas.length ? Math.max(...dados.contas.map((c) => c.id || 0)) + 1 : 1;
        dados.contas.push({ ...conta, id: novoId });
    }
    salvarDados(dados);
    return conta;
}

/**
 * Exclui uma conta
 */
export function excluirConta(id) {
    const dados = obterDados();
    dados.contas = dados.contas.filter((c) => c.id !== Number(id));
    salvarDados(dados);
}

/**
 * Formatação de moeda BRL
 */
export const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Formatação de data
 */
export const formatarData = (valor) => {
    if (!valor) return '';
    const partes = String(valor).split('T')[0].split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return new Date(valor).toLocaleDateString('pt-BR');
};

/**
 * Converte string de moeda ou número para float numérico
 */
export const converterMoeda = (valor) => {
    if (typeof valor === 'number') return valor;
    const normalizado = String(valor || '')
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return Number(normalizado) || 0;
};

/**
 * Calcula resumo financeiro consolidado
 */
export function calcularResumoFinanceiro() {
    const transacoes = obterTransacoes();
    let receitas = 0;
    let despesas = 0;

    transacoes.forEach((t) => {
        const val = Number(t.valor || 0);
        if (t.tipo === 'receita') {
            receitas += val;
        } else if (t.tipo === 'despesa') {
            despesas += val;
        }
    });

    const saldo = receitas - despesas;
    const margem = receitas > 0 ? Math.max(0, Math.round((saldo / receitas) * 100)) : 0;

    return { receitas, despesas, saldo, margem };
}
