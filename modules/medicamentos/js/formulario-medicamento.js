import { criarIdLocal, listarRegistros, salvarRegistros } from "./armazenamento.js";
import { mostrarRetornoFormulario } from "./formularios.js";

// Controla campos condicionais e horários do cadastro e da edição de medicamentos.
export function inicializarFormularioMedicamento() {
    const formulario = document.querySelector("#form-add-medication, #form-edit-medication");
    const frequencia = formulario?.querySelector("#select-med-frequency");
    const uso = formulario?.querySelectorAll('input[name="usageType"]');
    const listaHorarios = formulario?.querySelector("#times-list");
    const botaoAdicionarHorario = formulario?.querySelector("#btn-add-time");

    if (!formulario || (!frequencia && (!uso || uso.length === 0) && !listaHorarios)) {
        return;
    }

    configurarNomesCampos(formulario);
    const idEdicao = formulario.id === "form-edit-medication"
        ? new URLSearchParams(window.location.search).get("id")
        : null;
    if (formulario.id === "form-edit-medication" && !idEdicao) {
        mostrarRetornoFormulario(formulario, "Não foi informado qual medicamento deve ser editado.", true);
        desabilitarFormulario(formulario);
        return;
    }
    const medicamentoEditado = idEdicao ? carregarMedicamentoParaEdicao(formulario, idEdicao) : null;

    if (idEdicao && !medicamentoEditado) {
        desabilitarFormulario(formulario);
        return;
    }

    if (!medicamentoEditado) {
        const alertaEstoque = formulario.querySelector("#checkbox-stock-alert");
        const lembretes = formulario.querySelector("#checkbox-reminders");
        if (alertaEstoque) alertaEstoque.checked = true;
        if (lembretes) lembretes.checked = true;
    }

    const atualizarCampos = () => {
        const tipoUso = formulario.querySelector('input[name="usageType"]:checked')?.value;
        const usoEventual = tipoUso === "eventual";

        definirVisibilidade(formulario.querySelector("#field-start-date"), !usoEventual);
        definirVisibilidade(formulario.querySelector("#field-end-date"), tipoUso === "temporario");
        definirVisibilidade(formulario.querySelector("#msg-eventual-use"), usoEventual);
        definirVisibilidade(formulario.querySelector("#section-routine"), !usoEventual);

        formulario.querySelectorAll(".meds-usage-option").forEach((opcao) => {
            opcao.classList.toggle("active", opcao.querySelector("input")?.checked ?? false);
        });

        const tipoFrequencia = frequencia?.value;
        definirVisibilidade(formulario.querySelector("#field-frequency-interval"), tipoFrequencia === "intervalo");
        definirVisibilidade(formulario.querySelector("#field-frequency-days"), tipoFrequencia === "especifico");
        definirVisibilidade(formulario.querySelector("#section-times"), !usoEventual && tipoFrequencia !== "intervalo");
        const intervalo = formulario.querySelector("#input-frequency-interval");
        if (intervalo) {
            intervalo.required = tipoFrequencia === "intervalo";
        }
        definirVisibilidade(
            formulario.querySelector("#field-stock-alert-threshold"),
            formulario.querySelector("#checkbox-stock-alert")?.checked ?? false,
        );

        atualizarListaHorarios(listaHorarios);
        atualizarBotaoCadastro(formulario);
    };

    uso?.forEach((campo) => campo.addEventListener("change", atualizarCampos));
    frequencia?.addEventListener("change", atualizarCampos);
    formulario.querySelector("#checkbox-stock-alert")?.addEventListener("change", atualizarCampos);
    formulario.addEventListener("input", () => atualizarBotaoCadastro(formulario));
    formulario.addEventListener("change", () => atualizarBotaoCadastro(formulario));

    botaoAdicionarHorario?.addEventListener("click", () => {
        if (!listaHorarios) {
            return;
        }

        const linha = document.createElement("div");
        linha.className = "meds-time-row";

        const campoHorario = document.createElement("input");
        campoHorario.type = "time";
        campoHorario.className = "meds-form-input";
        campoHorario.name = "times";

        const botaoRemover = document.createElement("button");
        botaoRemover.type = "button";
        botaoRemover.className = "btn-meds-remove-time";
        botaoRemover.setAttribute("aria-label", "Remover horário");
        botaoRemover.title = "Remover horário";
        botaoRemover.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        botaoRemover.addEventListener("click", () => {
            linha.remove();
            atualizarListaHorarios(listaHorarios);
        });

        linha.append(campoHorario, botaoRemover);
        listaHorarios.append(linha);
        atualizarListaHorarios(listaHorarios);
        campoHorario.focus();
    });

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const dados = new FormData(formulario);
        const medicamento = {
            ...(medicamentoEditado ?? {}),
            id: medicamentoEditado?.id ?? criarIdLocal(),
            nome: String(dados.get("medName")).trim(),
            concentracao: String(dados.get("concentration") ?? "").trim(),
            apresentacao: String(dados.get("presentation")),
            tipoUso: String(dados.get("usageType")),
            dataInicio: String(dados.get("startDate") ?? ""),
            dataFim: formulario.querySelector("#input-end-date")
                ? String(dados.get("endDate") ?? "")
                : medicamentoEditado?.dataFim ?? "",
            dose: String(dados.get("dose") ?? "").trim(),
            frequencia: String(dados.get("frequency") ?? "diario"),
            intervaloHoras: String(dados.get("intervalHours") ?? ""),
            dias: formulario.querySelectorAll('input[name="weekdays"]').length
                ? dados.getAll("weekdays").map(String)
                : medicamentoEditado?.dias ?? [],
            horarios: dados.getAll("times").map(String).filter(Boolean),
            quantidade: Number(dados.get("stockQty") || 0),
            unidade: String(dados.get("stockUnit") ?? ""),
            alertaEstoque: formulario.querySelector("#checkbox-stock-alert")
                ? dados.has("stockAlert")
                : medicamentoEditado?.alertaEstoque ?? false,
            limiteEstoque: formulario.querySelector("#input-stock-threshold")
                ? Number(dados.get("stockThreshold") || 0)
                : medicamentoEditado?.limiteEstoque ?? 0,
            validade: String(dados.get("expirationDate") ?? ""),
            lembretes: formulario.querySelector("#checkbox-reminders")
                ? dados.has("enableReminders")
                : medicamentoEditado?.lembretes ?? false,
            status: medicamentoEditado?.status ?? "ativo",
            criadoEm: medicamentoEditado?.criadoEm ?? new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
        };

        try {
            const medicamentos = listarRegistros("medicamentos");
            if (medicamentoEditado) {
                const indice = medicamentos.findIndex((item) => item.id === medicamentoEditado.id);
                if (indice < 0) {
                    throw new Error("O medicamento deixou de existir no armazenamento local. Recarregue a página.");
                }
                medicamentos[indice] = medicamento;
            } else {
                medicamentos.push(medicamento);
            }
            salvarRegistros("medicamentos", medicamentos);

            // Provisório: cadastro e edições são mantidos apenas no localStorage deste navegador.
            console.log("[Medicamentos] Medicamento salvo localmente (provisório):", medicamento);
            window.location.href = medicamentoEditado
                ? `/modules/medicamentos/components/detalhes-medicamento.html?id=${encodeURIComponent(medicamento.id)}`
                : "/modules/medicamentos/components/medicacoes.html";
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message, true);
        }
    });

    atualizarCampos();
}

