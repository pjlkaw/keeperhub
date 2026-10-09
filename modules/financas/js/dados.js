/**
 * PROVISÓRIO: persistência local até a integração com o backend.
 * Chaves: keeperhub-financas-contas e keeperhub-financas-transacoes.
 * Listas JSON por origem e perfil do navegador, sem sincronização entre
 * dispositivos ou usuários. Limpar o armazenamento remove os registros.
 * Leitura inválida ou indisponível usa os padrões; falhas de gravação são
 * ignoradas e as alterações não têm persistência garantida.
 */
const CHAVE_CONTAS = 'keeperhub-financas-contas';
const CHAVE_TRANSACOES = 'keeperhub-financas-transacoes';

// PROVISÓRIO: contas de demonstração quando não há uma lista local válida.
const contasIniciais = [
    { id: 1, nome: 'Conta principal', tipo: 'Conta corrente' },
    { id: 2, nome: 'Poupança', tipo: 'Poupança' },
    { id: 3, nome: 'Carteira', tipo: 'Carteira' }
];

function copiar(valor) {
    return JSON.parse(JSON.stringify(valor));
}

function lerLista(chave, padrao) {
    try {
        const valor = JSON.parse(localStorage.getItem(chave));
        return Array.isArray(valor) ? valor : copiar(padrao);
    } catch {
        return copiar(padrao);
    }
}

function salvarLista(chave, itens) {
    try {
        localStorage.setItem(chave, JSON.stringify(itens));
    } catch {
        // PROVISÓRIO: sem persistência alternativa; esta gravação não foi salva.
    }
}

export const obterContas = () => lerLista(CHAVE_CONTAS, contasIniciais);
export const salvarContas = (contas) => salvarLista(CHAVE_CONTAS, contas);
export const obterTransacoes = () => lerLista(CHAVE_TRANSACOES, []);
export const salvarTransacoes = (transacoes) => salvarLista(CHAVE_TRANSACOES, transacoes);
export const proximoId = (itens) => Math.max(0, ...itens.map((item) => Number(item.id) || 0)) + 1;

export const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarData = (valor) => valor ? new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
export const lerMoeda = (valor) => Number(String(valor || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
