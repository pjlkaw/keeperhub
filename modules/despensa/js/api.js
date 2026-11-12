/* =====================================================
   KEEPERHUB — DESPENSA / API.JS

   Única porta de entrada para o banco de dados da Despensa.
   As telas chamam estas funções; elas chamam
   /api/modulos/despensa-api, que identifica o usuário
   pela sessão (cookie) e grava no MySQL.
===================================================== */

const URL_API = "/api/modulos/despensa-api";

async function requisicao(caminho = "", opcoes = {}) {
    const resposta = await fetch(`${URL_API}${caminho}`, {
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...opcoes.headers },
        ...opcoes
    });

    if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro || "Não foi possível acessar a despensa.");
    }

    return resposta.status === 204 ? null : resposta.json();
}

/* ---------- PRODUTOS ---------- */

export async function listarProdutos() {
    const { produtos } = await requisicao();
    return produtos;
}

export async function salvarProduto(dados, id = null) {
    const caminho = id ? `?id=${encodeURIComponent(id)}` : "";
    const { produto } = await requisicao(caminho, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(dados)
    });
    return produto;
}

export async function excluirProduto(id) {
    await requisicao(`?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* Produtos + lotes de medicamento (tela de Vencimentos) */
export async function listarParaVencimentos() {
    const { produtos, medicamentos } = await requisicao("?incluir=medicamentos");
    return { produtos, medicamentos: medicamentos || [] };
}

/* ---------- CHECKLIST ---------- */

const CHECKLIST = "?recurso=checklist";

export async function listarChecklist() {
    const { itens } = await requisicao(CHECKLIST);
    return itens;
}

export async function adicionarItemChecklist(dados) {
    const { item } = await requisicao(CHECKLIST, {
        method: "POST",
        body: JSON.stringify(dados)
    });
    return item;
}

export async function marcarComprado(id, comprado) {
    const { item } = await requisicao(`${CHECKLIST}&id=${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ comprado })
    });
    return item;
}

export async function removerItemChecklist(id) {
    await requisicao(`${CHECKLIST}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function limparChecklist() {
    await requisicao(CHECKLIST, { method: "DELETE" });
}

/* ---------- MEDICAMENTOS (só estoque) ---------- */

const MEDICAMENTOS = "?recurso=medicamentos";

export async function listarMedicamentos() {
    const { medicamentos } = await requisicao(MEDICAMENTOS);
    return medicamentos;
}

export async function reporMedicamento(id, quantidade, validade) {
    const { medicamento } = await requisicao(
        `${MEDICAMENTOS}&acao=repor&id=${encodeURIComponent(id)}`,
        { method: "POST", body: JSON.stringify({ quantidade, validade }) }
    );
    return medicamento;
}

export async function darBaixaMedicamento(id, quantidade) {
    const { medicamento } = await requisicao(
        `${MEDICAMENTOS}&acao=baixa&id=${encodeURIComponent(id)}`,
        { method: "POST", body: JSON.stringify({ quantidade }) }
    );
    return medicamento;
}

export async function descartarLoteMedicamento(idLote) {
    const { medicamento } = await requisicao(
        `${MEDICAMENTOS}&acao=descartar&id=${encodeURIComponent(idLote)}`,
        { method: "POST", body: JSON.stringify({}) }
    );
    return medicamento;
}
