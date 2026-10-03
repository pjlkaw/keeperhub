import { listarRegistros } from "./armazenamento.js";
import { dataLocal, nomeMedicamento, obterDosesDoDia, salvarEstadoDose } from "./dados-rotina.js";

// Monta a página inicial com a rotina, o estoque e os hábitos salvos localmente.
export function inicializarInicioMedicamentos() {
    const prioridade = document.querySelector("#home-dose-priority");
    if (!prioridade) {
        return;
    }

    try {
        const doses = obterDosesDoDia();
        const pendentes = doses.filter((dose) => dose.status === "pendente");
        const agora = new Date();
        const atrasadas = pendentes.filter((dose) => horarioJaPassou(dose.horario, agora));
        const futuras = pendentes.filter((dose) => !horarioJaPassou(dose.horario, agora));
        const badge = document.querySelector("#home-pending-count");
        if (badge) badge.textContent = `${pendentes.length} doses pendentes`;

        renderizarPrioridade(prioridade, atrasadas);
        renderizarProximaDose(document.querySelector("#home-upcoming"), futuras, doses);
        renderizarMedicamentos(doses);
        renderizarEstoque();
        renderizarHabitos();
    } catch (erro) {
        mostrarErro(prioridade, erro);
    }
}

function renderizarPrioridade(container, doses) {
    container.replaceChildren();
    if (!doses.length) {
        container.append(mensagemVazia("Nenhuma dose atrasada. Consulte a rotina para ver os próximos horários."));
        return;
    }

    doses.forEach((dose) => {
        const card = document.createElement("article");
        card.className = "card meds-card-delayed";
        const conteudo = document.createElement("div");
        conteudo.className = "meds-delayed-content";
        const cabecalho = document.createElement("div");
        cabecalho.className = "meds-card-delayed-header";
        const nome = document.createElement("span");
        nome.className = "meds-delayed-name";
        nome.textContent = nomeMedicamento(dose.medicamento);
        const status = document.createElement("span");
        status.className = "status-badge-delayed";
        status.textContent = `PENDENTE (${dose.horario})`;
        cabecalho.append(nome, status);
        const quantidade = document.createElement("span");
        quantidade.className = "meds-delayed-dose";
        quantidade.textContent = dose.medicamento.dose || dose.medicamento.apresentacao;
        conteudo.append(cabecalho, quantidade);

        const acoes = document.createElement("div");
        acoes.className = "meds-delayed-actions";
        acoes.append(
            criarBotaoDose("Tomei", "tomada", dose, () => inicializarInicioMedicamentos()),
            criarBotaoDose("Estou sem", "sem-estoque", dose, () => inicializarInicioMedicamentos()),
        );
        card.append(conteudo, acoes);
        container.append(card);
    });
}

function renderizarProximaDose(container, futuras, doses) {
    if (!container) {
        return;
    }

    container.replaceChildren();
    const proxima = futuras.sort((a, b) => a.horario.localeCompare(b.horario))[0];
    if (!proxima) {
        container.append(mensagemVazia(doses.length ? "Não há próximas doses para hoje." : "Cadastre um medicamento para montar sua rotina."));
        return;
    }

    const itens = futuras.filter((dose) => dose.horario === proxima.horario);
    const card = document.createElement("article");
    card.className = "card meds-card-upcoming";
    const cabecalho = document.createElement("div");
    cabecalho.className = "upcoming-header-row";
    const hora = document.createElement("span");
    hora.className = "upcoming-time-tag";
    hora.textContent = proxima.horario;
    const quantidade = document.createElement("span");
    quantidade.className = "upcoming-time-pill";
    quantidade.textContent = `${itens.length} ${itens.length === 1 ? "medicamento" : "medicamentos"}`;
    cabecalho.append(hora, quantidade);

    const lista = document.createElement("ul");
    lista.className = "upcoming-med-list";
    itens.forEach((dose) => {
        const item = document.createElement("li");
        item.className = "upcoming-med-item";
        item.textContent = nomeMedicamento(dose.medicamento);
        lista.append(item);
    });

    const rodape = document.createElement("div");
    rodape.className = "upcoming-footer";
    const link = document.createElement("a");
    link.className = "btn-meds-secondary";
    link.href = "/modules/medicamentos/components/rotina.html";
    link.textContent = "Ver rotina";
    rodape.append(link);
    card.append(cabecalho, lista, rodape);
    container.append(card);
}

