import { criarIdLocal, listarRegistros, salvarRegistros } from "./armazenamento.js";
import { dataLocal } from "./dados-rotina.js";

// Inicializa formulários de hábitos, uso eventual e reposição sem chamar um servidor.
export function inicializarFormularios() {
    inicializarFormularioHabito();
    inicializarFormularioUsoEventual();
    inicializarFormularioReposicao();
    inicializarPreviaReposicao();
}

function inicializarFormularioHabito() {
    const formulario = document.querySelector(".habit-create-form");
    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const dados = new FormData(formulario);
        try {
            const habitos = listarRegistros("habitos");
            const habito = {
                id: criarIdLocal(),
                nome: String(dados.get("habit-name")).trim(),
                frequencia: String(dados.get("habit-frequency")),
                meta: String(dados.get("habit-goal")).trim(),
                unidade: String(dados.get("habit-unit")),
                conclusoes: [],
                criadoEm: new Date().toISOString(),
            };
            habitos.push(habito);
            salvarRegistros("habitos", habitos);

            // Provisório: o hábito fica salvo somente no localStorage deste navegador.
            console.log("[Medicamentos] Hábito salvo localmente (provisório):", habito);
            window.location.href = "bons-habitos.html";
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message, true);
        }
    });
}

function inicializarFormularioUsoEventual() {
    const formulario = document.querySelector("#form-register-use");
    if (!formulario) {
        return;
    }

    try {
        const seletor = formulario.querySelector("#select-medication");
        seletor.replaceChildren();
        const instrucao = document.createElement("option");
        instrucao.value = "";
        instrucao.textContent = "Selecione um medicamento";
        instrucao.disabled = true;
        instrucao.selected = true;
        seletor.append(instrucao);
        seletor.required = true;
        listarRegistros("medicamentos")
            .filter((medicamento) => medicamento.status !== "encerrado")
            .forEach((medicamento) => {
            const opcao = document.createElement("option");
            opcao.value = medicamento.id;
            opcao.textContent = [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
            seletor.append(opcao);
        });
    } catch (erro) {
        mostrarRetornoFormulario(formulario, erro.message, true);
        formulario.querySelector("#select-medication").disabled = true;
        return;
    }
    const dataUso = formulario.querySelector("#input-date");
    if (dataUso && !dataUso.value) {
        const agora = new Date();
        dataUso.value = `${dataLocal(agora)}T${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    }

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const dados = new FormData(formulario);
        const campoMedicamento = formulario.querySelector("#select-medication");
        const medicamentoSelecionado = campoMedicamento.selectedOptions[0]?.textContent;

        try {
            const usos = listarRegistros("usos");
            const uso = {
                id: criarIdLocal(),
                medicamentoId: String(dados.get("medication")),
                medicamento: medicamentoSelecionado ?? String(dados.get("medication")),
                dose: String(dados.get("dose")).trim(),
                data: String(dados.get("date")),
                observacao: String(dados.get("notes")).trim(),
                criadoEm: new Date().toISOString(),
            };
            usos.unshift(uso);
            salvarRegistros("usos", usos);

            // Provisório: o uso eventual fica salvo somente no localStorage deste navegador.
            console.log("[Medicamentos] Uso eventual salvo localmente (provisório):", uso);
            mostrarRetornoFormulario(formulario, "Uso eventual salvo neste navegador.");
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message, true);
        }
    });
}

function inicializarFormularioReposicao() {
    const formulario = document.querySelector("#form-register-refill");
    if (!formulario) {
        return;
    }

    const id = new URLSearchParams(window.location.search).get("id");
    let medicamentos = [];
    let medicamento = null;

    try {
        medicamentos = listarRegistros("medicamentos");
        medicamento = medicamentos.find((registro) => registro.id === id) ?? null;
    } catch (erro) {
        mostrarRetornoFormulario(formulario, erro.message, true);
        formulario.querySelectorAll("input, select, textarea, button").forEach((campo) => {
            campo.disabled = true;
        });
        return;
    }

    if (!medicamento) {
        mostrarRetornoFormulario(formulario, "Selecione um medicamento pela página de detalhes antes de registrar uma reposição.", true);
        formulario.querySelectorAll("input, select, textarea, button").forEach((campo) => {
            campo.disabled = true;
        });
        return;
    }

    if (medicamento) {
        const titulo = formulario.querySelector(".med-summary-name");
        const unidade = medicamento.unidade || "unidades";
        const tipo = formulario.querySelector(".med-summary-type");
        const estoque = formulario.querySelector(".med-summary-badge span");
        const quantidadeAtual = formulario.querySelector(".calc-row .calc-value");
        const novoTotal = formulario.querySelector(".calc-total-value");
        const unidadeCampo = formulario.querySelector(".input-suffix");
        if (titulo) titulo.textContent = [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
        if (tipo) tipo.textContent = medicamento.apresentacao || unidade;
        if (estoque) estoque.textContent = `Estoque atual: ${medicamento.quantidade} ${unidade}`;
        if (quantidadeAtual) quantidadeAtual.textContent = String(medicamento.quantidade);
        if (novoTotal) novoTotal.textContent = `${medicamento.quantidade} ${unidade}`;
        if (unidadeCampo) unidadeCampo.textContent = unidade;
    }
    const dataCompra = formulario.querySelector("#input-purchase-date");
    if (dataCompra && !dataCompra.value) dataCompra.value = dataLocal();

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const dados = new FormData(formulario);
        const reposicao = {
            id: criarIdLocal(),
            medicamentoId: medicamento.id,
            medicamento: formulario.querySelector(".med-summary-name")?.textContent.trim() ?? "",
            unidade: medicamento.unidade || "unidades",
            quantidade: Number(dados.get("quantity")),
            lote: String(dados.get("batch") ?? "").trim(),
            validade: String(dados.get("expiration") ?? "").trim(),
            dataCompra: String(dados.get("purchaseDate") ?? "").trim(),
            observacao: String(dados.get("notes") ?? "").trim(),
            criadoEm: new Date().toISOString(),
        };

        try {
            const reposicoes = listarRegistros("reposicoes");
            reposicoes.unshift(reposicao);
            salvarRegistros("reposicoes", reposicoes);

            medicamento.quantidade = Number(medicamento.quantidade || 0) + reposicao.quantidade;
            salvarRegistros("medicamentos", medicamentos);

            // Provisório: reposição e estoque ficam salvos somente no localStorage deste navegador.
            console.log("[Medicamentos] Reposição salva localmente (provisória):", reposicao);
            window.location.href = `detalhes-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message, true);
        }
    });
}