function carregarMedicamentoParaEdicao(formulario, id) {
    try {
        const medicamento = listarRegistros("medicamentos").find((item) => item.id === id);
        if (!medicamento) {
            mostrarRetornoFormulario(formulario, "O medicamento não foi encontrado neste navegador.", true);
            return null;
        }

        preencherCampo(formulario, "#input-med-name", medicamento.nome);
        preencherCampo(formulario, "#input-med-concentration", medicamento.concentracao);
        preencherCampo(formulario, "#select-med-presentation", medicamento.apresentacao);
        preencherCampo(formulario, "#input-start-date", medicamento.dataInicio);
        preencherCampo(formulario, "#input-end-date", medicamento.dataFim);
        preencherCampo(formulario, "#input-med-dose", medicamento.dose);
        preencherCampo(formulario, "#select-med-frequency", medicamento.frequencia);
        preencherCampo(formulario, "#input-frequency-interval", medicamento.intervaloHoras);
        preencherCampo(formulario, "#input-stock-qty", medicamento.quantidade);
        preencherCampo(formulario, "#select-stock-unit", medicamento.unidade);
        preencherCampo(formulario, "#input-stock-threshold", medicamento.limiteEstoque);
        preencherCampo(formulario, "#input-expiration-date", medicamento.validade);

        formulario.querySelectorAll('input[name="usageType"]').forEach((campo) => {
            campo.checked = campo.value === medicamento.tipoUso;
        });
        formulario.querySelectorAll('input[name="weekdays"]').forEach((campo) => {
            campo.checked = medicamento.dias?.includes(campo.value) ?? false;
        });
        const estoque = formulario.querySelector("#checkbox-stock-alert");
        const lembretes = formulario.querySelector("#checkbox-reminders");
        if (estoque) estoque.checked = medicamento.alertaEstoque ?? true;
        if (lembretes) lembretes.checked = medicamento.lembretes ?? true;

        const lista = formulario.querySelector("#times-list, .meds-times-list");
        const horarios = medicamento.horarios ?? [];
        const camposHorario = Array.from(lista?.querySelectorAll('input[type="time"]') ?? []);
        horarios.forEach((horario, indice) => {
            if (camposHorario[indice]) {
                camposHorario[indice].value = horario;
                camposHorario[indice].name = "times";
            } else {
                adicionarHorarioEdicao(lista, horario);
            }
        });
        camposHorario.slice(horarios.length).forEach((campo) => campo.closest(".meds-time-row")?.remove());

        return medicamento;
    } catch (erro) {
        mostrarRetornoFormulario(formulario, erro.message, true);
        return null;
    }
}

