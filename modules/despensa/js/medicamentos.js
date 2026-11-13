/* =====================================================
   KEEPERHUB — DESPENSA / MEDICAMENTOS.JS

   Estoque dos medicamentos dentro da Despensa:
   - Lista os medicamentos cadastrados no módulo Medicamentos;
   - Mostra o total e os lotes (quantidade + validade);
   - Repor (lote novo), Dar baixa (abate do lote que vence antes)
     e Descartar lote vencido.

   O cadastro (nome, dose, rotina, unidade) é feito somente
   no módulo Medicamentos.
===================================================== */

import { atualizarNoContent } from "/shared/services/no-content.js";
import { alertShared } from "/shared/services/interface.js";
import { confirmarAcao } from "./confirmar.js";
import {
    listarMedicamentos,
    reporMedicamento,
    darBaixaMedicamento,
    descartarLoteMedicamento
} from "./api.js";

const UNIDADES_INTEIRAS = [
    "comprimidos", "capsulas", "unidades", "caixa", "caixas",
    "frasco", "frascos", "cartela", "cartelas"
];

/* ELEMENTOS HTML */

const lista = document.getElementById("listaMedicamentos");
const modal = document.getElementById("modalEstoque");
const form = document.getElementById("formEstoque");
const tituloModal = document.getElementById("tituloModalEstoque");
const descricaoModal = document.getElementById("descricaoModalEstoque");
const quantidadeInput = document.getElementById("quantidadeEstoque");
const validadeInput = document.getElementById("validadeEstoque");
const campoValidade = document.getElementById("campoValidade");
const botaoSalvar = document.getElementById("salvarModalEstoque");

/* ESTADO */

let medicamentos = [];
let operacao = null; // { tipo: "repor" | "baixa", medicamento }


/* =====================================================
   UTILITÁRIOS
===================================================== */