// Atualiza o resumo da reposição enquanto o usuário altera a quantidade.
function inicializarPreviaReposicao() {
    const quantidade = document.querySelector("#input-quantity");
    const resumo = document.querySelector(".med-calculation-card");
    if (!quantidade || !resumo) {
        return;
    }

    const valores = resumo.querySelectorAll(".calc-value");
    const estoqueAtual = Number(valores[0]?.textContent.match(/\d+/)?.[0] ?? 0);
    const novoTotal = resumo.querySelector(".calc-total-value");
    const unidade = resumo.querySelector(".input-suffix")?.textContent.trim() ??
        novoTotal?.textContent.replace(/^[\d\s+-]+/, "").trim() ??
        "";

    const atualizar = () => {
        const entrada = Math.max(0, Number(quantidade.value) || 0);
        if (valores[1]) valores[1].textContent = `+${entrada}`;
        if (novoTotal) novoTotal.textContent = `${estoqueAtual + entrada} ${unidade}`;
    };

    quantidade.addEventListener("input", atualizar);
    atualizar();
}

// Apresenta resultado ou erro sem ocultar falhas do armazenamento local.
export function mostrarRetornoFormulario(formulario, mensagem, erro = false) {
    if (!formulario) {
        console.error(mensagem);
        return;
    }

    let retorno = formulario.querySelector("#form-feedback-msg, [data-form-feedback]");
    if (!retorno) {
        retorno = document.createElement("p");
        retorno.dataset.formFeedback = "";
        retorno.setAttribute("aria-live", "polite");
        formulario.append(retorno);
    }

    retorno.textContent = mensagem;
    retorno.setAttribute("role", erro ? "alert" : "status");
    retorno.classList.add("show");
}
