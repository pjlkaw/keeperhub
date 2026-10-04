import { listarRegistros, salvarRegistros } from "./armazenamento.js";

const diasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

// Usa a data local para que doses não mudem de dia por causa do fuso horário.
export function dataLocal(valor = new Date()) {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

// Retorna medicamentos ativos e com uso previsto na data selecionada.
export function obterDosesDoDia(data = new Date()) {
    const chaveData = dataLocal(data);
    const diaSemana = diasSemana[data.getDay()];
    const medicamentos = listarRegistros("medicamentos").filter(
        (medicamento) =>
            medicamento.tipoUso !== "eventual" &&
            (medicamento.status !== "encerrado" ||
                (medicamento.encerradoEm && chaveData <= medicamento.encerradoEm.slice(0, 10))),
    );
    const registros = listarRegistros("doses");

    return medicamentos.flatMap((medicamento) => {
        if (!estaEmUso(medicamento, chaveData) || !frequenciaIncluiData(medicamento, diaSemana)) {
            return [];
        }

        return horariosMedicamento(medicamento).map((horario) => {
            const registro = registros.find(
                (dose) =>
                    dose.medicamentoId === medicamento.id &&
                    dose.data === chaveData &&
                    dose.horario === horario,
            );

            return {
                medicamento,
                medicamentoId: medicamento.id,
                data: chaveData,
                horario,
                status: registro?.status ?? "pendente",
                tomadaEm: registro?.tomadaEm ?? "",
            };
        });
    });
}

// Marca uma dose como tomada ou sem estoque e mantém seu estado entre telas.
export function salvarEstadoDose(dose, status) {
    const doses = listarRegistros("doses");
    const existente = doses.find(
        (registro) =>
            registro.medicamentoId === dose.medicamentoId &&
            registro.data === dose.data &&
            registro.horario === dose.horario,
    );
    const registro = {
        id: existente?.id ?? `${dose.medicamentoId}-${dose.data}-${dose.horario}`,
        medicamentoId: dose.medicamentoId,
        medicamento: nomeMedicamento(dose.medicamento),
        dose: dose.medicamento.dose || dose.medicamento.apresentacao,
        horario: dose.horario,
        data: dose.data,
        status,
        tomadaEm: status === "tomada" ? new Date().toISOString() : "",
        atualizadoEm: new Date().toISOString(),
    };

    if (dose.data === dataLocal() && existente?.status !== status) {
        atualizarEstoqueDaDose(dose.medicamento, status);
    }

    if (existente) {
        doses[doses.indexOf(existente)] = registro;
    } else {
        doses.unshift(registro);
    }

    // Provisório: o estado das doses fica apenas no localStorage deste navegador.
    salvarRegistros("doses", doses);
    return registro;
}

function atualizarEstoqueDaDose(medicamento, status) {
    const medicamentos = listarRegistros("medicamentos");
    const indice = medicamentos.findIndex((item) => item.id === medicamento.id);
    if (indice < 0) throw new Error("O medicamento não foi encontrado para atualizar o estoque.");

    const atual = Number(medicamentos[indice].quantidade) || 0;
    if (status === "sem-estoque") {
        medicamentos[indice].quantidade = 0;
    } else if (status === "tomada") {
        const doseNumerica = String(medicamento.dose ?? "").match(/^\s*(\d+(?:[.,]\d+)?)/)?.[1];
        if (!doseNumerica || /^\s*\d+\s*\//.test(medicamento.dose)) return;
        const consumo = Number(doseNumerica.replace(",", "."));
        if (consumo > 0) medicamentos[indice].quantidade = Math.max(0, atual - consumo);
    }
    // Provisório: o estoque consumido pelas doses é atualizado somente no localStorage.
    salvarRegistros("medicamentos", medicamentos);
}

export function nomeMedicamento(medicamento) {
    return [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
}

export function horariosMedicamento(medicamento) {
    if (medicamento.frequencia === "intervalo" && Number(medicamento.intervaloHoras) > 0) {
        const intervalo = Number(medicamento.intervaloHoras);
        const horarios = [];
        for (let hora = 8; hora < 24; hora += intervalo) {
            horarios.push(`${String(hora).padStart(2, "0")}:00`);
        }
        return horarios;
    }

    return medicamento.horarios?.length ? medicamento.horarios : ["Sem horário"];
}

export function formatarDataHora(valor) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
        return valor;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

function estaEmUso(medicamento, data) {
    const criadoEm = medicamento.criadoEm ? new Date(medicamento.criadoEm) : null;
    const dataCriacao = criadoEm && !Number.isNaN(criadoEm.getTime()) ? dataLocal(criadoEm) : "";
    const inicio = medicamento.dataInicio || dataCriacao;
    return (!inicio || inicio <= data) &&
        (!medicamento.dataFim || medicamento.dataFim >= data);
}

function frequenciaIncluiData(medicamento, diaSemana) {
    if (medicamento.frequencia !== "especifico") {
        return true;
    }

    return medicamento.dias?.includes(diaSemana) ?? false;
}
