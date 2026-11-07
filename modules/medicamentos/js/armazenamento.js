// Dados do módulo vêm da API; estas variáveis são apenas o estado da página.
let medicamentosDoBanco = null;
let registrosUsoDoBanco = null;
let habitosDoBanco = null;

export function definirMedicamentosDoBanco(medicamentos) {
    medicamentosDoBanco = Array.isArray(medicamentos)
        ? medicamentos.map((medicamento) => ({ ...medicamento }))
        : null;
}

export function definirRegistrosUsoDoBanco(registros) {
    registrosUsoDoBanco = Array.isArray(registros)
        ? registros.map((registro) => ({ ...registro }))
        : null;
}

export function definirHabitosDoBanco(habitos) {
    habitosDoBanco = Array.isArray(habitos)
        ? habitos.map((habito) => ({ ...habito, conclusoes: [...(habito.conclusoes || [])] }))
        : null;
}

// Carrega registros locais e informa quando o conteúdo salvo não pode ser interpretado.
export function listarRegistros(tipo) {
    if (tipo === "medicamentos") {
        if (!medicamentosDoBanco) {
            throw new Error("Não foi possível carregar os medicamentos do servidor.");
        }
        return medicamentosDoBanco.map((medicamento) => ({ ...medicamento }));
    }
    if (tipo === "doses" || tipo === "usos") {
        if (!registrosUsoDoBanco) {
            throw new Error("Não foi possível carregar o histórico de uso do servidor.");
        }
        return registrosUsoDoBanco
            .filter((registro) => registro.tipoUso === (tipo === "doses" ? "rotina" : "eventual"))
            .map((registro) => ({
                id: registro.id,
                medicamentoId: registro.medicamentoId,
                medicamento: registro.medicamento,
                dose: registro.dose || "",
                data: registro.data,
                horario: registro.horario || "Sem horário",
                status: registro.status,
                tomadaEm: registro.tomadaEm || "",
                observacao: registro.observacao || "",
                criadoEm: registro.tomadaEm || registro.data,
            }));
    }
    if (tipo === "habitos") {
        if (!habitosDoBanco) {
            throw new Error("Não foi possível carregar os hábitos do servidor.");
        }
        return habitosDoBanco.map((habito) => ({ ...habito, conclusoes: [...habito.conclusoes] }));
    }
    throw new Error(`O tipo de registro "${tipo}" não é persistido neste módulo.`);
}
