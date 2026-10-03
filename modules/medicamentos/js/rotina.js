import { dataLocal, formatarDataHora, obterDosesDoDia, salvarEstadoDose } from "./dados-rotina.js";

const nomesDias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

// Desenha doses e resumo para o dia escolhido e grava suas alterações localmente.
export function inicializarRotinaMedicamentos() {
    const timeline = document.querySelector(".routine-timeline");
    if (!timeline) {
        return;
    }

    let dataSelecionada = new Date();
    dataSelecionada.setHours(0, 0, 0, 0);
    const rotuloData = document.querySelector("#current-date-label");

    const renderizar = () => {
        atualizarRotuloData(rotuloData, dataSelecionada);

        try {
            desenharDoses(timeline, obterDosesDoDia(dataSelecionada));
        } catch (erro) {
            mostrarErro(timeline, erro);
        }
    };

    document.querySelector("#btn-prev-day")?.addEventListener("click", () => {
        dataSelecionada.setDate(dataSelecionada.getDate() - 1);
        renderizar();
    });
    document.querySelector("#btn-next-day")?.addEventListener("click", () => {
        dataSelecionada.setDate(dataSelecionada.getDate() + 1);
        renderizar();
    });

    renderizar();
}

function desenharDoses(timeline, doses) {
    timeline.replaceChildren();
    const dosesPorHorario = Map.groupBy
        ? Map.groupBy(doses, (dose) => dose.horario)
        : agruparPorHorario(doses);

    if (!doses.length) {
        timeline.append(mensagemVazia("Nenhuma dose programada para este dia."));
        atualizarResumo([]);
        return;
    }

    for (const [horario, dosesDoHorario] of dosesPorHorario) {
        const grupo = document.createElement("div");
        grupo.className = "timeline-group";

        const cabecalho = document.createElement("div");
        cabecalho.className = "timeline-time-header";
        cabecalho.innerHTML = '<i class="fa-regular fa-clock" aria-hidden="true"></i>';
        const rotulo = document.createElement("span");
        rotulo.textContent = horario;
        cabecalho.append(rotulo);

        const lista = document.createElement("div");
        lista.className = "timeline-card-list";
        dosesDoHorario.forEach((dose) => lista.append(criarCartaoDose(dose)));
        grupo.append(cabecalho, lista);
        timeline.append(grupo);
    }

    atualizarResumo(doses);
}

function agruparPorHorario(doses) {
    return doses.reduce((grupos, dose) => {
        if (!grupos.has(dose.horario)) {
            grupos.set(dose.horario, []);
        }
        grupos.get(dose.horario).push(dose);
        return grupos;
    }, new Map());
}

function criarCartaoDose(dose) {
    const tomada = dose.status === "tomada";
    const card = document.createElement("article");
    card.className = `card routine-card ${tomada ? "routine-card--taken" : "routine-card--pending"}`;
    card.dataset.medicationId = dose.medicamentoId;

    const corpo = document.createElement("div");
    corpo.className = "routine-card-body";
    const info = document.createElement("div");
    info.className = "routine-card-info";
    const titulo = document.createElement("div");
    titulo.className = "routine-card-title-row";
    const nome = document.createElement("span");
    nome.className = "routine-card-name";
    nome.textContent = [dose.medicamento.nome, dose.medicamento.concentracao].filter(Boolean).join(" ");
    const quantidade = document.createElement("span");
    quantidade.className = "routine-card-time-taken";
    quantidade.textContent = tomada
        ? `Tomado às ${new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(dose.tomadaEm))}`
        : dose.medicamento.dose || dose.medicamento.apresentacao;
    titulo.append(nome);
    info.append(titulo, quantidade);

    const status = document.createElement("span");
    status.className = `routine-status-pill ${tomada ? "routine-status-pill--taken" : "routine-status-pill--pending"}`;
    status.textContent = tomada ? "Tomado" : dose.status === "sem-estoque" ? "Sem estoque" : "Pendente";
    corpo.append(info, status);
    card.append(corpo);

    if (dose.status === "pendente") {
        const acoes = document.createElement("div");
        acoes.className = "routine-dose-actions";
        acoes.append(
            criarBotaoAcao("Tomei", "tomada", dose, card),
            criarBotaoAcao("Estou sem", "sem-estoque", dose, card),
        );
        card.append(acoes);
    }

    return card;
}

function criarBotaoAcao(rotulo, status, dose, card) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn-meds-secondary";
    botao.textContent = rotulo;
    botao.addEventListener("click", () => {
        try {
            salvarEstadoDose(dose, status);
            const atualizadas = obterDosesDoDia(new Date(`${dose.data}T00:00:00`));
            desenharDoses(document.querySelector(".routine-timeline"), atualizadas);
        } catch (erro) {
            mostrarErro(card, erro);
        }
    });
    return botao;
}

function atualizarResumo(doses) {
    const tomadas = doses.filter((dose) => dose.status === "tomada").length;
    const semEstoque = doses.filter((dose) => dose.status === "sem-estoque").length;
    const pendentes = doses.length - tomadas - semEstoque;
    const badges = document.querySelectorAll(".routine-summary-badges .routine-badge");

    if (badges[0]) badges[0].textContent = `${doses.length} Doses`;
    if (badges[1]) badges[1].textContent = `${tomadas} Tomadas`;
    if (badges[2]) badges[2].textContent = `${pendentes} Pendentes`;
    if (badges[3]) badges[3].textContent = `${semEstoque} Sem estoque`;

    const banner = document.querySelector(".routine-completion-banner");
    if (banner) {
        banner.hidden = doses.length === 0 || pendentes > 0 || semEstoque > 0;
        banner.style.display = banner.hidden ? "none" : "";
    }
}

function atualizarRotuloData(rotulo, data) {
    if (!rotulo) {
        return;
    }

    const hoje = dataLocal(data) === dataLocal();
    const formato = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
    rotulo.textContent = `${hoje ? "Hoje" : nomesDias[data.getDay()]}, ${formato.format(data)}`;
}

function mensagemVazia(texto) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = texto;
    return mensagem;
}

function mostrarErro(elemento, erro) {
    const mensagem = document.createElement("p");
    mensagem.setAttribute("role", "alert");
    mensagem.textContent = erro.message;
    elemento.replaceChildren(mensagem);
}
