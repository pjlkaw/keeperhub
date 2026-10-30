import { buscarMedicamentoApi, salvarMedicamentoApi } from "./api.js";
import { mostrarRetornoFormulario } from "./formularios.js";

// Controla campos condicionais e horários do cadastro e da edição de medicamentos.
export async function inicializarFormularioMedicamento() {
    const formulario = document.querySelector("#form-add-medication, #form-edit-medication");
    const frequencia = formulario?.querySelector("#select-med-frequency");
    const uso = formulario?.querySelectorAll('input[name="usageType"]');
    const listaHorarios = formulario?.querySelector("#times-list");
    const botaoAdicionarHorario = formulario?.querySelector("#btn-add-time");
    const camposTemporarios = formulario?.querySelector("#temporary-treatment-fields");
    const conteudoOpcional = formulario?.querySelector("#section-optional-content");
    const datasTratamento = formulario?.querySelector("#section-treatment-dates");
    const rotina = formulario?.querySelector("#section-routine");
    const estoqueOpcional = formulario?.querySelector("#section-stock-details");

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
    const medicamentoEditado = idEdicao
        ? await carregarMedicamentoParaEdicao(formulario, idEdicao)
        : null;

    if (idEdicao && !medicamentoEditado) {
        desabilitarFormulario(formulario);
        return;
    }

    const atualizarCampos = () => {
        const tipoUso = formulario.querySelector('input[name="usageType"]:checked')?.value;
        const usoEventual = tipoUso === "eventual";
        const usoTemporario = tipoUso === "temporario";

        definirVisibilidade(formulario.querySelector("#field-start-date"), !usoEventual);
        definirVisibilidade(formulario.querySelector("#field-end-date"), usoTemporario);
        definirVisibilidade(formulario.querySelector("#msg-eventual-use"), usoEventual);
        definirVisibilidade(formulario.querySelector("#section-routine"), !usoEventual);

        if (camposTemporarios && conteudoOpcional && datasTratamento && rotina && estoqueOpcional) {
            if (usoTemporario) {
                camposTemporarios.append(datasTratamento, rotina);
                camposTemporarios.hidden = false;
            } else {
                conteudoOpcional.insertBefore(datasTratamento, estoqueOpcional);
                conteudoOpcional.insertBefore(rotina, estoqueOpcional);
                camposTemporarios.hidden = true;
            }
        }

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
        atualizarListaHorarios(listaHorarios);
        atualizarBotaoCadastro(formulario);
    };

    uso?.forEach((campo) => campo.addEventListener("change", () => {
        atualizarCampos();
    }));
    frequencia?.addEventListener("change", atualizarCampos);
    formulario.addEventListener("input", (evento) => {
        if (evento.target instanceof HTMLInputElement && evento.target.matches(".meds-time-input")) {
            formatarEntradaHorario(evento.target);
        }
        atualizarBotaoCadastro(formulario);
    });
    formulario.addEventListener("change", () => atualizarBotaoCadastro(formulario));

    botaoAdicionarHorario?.addEventListener("click", () => {
        if (!listaHorarios) {
            return;
        }

        const linha = document.createElement("div");
        linha.className = "meds-time-row";

        const campoHorario = document.createElement("input");
        configurarCampoHorario(campoHorario);
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

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const dados = new FormData(formulario);
        const medicamento = {
            id: medicamentoEditado?.id,
            nome: String(dados.get("medName")).trim(),
            concentracao: String(dados.get("concentration") ?? "").trim(),
            tipoUso: String(dados.get("usageType")),
            dataInicio: String(dados.get("startDate") ?? ""),
            dataFim: formulario.querySelector("#input-end-date")
                ? String(dados.get("endDate") ?? "")
                : medicamentoEditado?.dataFim ?? "",
            dose: String(dados.get("dose") ?? "").trim(),
            frequencia: String(dados.get("frequency") ?? "diario"),
            intervaloHoras: formulario.querySelector("#input-frequency-interval")
                ? String(dados.get("intervalHours") ?? "")
                : medicamentoEditado?.intervaloHoras ?? "",
            dias: formulario.querySelectorAll('input[name="weekdays"]').length
                ? dados.getAll("weekdays").map(String)
                : medicamentoEditado?.dias ?? [],
            horarios: dados.getAll("times").map(String).filter(Boolean),
            quantidade: Number(dados.get("stockQty") || 0),
            unidade: String(dados.get("stockUnit") ?? ""),
            validade: String(dados.get("expirationDate") ?? ""),
        };

        try {
            const salvo = await salvarMedicamentoApi({
                nome: medicamento.nome,
                concentracao: medicamento.concentracao,
                tipoUso: medicamento.tipoUso,
                unidade: medicamento.unidade || "unidades",
                dose: medicamento.dose,
                frequencia: medicamento.frequencia,
                intervaloHoras: medicamento.intervaloHoras,
                dias: medicamento.dias,
                horarios: medicamento.horarios,
                dataInicio: medicamento.dataInicio,
                dataFim: medicamento.dataFim,
                quantidadeInicial: medicamentoEditado ? undefined : medicamento.quantidade,
                validade: medicamentoEditado ? undefined : medicamento.validade,
            }, medicamentoEditado?.id);
            window.location.href = medicamentoEditado
                ? `/modules/medicamentos/components/detalhes-medicamento.html?id=${encodeURIComponent(salvo.id)}`
                : "/modules/medicamentos/components/medicacoes.html";
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message, true);
        }
    });

    atualizarCampos();
}

