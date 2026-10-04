import { listarRegistros } from "./armazenamento.js";

// Adiciona à listagem os medicamentos criados neste navegador.
export function inicializarListaMedicamentos() {
    const listas = {
        continuo: document.querySelector('[aria-labelledby="group-continuous-title"] .meds-list'),
        temporario: document.querySelector('[aria-labelledby="group-temporary-title"] .meds-list'),
        eventual: document.querySelector('[aria-labelledby="group-eventual-title"] .meds-list'),
    };
    const existeLista = Object.values(listas).some(Boolean);

    if (!existeLista) {
        return;
    }

    try {
        Object.values(listas).forEach((lista) => lista?.replaceChildren());
        const medicamentos = listarRegistros("medicamentos").filter((item) => item.status !== "encerrado");
        medicamentos.forEach((medicamento) => {
            const lista = listas[medicamento.tipoUso] ?? listas.continuo;
            lista?.append(criarCartaoMedicamento(medicamento));
        });
        Object.values(listas).forEach((lista) => {
            if (!lista) return;
            if (!lista.children.length) lista.append(criarMensagemVazia("Nenhum medicamento cadastrado."));
        });

        const busca = document.querySelector(".meds-search-input");
        busca?.addEventListener("input", () => {
            const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
            document.querySelectorAll("#medications-panel .meds-list > a").forEach((cartao) => {
                cartao.hidden = !cartao.textContent.toLocaleLowerCase("pt-BR").includes(termo);
            });
        });
    } catch (erro) {
        mostrarErroLista(document.querySelector("#main-content"), erro);
    }
}

function criarMensagemVazia(texto) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = texto;
    return mensagem;
}

function criarCartaoMedicamento(medicamento) {
    const link = document.createElement("a");
    link.href = `detalhes-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;

    const cartao = document.createElement("div");
    cartao.className = "card card--interactive med-card";
    cartao.setAttribute("role", "listitem");

    const ladoEsquerdo = document.createElement("div");
    ladoEsquerdo.className = "med-card-left";

    const icone = document.createElement("div");
    icone.className = "med-card-icon-wrap";
    icone.setAttribute("aria-hidden", "true");
    icone.innerHTML = '<i class="fa-solid fa-pills"></i>';

    const informacoes = document.createElement("div");
    informacoes.className = "med-card-info";

    const nome = document.createElement("span");
    nome.className = "med-card-name";
    nome.textContent = [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");

    const detalhes = document.createElement("span");
    detalhes.className = "med-card-details";
    detalhes.textContent = formatarDetalhes(medicamento);
    informacoes.append(nome, detalhes);
    ladoEsquerdo.append(icone, informacoes);

    const ladoDireito = document.createElement("div");
    ladoDireito.className = "med-card-right";

    const status = document.createElement("span");
    status.className = `med-status-badge ${classeStatus(medicamento.tipoUso)}`;
    status.textContent = textoStatus(medicamento.tipoUso);

    const seta = document.createElement("span");
    seta.className = "med-card-arrow";
    seta.setAttribute("aria-hidden", "true");
    seta.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    ladoDireito.append(status, seta);
    cartao.append(ladoEsquerdo, ladoDireito);
    link.append(cartao);

    return link;
}

function formatarDetalhes(medicamento) {
    const detalhes = [];
    if (medicamento.dose) detalhes.push(medicamento.dose);
    if (medicamento.frequencia === "intervalo" && medicamento.intervaloHoras) {
        detalhes.push(`A cada ${medicamento.intervaloHoras} horas`);
    } else if (medicamento.horarios?.length) {
        detalhes.push(medicamento.horarios.join(" e "));
    }
    if (medicamento.tipoUso === "temporario" && medicamento.dataFim) {
        detalhes.push(`Até ${medicamento.dataFim}`);
    }

    return detalhes.length ? detalhes.join(" • ") : medicamento.apresentacao;
}

function textoStatus(tipoUso) {
    return tipoUso === "eventual" ? "Eventual" : tipoUso === "temporario" ? "Em tratamento" : "Ativo";
}

function classeStatus(tipoUso) {
    return tipoUso === "eventual"
        ? "med-status-badge--eventual"
        : tipoUso === "temporario"
          ? "med-status-badge--treatment"
          : "med-status-badge--active";
}

function mostrarErroLista(elemento, erro) {
    if (!elemento) {
        console.error(erro);
        return;
    }

    const mensagem = document.createElement("p");
    mensagem.setAttribute("role", "alert");
    mensagem.textContent = erro.message;
    elemento.prepend(mensagem);
}
