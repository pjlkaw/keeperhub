import { definirRegistrosUsoDoBanco, listarRegistros } from "./armazenamento.js";
import { salvarRegistroUsoApi } from "./api.js";

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
            (medicamento.frequencia || medicamento.intervaloHoras || medicamento.horarios?.length) &&
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
export async function salvarEstadoDose(dose, status) {
    const registros = await salvarRegistroUsoApi({
        tipoUso: "rotina",
        medicamentoId: dose.medicamentoId,
        data: dose.data,
        horario: dose.horario,
        dose: dose.medicamento.dose || "",
        status,
    });
    definirRegistrosUsoDoBanco(registros);
    return registros.find((registro) =>
        registro.tipoUso === "rotina" &&
        registro.medicamentoId === dose.medicamentoId &&
        registro.data === dose.data &&
        registro.horario === dose.horario,
    ) ?? null;
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
