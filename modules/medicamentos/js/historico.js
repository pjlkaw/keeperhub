import { listarRegistros } from "./armazenamento.js";

// Consolida doses, usos eventuais e reposições no histórico local do módulo.
export function inicializarHistoricoMedicamentos() {
    const lista = document.querySelector("#recent-history-title")?.closest("section")?.querySelector(".meds-list");
    const timeline = document.querySelector("#history-complete-title")?.closest("section")?.querySelector(".med-timeline");
    if (!lista && !timeline) return;

    try {
        const eventos = carregarEventos();
        if (lista) renderizarLista(lista, eventos);
        if (timeline) renderizarTimeline(timeline, eventos);
        inicializarBusca(lista);
    } catch (erro) {
        const destino = lista ?? timeline;
        const mensagem = document.createElement("p");
        mensagem.setAttribute("role", "alert");
        mensagem.textContent = erro.message;
        destino.before(mensagem);
    }
}

function carregarEventos() {
    const medicamentos = new Map(listarRegistros("medicamentos").map((item) => [item.id, nomeCompleto(item)]));
    return [
        ...listarRegistros("doses").map((dose) => ({
            data: dose.tomadaEm || `${dose.data}T${dose.horario === "Sem horário" ? "00:00" : dose.horario}:00`,
            medicamento: medicamentos.get(dose.medicamentoId) || dose.medicamento || "Medicamento removido",
            detalhe: dose.status === "tomada" ? "Dose tomada" : dose.status === "sem-estoque" ? "Sem estoque" : "Dose pendente",
            tipo: dose.status === "tomada" ? "taken" : "check",
        })),
        ...listarRegistros("usos").map((uso) => ({
            data: uso.data || uso.criadoEm,
            medicamento: uso.medicamento || "Uso eventual",
            detalhe: `${uso.dose || "Uso registrado"} • Uso eventual`,
            tipo: "eventual",
        })),
        ...listarRegistros("reposicoes").map((reposicao) => ({
            data: reposicao.criadoEm || reposicao.dataCompra,
            medicamento: medicamentos.get(reposicao.medicamentoId) || reposicao.medicamento || "Medicamento",
            detalhe: `Reposição de ${reposicao.quantidade} ${reposicao.unidade || "unidades"}${reposicao.lote ? ` • Lote ${reposicao.lote}` : ""}`,
            tipo: "cart",
        })),
    ].filter((evento) => evento.data).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function renderizarLista(lista, eventos) {
    lista.replaceChildren();
    if (!eventos.length) {
        lista.append(mensagemVazia("Ainda não há eventos no histórico."));
        return;
    }
    eventos.slice(0, 10).forEach((evento) => {
        const cartao = document.createElement("article");
        cartao.className = "card med-card";
        cartao.setAttribute("role", "listitem");
        const informacoes = document.createElement("div");
        informacoes.className = "med-card-info";
        const nome = document.createElement("span");
        nome.className = "med-card-name";
        nome.textContent = evento.medicamento;
        const detalhe = document.createElement("span");
        detalhe.className = "med-card-details";
        detalhe.textContent = `${evento.detalhe} • ${formatarData(evento.data)}`;
        informacoes.append(nome, detalhe);
        cartao.append(informacoes);
        lista.append(cartao);
    });
}

function renderizarTimeline(timeline, eventos) {
    timeline.replaceChildren();
    if (!eventos.length) {
        timeline.append(mensagemVazia("Ainda não há eventos no histórico."));
        return;
    }
    eventos.forEach((evento) => {
        const item = document.createElement("div");
        item.className = "med-timeline-item";
        const icone = document.createElement("div");
        icone.className = `med-timeline-icon med-timeline-icon--${evento.tipo}`;
        icone.setAttribute("aria-hidden", "true");
        const simbolo = document.createElement("i");
        simbolo.className = `fa-solid fa-${evento.tipo === "cart" ? "cart-shopping" : evento.tipo === "eventual" ? "clock" : "check"}`;
        icone.append(simbolo);
        const conteudo = document.createElement("div");
        conteudo.className = "med-timeline-content";
        const data = document.createElement("span");
        data.className = "med-timeline-title";
        data.textContent = formatarData(evento.data);
        const detalhe = document.createElement("span");
        detalhe.className = "med-timeline-desc";
        detalhe.textContent = `${evento.medicamento} • ${evento.detalhe}`;
        conteudo.append(data, detalhe);
        item.append(icone, conteudo);
        timeline.append(item);
    });
}

function inicializarBusca(lista) {
    const busca = document.querySelector(".meds-search-input");
    if (!lista || !busca) return;
    busca.addEventListener("input", () => {
        const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
        lista.querySelectorAll(".med-card").forEach((cartao) => {
            cartao.hidden = !cartao.textContent.toLocaleLowerCase("pt-BR").includes(termo);
        });
        // Provisório: o termo digitado é registrado somente para teste de desenvolvimento.
        console.log("[Medicamentos] Busca no histórico (teste de desenvolvimento):", busca.value);
    });
}

function nomeCompleto(medicamento) {
    return [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
}

function formatarData(valor) {
    const data = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
    return Number.isNaN(data.getTime())
        ? valor
        : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: valor.includes("T") ? "short" : undefined }).format(data);
}

function mensagemVazia(texto) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = texto;
    return mensagem;
}
