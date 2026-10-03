import { listarRegistros, salvarRegistros } from "./armazenamento.js";
import { dataLocal } from "./dados-rotina.js";

// Atualiza o checklist e o resumo dos hábitos diretamente na interface.
export function inicializarHabitos() {
    const lista = document.querySelector(".habits-list");
    if (!lista) {
        return;
    }

    const hoje = dataLocal();
    try {
        lista.replaceChildren();
        const habitos = listarRegistros("habitos");
        habitos.forEach((habito) => lista.append(criarLinhaHabito(habito, hoje)));
        renderizarSemana(habitos);
        if (!lista.children.length) {
            const vazio = document.createElement("p");
            vazio.className = "meds-empty-state";
            vazio.textContent = "Nenhum hábito cadastrado. Adicione um para começar seu acompanhamento.";
            lista.append(vazio);
        }
    } catch (erro) {
        mostrarErroHabito(lista, erro);
    }

    function renderizarSemana(habitos) {
        const semana = document.querySelector(".habits-week");
        if (!semana) return;
        const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
        const hoje = new Date();
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
        const dias = Array.from({ length: 7 }, (_, indice) => {
            const data = new Date(inicioSemana);
            data.setDate(inicioSemana.getDate() + indice);
            const chave = dataLocal(data);
            const concluiu = habitos.some((habito) => habito.conclusoes?.includes(chave));
            const item = document.createElement("span");
            item.className = `habits-day${concluiu ? " is-complete" : ""}${chave === dataLocal(hoje) ? " is-today" : ""}`;
            const nome = document.createElement("span");
            nome.textContent = nomes[data.getDay()];
            const marca = document.createElement("span");
            marca.className = "habits-day-mark";
            item.append(nome, marca);
            return item;
        });
        semana.replaceChildren(...dias);

        let sequencia = 0;
        const data = new Date(hoje);
        while (habitos.some((habito) => habito.conclusoes?.includes(dataLocal(data)))) {
            sequencia += 1;
            data.setDate(data.getDate() - 1);
        }
        const titulo = document.querySelector(".habits-week-heading h2");
        if (titulo) titulo.textContent = `${sequencia} ${sequencia === 1 ? "dia" : "dias"} de sequência`;
    }

    lista.querySelectorAll(".habit-row").forEach((habito) => {
        habito.tabIndex = 0;
        habito.setAttribute("role", "checkbox");
        habito.setAttribute("aria-checked", String(habito.classList.contains("is-complete")));
        habito.addEventListener("click", () => alternarHabito(habito));
        habito.addEventListener("keydown", (evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                alternarHabito(habito);
            }
        });
    });

    atualizarResumoHabitos(lista);
}

function alternarHabito(habito) {
    const concluido = habito.classList.toggle("is-complete");
    habito.setAttribute("aria-checked", String(concluido));

    const id = habito.dataset.habitId;
    if (id) {
        try {
            const habitos = listarRegistros("habitos");
            const registro = habitos.find((item) => item.id === id);
            if (registro) {
                const conclusoes = Array.isArray(registro.conclusoes) ? registro.conclusoes : [];
                const hoje = dataLocal();
                registro.conclusoes = concluido
                    ? Array.from(new Set([...conclusoes, hoje]))
                    : conclusoes.filter((data) => data !== hoje);
                salvarRegistros("habitos", habitos);
            }
        } catch (erro) {
            mostrarErroHabito(habito.closest(".habits-list"), erro);
        }
    }

    const indicador = habito.querySelector(".habit-check");
    if (indicador) {
        indicador.textContent = concluido ? "✓" : "";
    }

    atualizarResumoHabitos(habito.closest(".habits-list"));

    // Temporário: registra a mudança no console apenas para teste de desenvolvimento.
    console.log("[Medicamentos] Hábito alterado (teste de desenvolvimento):", {
        habito: habito.querySelector(".habit-row-name")?.textContent.trim(),
        concluido,
    });
}

function atualizarResumoHabitos(lista) {
    const habitos = Array.from(lista.querySelectorAll(".habit-row"));
    const concluidos = habitos.filter((habito) => habito.classList.contains("is-complete")).length;
    const porcentagem = habitos.length ? Math.round((concluidos / habitos.length) * 100) : 0;

    const contador = document.querySelector(".habits-count");
    const progresso = document.querySelector(".habits-score strong");
    if (contador) contador.textContent = `${concluidos} de ${habitos.length}`;
    if (progresso) progresso.textContent = `${porcentagem}%`;
}

function criarLinhaHabito(habito, hoje) {
    const concluido = habito.conclusoes?.includes(hoje) ?? false;
    const linha = document.createElement("article");
    linha.className = `card habit-row${concluido ? " is-complete" : ""}`;
    linha.dataset.habitId = habito.id;
    linha.setAttribute("aria-checked", String(concluido));

    const marcador = document.createElement("span");
    marcador.className = "habit-check";
    marcador.setAttribute("aria-hidden", "true");
    marcador.textContent = concluido ? "✓" : "";

    const conteudo = document.createElement("span");
    conteudo.className = "habit-row-content";
    const nome = document.createElement("span");
    nome.className = "habit-row-name";
    nome.textContent = habito.nome;
    const meta = document.createElement("span");
    meta.className = "habit-row-meta";
    meta.textContent = `${habito.frequencia}: ${habito.meta} ${habito.unidade}`;
    conteudo.append(nome, meta);

    const icone = document.createElement("i");
    icone.className = "fa-solid fa-seedling habit-row-icon";
    icone.setAttribute("aria-hidden", "true");
    linha.append(marcador, conteudo, icone);
    return linha;
}

function mostrarErroHabito(lista, erro) {
    if (!lista) {
        console.error(erro);
        return;
    }

    const alerta = document.createElement("p");
    alerta.setAttribute("role", "alert");
    alerta.textContent = erro.message;
    lista.before(alerta);
}
