import { obterDosesDoDia } from "./dados-rotina.js";

// Calcula métricas e calendário a partir dos eventos persistidos neste navegador.
export function inicializarDashboardMedicamentos() {
    const grade = document.querySelector(".calendar-card .meds-calendar-grid");
    const titulo = document.querySelector(".calendar-card .meds-calendar-month-title");
    if (!grade || !titulo) return;

    try {
        const seletor = document.querySelector("#select-period-filter");
        let mes = new Date().getMonth();
        let ano = new Date().getFullYear();
        const atualizar = () => {
            atualizarMetricas(seletor?.value || "mes");
            desenharCalendario(grade, titulo, mes, ano);
        };

        document.querySelectorAll(".calendar-card .btn-cal-nav").forEach((botao, indice) => {
            botao.addEventListener("click", () => {
                const data = new Date(ano, mes + (indice === 0 ? -1 : 1), 1);
                mes = data.getMonth();
                ano = data.getFullYear();
                desenharCalendario(grade, titulo, mes, ano);
            });
        });
        seletor?.addEventListener("change", atualizar);
        atualizar();
    } catch (erro) {
        const aviso = document.createElement("p");
        aviso.setAttribute("role", "alert");
        aviso.textContent = erro.message;
        grade.before(aviso);
    }
}

function atualizarMetricas(periodo) {
    const agora = new Date();
    let inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    let fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    if (periodo === "semana") {
        inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - agora.getDay());
        fim = new Date(inicio);
        fim.setDate(fim.getDate() + 7);
    } else if (periodo === "mes-anterior") {
        inicio.setMonth(agora.getMonth() - 1);
        fim.setTime(new Date(agora.getFullYear(), agora.getMonth(), 1).getTime());
    } else if (periodo === "ultimos-30-dias") {
        inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 29);
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    }
    if (periodo !== "mes-anterior") {
        const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
        if (fim > amanha) fim = amanha;
    }
    const recortadas = dosesEntre(inicio, fim);
    const tomadas = recortadas.filter((dose) => dose.status === "tomada").length;
    const porcentagem = recortadas.length ? Math.round((tomadas / recortadas.length) * 100) : 0;
    renderizarDiasSemana();
    const atual = document.querySelector(".doses-card .meds-counter-current");
    const total = document.querySelector(".doses-card .meds-counter-total");
    const progresso = document.querySelector(".doses-card .meds-progress-bar-wrap");
    const preenchimento = document.querySelector(".doses-card .meds-progress-bar-fill");
    if (atual) atual.textContent = String(tomadas);
    if (total) total.textContent = String(recortadas.length);
    if (progresso) progresso.setAttribute("aria-valuenow", String(porcentagem));
    if (preenchimento) preenchimento.style.width = `${porcentagem}%`;

    let sequencia = 0;
    const data = new Date();
    while (true) {
        const registros = obterDosesDoDia(data);
        if (!registros?.length || registros.some((dose) => dose.status !== "tomada")) break;
        sequencia += 1;
        data.setDate(data.getDate() - 1);
    }
    const streak = document.querySelector(".streak-card .meds-stat-big-val");
    const cumprimento = document.querySelector(".streak-card .meds-badge-success");
    const descricao = document.querySelector(".streak-card .meds-stat-description");
    if (streak) streak.textContent = `${sequencia} ${sequencia === 1 ? "dia" : "dias"}`;
    if (cumprimento) cumprimento.textContent = `${porcentagem}% no alvo`;
    if (descricao) descricao.textContent = recortadas.length
        ? `${tomadas} de ${recortadas.length} doses foram registradas como tomadas no período.`
        : "Não há doses previstas no período selecionado.";
    const marco = document.querySelector(".milestone-card .meds-milestone-title");
    const detalheMarco = document.querySelector(".milestone-card .meds-milestone-desc");
    if (marco) marco.textContent = sequencia >= 7 ? "Marco alcançado: 7 dias seguidos" : "Próximo marco: 7 dias seguidos";
    if (detalheMarco) detalheMarco.textContent = sequencia >= 7
        ? "Você completou uma semana seguindo a rotina."
        : sequencia
          ? `Faltam ${7 - sequencia} ${7 - sequencia === 1 ? "dia" : "dias"} para alcançar uma semana de rotina.`
          : "Registre as doses da rotina para acompanhar sua sequência.";
}

function dosesEntre(inicio, fim) {
    const doses = [];
    const data = new Date(inicio);
    data.setHours(0, 0, 0, 0);
    while (data < fim) {
        doses.push(...obterDosesDoDia(data));
        data.setDate(data.getDate() + 1);
    }
    return doses;
}

