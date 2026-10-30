// Medicamentos e registros de uso vêm da API; hábitos e receitas ainda usam o protótipo local.
const prefixoChave = "keeperhub-medicamentos";
let medicamentosDoBanco = null;
let registrosUsoDoBanco = null;

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

    const chave = `${prefixoChave}-${tipo}-v1`;
    const conteudo = localStorage.getItem(chave);

    if (conteudo === null) {
        return [];
    }

    let registros;
    try {
        registros = JSON.parse(conteudo);
    } catch (erro) {
        throw new Error(`Não foi possível ler os dados locais de ${tipo}.`, { cause: erro });
    }

    if (!Array.isArray(registros)) {
        throw new Error(`Os dados locais de ${tipo} estão em um formato inválido.`);
    }

    return registros;
}

// Grava registros apenas neste navegador; a persistência em localStorage é provisória.
export function salvarRegistros(tipo, registros) {
    if (tipo === "medicamentos") {
        throw new Error("Medicamentos devem ser alterados pela API, não pelo armazenamento local.");
    }
    if (tipo === "doses" || tipo === "usos") {
        throw new Error("Registros de uso devem ser alterados pela API, não pelo armazenamento local.");
    }

    const chave = `${prefixoChave}-${tipo}-v1`;

    try {
        localStorage.setItem(chave, JSON.stringify(registros));
    } catch (erro) {
        throw new Error(`Não foi possível salvar ${tipo} neste navegador.`, { cause: erro });
    }
}

// Cria identificadores locais sem depender de serviços externos.
export function criarIdLocal() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