function formatarQuantidade(valor, unidade) {
    const numero = Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return `${numero} ${unidade}`;
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

function diasAteVencer(validade) {
    if (!validade) return null;
    const [ano, mes, dia] = validade.split("-").map(Number);
    const hoje = new Date();
    const dataHoje = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return Math.round((Date.UTC(ano, mes - 1, dia) - dataHoje) / 86400000);
}

function unidadeInteira(unidade) {
    return UNIDADES_INTEIRAS.includes(String(unidade).toLowerCase());
}


/* =====================================================
   CARREGAR DO BANCO
===================================================== */

async function carregarMedicamentos() {

    try {

        medicamentos = await listarMedicamentos();

    } catch (erro) {

        console.error("Erro ao carregar medicamentos:", erro);

        alertShared(erro.message);

    }

    renderizar();

}


/* =====================================================
   RENDERIZAR
===================================================== */

function criarLote(lote, medicamento) {

    const item = document.createElement("li");
    item.className = "lote";

    const quantidade = document.createElement("span");
    quantidade.textContent = formatarQuantidade(lote.quantidade, medicamento.unidade);

    const validade = document.createElement("span");
    validade.className = "lote-validade";

    const dias = diasAteVencer(lote.validade);

    if (dias === null) {
        validade.textContent = "Sem validade";
    } else if (dias < 0) {
        validade.textContent = `Vencido em ${formatarData(lote.validade)}`;
        validade.classList.add("vencido");
    } else if (dias <= 30) {
        validade.textContent = dias === 0 ? "Vence hoje" : `Vence em ${dias} dia(s)`;
        validade.classList.add("proximo");
    } else {
        validade.textContent = `Validade ${formatarData(lote.validade)}`;
    }

    item.append(quantidade, validade);

    /* Só lotes vencidos podem ser descartados por aqui */
    if (dias !== null && dias < 0) {

        const descartar = document.createElement("button");
        descartar.type = "button";
        descartar.className = "lote-descartar";
        descartar.textContent = "Descartar";
        descartar.setAttribute("aria-label", `Descartar lote vencido de ${medicamento.nome}`);

        descartar.addEventListener("click", async () => {

            const ok = await confirmarAcao(
                `Descartar ${formatarQuantidade(lote.quantidade, medicamento.unidade)} vencidos de ${medicamento.nome}?`
            );

            if (!ok) return;

            descartar.disabled = true;

            try {
                await descartarLoteMedicamento(lote.id);
                alertShared("Lote descartado.");
            } catch (erro) {
                alertShared(erro.message);
            }

            await carregarMedicamentos();

        });

        item.append(descartar);

    }

    return item;

}

function criarCard(medicamento) {

    const card = document.createElement("article");
    card.className = "card medicamento-card";

    /* NOME + TOTAL */

    const topo = document.createElement("div");
    topo.className = "medicamento-topo";

    const nome = document.createElement("h3");
    nome.textContent = medicamento.nome;

    const total = document.createElement("span");
    total.className = "medicamento-total";
    total.textContent = formatarQuantidade(medicamento.quantidade, medicamento.unidade);

    topo.append(nome, total);

    /* LOTES */

    let lotes;

    if (medicamento.lotes.length) {
        lotes = document.createElement("ul");
        lotes.className = "lotes";
        lotes.setAttribute("aria-label", `Lotes de ${medicamento.nome}`);
        medicamento.lotes.forEach(lote => lotes.append(criarLote(lote, medicamento)));
    } else {
        lotes = document.createElement("p");
        lotes.className = "lote-vazio";
        lotes.textContent = "Sem estoque.";
    }

    /* AÇÕES */

    const acoes = document.createElement("div");
    acoes.className = "medicamento-acoes";

    const repor = document.createElement("button");
    repor.type = "button";
    repor.className = "botao-repor";
    repor.textContent = "Repor";
    repor.addEventListener("click", () => abrirModal("repor", medicamento));

    const baixa = document.createElement("button");
    baixa.type = "button";
    baixa.className = "botao-baixa";
    baixa.textContent = "Dar baixa";
    baixa.disabled = medicamento.quantidade <= 0;
    baixa.addEventListener("click", () => abrirModal("baixa", medicamento));

    acoes.append(repor, baixa);

    card.append(topo, lotes, acoes);

    return card;

}

function renderizar() {

    lista.replaceChildren();

    atualizarNoContent(medicamentos.length > 0);

    medicamentos.forEach(medicamento => lista.append(criarCard(medicamento)));

}


/* =====================================================
   MODAL REPOR / DAR BAIXA
===================================================== */

function abrirModal(tipo, medicamento) {

    operacao = { tipo, medicamento };

    form.reset();

    const inteira = unidadeInteira(medicamento.unidade);
    quantidadeInput.step = inteira ? "1" : "0.01";
    quantidadeInput.min = inteira ? "1" : "0.01";

    if (tipo === "repor") {
        tituloModal.textContent = "Repor estoque";
        descricaoModal.textContent =
            `${medicamento.nome} — quantidade em ${medicamento.unidade}.`;
        campoValidade.hidden = false;
        quantidadeInput.removeAttribute("max");
    } else {
        tituloModal.textContent = "Dar baixa";
        descricaoModal.textContent =
            `${medicamento.nome} — disponível: ${formatarQuantidade(medicamento.quantidade, medicamento.unidade)}. ` +
            "A baixa sai primeiro do lote que vence antes.";
        campoValidade.hidden = true;
        quantidadeInput.max = String(medicamento.quantidade);
    }

    modal.showModal();
    quantidadeInput.focus();

}

function fecharModal() {
    modal.close();
    operacao = null;
}

document.getElementById("fecharModalEstoque").addEventListener("click", fecharModal);
document.getElementById("cancelarModalEstoque").addEventListener("click", fecharModal);

form.addEventListener("submit", async evento => {

    evento.preventDefault();

    if (!operacao) return;

    const quantidade = Number(quantidadeInput.value);

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
        alertShared("Informe uma quantidade válida.");
        quantidadeInput.focus();
        return;
    }

    botaoSalvar.disabled = true;

    try {

        if (operacao.tipo === "repor") {
            await reporMedicamento(operacao.medicamento.id, quantidade, validadeInput.value);
            alertShared(`Estoque de ${operacao.medicamento.nome} reposto.`);
        } else {
            await darBaixaMedicamento(operacao.medicamento.id, quantidade);
            alertShared(`Baixa registrada em ${operacao.medicamento.nome}.`);
        }

        fecharModal();

        await carregarMedicamentos();

    } catch (erro) {

        alertShared(erro.message);

    } finally {

        botaoSalvar.disabled = false;

    }

});


/* =====================================================
   INICIALIZAÇÃO
===================================================== */

window.addEventListener("focus", carregarMedicamentos);

carregarMedicamentos();