function renderizarDiasSemana() {
    const semana = document.querySelector(".meds-week-days");
    if (!semana) return;
    const nomes = ["S", "T", "Q", "Q", "S", "S", "D"];
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    const dias = Array.from({ length: 7 }, (_, indice) => {
        const data = new Date(inicioSemana);
        data.setDate(inicioSemana.getDate() + indice);
        const chave = dataLocal(data);
        const registros = obterDosesDoDia(data);
        const tomadasHoje = registros.length > 0 && registros.every((dose) => dose.status === "tomada");
        const dataJaPassou = chave <= dataLocal(hoje);
        const coluna = document.createElement("div");
        coluna.className = `meds-day-col${chave === dataLocal(hoje) ? " current" : ""}`;
        const rotulo = document.createElement("span");
        rotulo.className = "meds-day-label";
        rotulo.textContent = nomes[indice];
        const marcador = document.createElement("div");
        marcador.className = `meds-day-check${tomadasHoje && dataJaPassou ? " active" : ""}${chave === dataLocal(hoje) && tomadasHoje ? " highlight" : ""}`;
        marcador.setAttribute("aria-label", `${chave}: ${tomadasHoje ? "doses tomadas" : registros.length && dataJaPassou ? "doses pendentes" : "sem doses previstas"}`);
        if (tomadasHoje) {
            const icone = document.createElement("i");
            icone.className = "fa-solid fa-check";
            icone.setAttribute("aria-hidden", "true");
            marcador.append(icone);
        }
        coluna.append(rotulo, marcador);
        return coluna;
    });
    semana.replaceChildren(...dias);
}

function desenharCalendario(grade, titulo, mes, ano) {
    const nomesMeses = Array.from({ length: 12 }, (_, indice) =>
        new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(ano, indice, 1)),
    );
    const cabecalhos = ["D", "S", "T", "Q", "Q", "S", "S"].map((nome) => {
        const item = document.createElement("div");
        item.className = "meds-cal-head";
        item.textContent = nome;
        return item;
    });
    const dias = [...cabecalhos];
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();
    for (let i = 0; i < primeiroDia; i += 1) {
        const espaco = document.createElement("span");
        espaco.className = "meds-cal-day muted";
        espaco.setAttribute("aria-hidden", "true");
        dias.push(espaco);
    }

    for (let numero = 1; numero <= quantidadeDias; numero += 1) {
        const dia = document.createElement("div");
        const chave = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(numero).padStart(2, "0")}`;
        const data = new Date(ano, mes, numero);
        const registros = obterDosesDoDia(data);
        const concluidas = registros.filter((dose) => dose.status === "tomada").length;
        const dataFutura = chave > dataLocal();
        const classeStatus = dataFutura
            ? ""
            : registros.length && concluidas === registros.length
            ? "status-taken"
            : registros.some((dose) => dose.status === "sem-estoque")
              ? "status-missed"
              : registros.length && chave < dataLocal()
                ? "status-missed"
                : registros.length
                  ? "status-delayed"
                : "";
        dia.className = `meds-cal-day${classeStatus ? ` ${classeStatus}` : ""}`;
        dia.textContent = String(numero);
        dia.tabIndex = 0;
        dia.setAttribute("role", "button");
        dia.setAttribute("aria-label", `${numero} de ${nomesMeses[mes]}: ${concluidas} de ${registros.length} doses tomadas`);
        dia.addEventListener("click", () => selecionarDia(dia, grade));
        dia.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                selecionarDia(dia, grade);
            }
        });
        dias.push(dia);
    }
    while (dias.length % 7 !== 0) {
        const espaco = document.createElement("span");
        espaco.className = "meds-cal-day muted";
        espaco.setAttribute("aria-hidden", "true");
        dias.push(espaco);
    }
    titulo.textContent = `${nomesMeses[mes]} ${ano}`;
    grade.closest(".calendar-card")?.setAttribute("aria-label", `Calendário de ${nomesMeses[mes]} ${ano}`);
    grade.replaceChildren(...dias);
}

function selecionarDia(dia, grade) {
    grade.querySelector(".selected")?.classList.remove("selected");
    dia.classList.add("selected");
    // Provisório: a data escolhida é registrada no console para teste de desenvolvimento.
    console.log("[Medicamentos] Dia selecionado (teste de desenvolvimento):", dia.getAttribute("aria-label"));
}

function dataLocal(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}