async function carregarMedicamentoParaEdicao(formulario, id) {
    try {
        const medicamento = await buscarMedicamentoApi(id);
        if (!medicamento) {
            mostrarRetornoFormulario(formulario, "O medicamento não foi encontrado.", true);
            return null;
        }

        preencherCampo(formulario, "#input-med-name", medicamento.nome);
        preencherCampo(formulario, "#input-med-concentration", medicamento.concentracao);
        preencherCampo(formulario, "#input-start-date", medicamento.dataInicio);
        preencherCampo(formulario, "#input-end-date", medicamento.dataFim);
        preencherCampo(formulario, "#input-med-dose", medicamento.dose);
        preencherCampo(formulario, "#select-med-frequency", medicamento.frequencia);
        preencherCampo(formulario, "#input-frequency-interval", medicamento.intervaloHoras);
        preencherCampo(formulario, "#input-stock-qty", medicamento.quantidade);
        preencherCampo(formulario, "#select-stock-unit", medicamento.unidade);
        preencherCampo(formulario, "#input-expiration-date", medicamento.validade);

        formulario.querySelectorAll('input[name="usageType"]').forEach((campo) => {
            campo.checked = campo.value === medicamento.tipoUso;
        });
        formulario.querySelectorAll('input[name="weekdays"]').forEach((campo) => {
            campo.checked = medicamento.dias?.includes(campo.value) ?? false;
        });
        const lista = formulario.querySelector("#times-list, .meds-times-list");
        const horarios = medicamento.horarios ?? [];
        const camposHorario = Array.from(lista?.querySelectorAll(".meds-time-input") ?? []);
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
        "#input-start-date": "startDate",
        "#input-end-date": "endDate",
        "#input-med-dose": "dose",
        "#select-med-frequency": "frequency",
        "#input-frequency-interval": "intervalHours",
        "#input-stock-qty": "stockQty",
        "#select-stock-unit": "stockUnit",
        "#input-expiration-date": "expirationDate",
    };
    Object.entries(campos).forEach(([seletor, nome]) => {
        const campo = formulario.querySelector(seletor);
        if (campo) campo.name = nome;
    });
    formulario.querySelectorAll("#times-list .meds-time-input, .meds-times-list .meds-time-input").forEach((campo) => {
        campo.name = "times";
    });
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
    configurarCampoHorario(campo);
    campo.name = "times";
    campo.value = valor;
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
    if (botao && nome) {
        botao.disabled = !nome.value.trim();
    }
}

function atualizarListaHorarios(listaHorarios) {
    if (!listaHorarios) {
        return;
    }

    const linhas = listaHorarios.querySelectorAll(".meds-time-row");
    linhas.forEach((linha, indice) => {
        const campo = linha.querySelector(".meds-time-input");
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

function configurarCampoHorario(campo) {
    campo.type = "text";
    campo.className = "meds-form-input meds-time-input";
    campo.inputMode = "numeric";
    campo.placeholder = "HH:mm";
    campo.maxLength = 5;
    campo.pattern = "(?:[01][0-9]|2[0-3]):[0-5][0-9]";
    campo.title = "Informe o horário no formato 24 horas, por exemplo 07:00.";
}

function formatarEntradaHorario(campo) {
    const digitosAntesDoCursor = campo.value.slice(0, campo.selectionStart ?? campo.value.length).replace(/\D/g, "").length;
    const digitos = campo.value.replace(/\D/g, "").slice(0, 4);
    const horario = digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos;
    campo.value = horario;

    const posicaoCursor = digitosAntesDoCursor > 2 ? digitosAntesDoCursor + 1 : digitosAntesDoCursor;
    campo.setSelectionRange(posicaoCursor, posicaoCursor);
}