function configurarNomesCampos(formulario) {
    const campos = {
        "#input-med-name": "medName",
        "#input-med-concentration": "concentration",
        "#select-med-presentation": "presentation",
        "#input-start-date": "startDate",
        "#input-end-date": "endDate",
        "#input-med-dose": "dose",
        "#select-med-frequency": "frequency",
        "#input-frequency-interval": "intervalHours",
        "#input-stock-qty": "stockQty",
        "#select-stock-unit": "stockUnit",
        "#input-stock-threshold": "stockThreshold",
        "#input-expiration-date": "expirationDate",
    };
    Object.entries(campos).forEach(([seletor, nome]) => {
        const campo = formulario.querySelector(seletor);
        if (campo) campo.name = nome;
    });
    formulario.querySelectorAll("#times-list input[type='time'], .meds-times-list input[type='time']").forEach((campo) => {
        campo.name = "times";
    });
    const estoque = formulario.querySelector("#checkbox-stock-alert");
    const lembretes = formulario.querySelector("#checkbox-reminders");
    if (estoque) estoque.name = "stockAlert";
    if (lembretes) lembretes.name = "enableReminders";
}

function desabilitarFormulario(formulario) {
    formulario.querySelectorAll("input, select, textarea, button").forEach((campo) => {
        campo.disabled = true;
    });
}

function preencherCampo(formulario, seletor, valor) {
    const campo = formulario.querySelector(seletor);
    if (campo && valor !== undefined && valor !== null) {
        campo.value = String(valor);
    }
}

function adicionarHorarioEdicao(lista, valor) {
    if (!lista) {
        return;
    }

    const linha = document.createElement("div");
    linha.className = "meds-time-row";
    const campo = document.createElement("input");
    campo.type = "time";
    campo.name = "times";
    campo.value = valor;
    campo.className = "meds-form-input";
    linha.append(campo);
    lista.append(linha);
}

function definirVisibilidade(elemento, visivel) {
    if (elemento) {
        elemento.style.display = visivel ? "" : "none";
    }
}

function atualizarBotaoCadastro(formulario) {
    const botao = formulario.querySelector("#btn-submit-medication");
    const nome = formulario.querySelector("#input-med-name");
    const apresentacao = formulario.querySelector("#select-med-presentation");

    if (botao && nome && apresentacao) {
        botao.disabled = !nome.value.trim() || !apresentacao.value;
    }
}

function atualizarListaHorarios(listaHorarios) {
    if (!listaHorarios) {
        return;
    }

    const linhas = listaHorarios.querySelectorAll(".meds-time-row");
    linhas.forEach((linha, indice) => {
        const campo = linha.querySelector('input[type="time"]');
        const botaoRemover = linha.querySelector(".btn-meds-remove-time");

        if (campo) {
            campo.name = "times";
            campo.setAttribute("aria-label", `Horário ${indice + 1}`);
        }
        if (botaoRemover) {
            botaoRemover.style.display = linhas.length > 1 ? "" : "none";
        }
    });
}