function renderizarMedicamentos(doses) {
    const medicamentosAtivos = listarRegistros("medicamentos").filter((medicamento) => medicamento.status !== "encerrado");
    const ativos = document.querySelector("#home-active-medications");
    const hoje = document.querySelector("#home-today-doses");
    if (ativos) ativos.textContent = `${medicamentosAtivos.length} ativos`;
    if (hoje) hoje.textContent = `${doses.length} hoje`;
    document.querySelector("#shortcut-medicacoes")?.setAttribute("aria-label", `Acessar lista de medicações (${medicamentosAtivos.length} ativas)`);
    document.querySelector("#shortcut-rotina")?.setAttribute("aria-label", `Acessar rotina de medicamentos (${doses.length} doses hoje)`);
}

function renderizarEstoque() {
    const lista = document.querySelector("#home-stock-list");
    if (!lista) {
        return;
    }

    const baixos = listarRegistros("medicamentos").filter(
        (medicamento) =>
            medicamento.status !== "encerrado" &&
            medicamento.alertaEstoque &&
            Number(medicamento.quantidade) <= Number(medicamento.limiteEstoque),
    );
    const contador = document.querySelector("#home-stock-alert-count");
    if (contador) contador.textContent = `${baixos.length} alertas`;
    document.querySelector("#shortcut-estoque")?.setAttribute("aria-label", `Acessar dashboard de estoque (${baixos.length} alertas)`);
    lista.replaceChildren();

    if (!baixos.length) {
        lista.append(mensagemVazia("Nenhum medicamento está abaixo do limite de estoque."));
        return;
    }

    baixos.forEach((medicamento) => {
        const card = document.createElement("article");
        card.className = "card";
        const info = document.createElement("div");
        info.className = "attention-info-area";
        const nome = document.createElement("span");
        nome.className = "attention-med-name";
        nome.textContent = nomeMedicamento(medicamento);
        const estoque = document.createElement("span");
        estoque.className = "attention-status-text";
        estoque.textContent = `Estoque baixo • ${medicamento.quantidade} ${medicamento.unidade}`;
        info.append(nome, estoque);

        const link = document.createElement("a");
        link.className = "btn-meds-repor";
        link.href = `/modules/medicamentos/components/refil-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
        link.textContent = "Repor";
        card.append(info, link);
        lista.append(card);
    });
}

function renderizarHabitos() {
    const lista = document.querySelector("#home-habits-list");
    if (!lista) {
        return;
    }

    const hoje = dataLocal();
    const habitos = listarRegistros("habitos");
    lista.replaceChildren();

    if (!habitos.length) {
        lista.append(mensagemVazia("Adicione um hábito para acompanhar seu progresso."));
        return;
    }

    habitos.slice(0, 5).forEach((habito) => {
        const concluido = habito.conclusoes?.includes(hoje) ?? false;
        const card = document.createElement("article");
        card.className = "card habit-card";
        const nome = document.createElement("span");
        nome.className = "habit-name";
        nome.textContent = habito.nome;
        const meta = document.createElement("span");
        meta.className = `habit-value${concluido ? " habit-done" : ""}`;
        meta.textContent = concluido ? "Feito hoje" : `${habito.meta} ${habito.unidade}`;
        card.append(nome, meta);
        lista.append(card);
    });
}

function criarBotaoDose(rotulo, status, dose, atualizar) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = status === "tomada" ? "btn-meds-take" : "btn-meds-out";
    botao.textContent = rotulo;
    botao.addEventListener("click", () => {
        try {
            salvarEstadoDose(dose, status);
            atualizar();
        } catch (erro) {
            mostrarErro(botao.closest("article"), erro);
        }
    });
    return botao;
}

function horarioJaPassou(horario, agora) {
    if (horario === "Sem horário") {
        return false;
    }

    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto < agora.getHours() * 60 + agora.getMinutes();
}

function mensagemVazia(texto) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = texto;
    return mensagem;
}

function mostrarErro(container, erro) {
    const mensagem = document.createElement("p");
    mensagem.setAttribute("role", "alert");
    mensagem.textContent = erro.message;
    container.replaceChildren(mensagem);
}
