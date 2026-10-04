import { listarRegistros, salvarRegistros } from "./armazenamento.js";
import { formatarDataHora } from "./dados-rotina.js";

// Exibe e atualiza o medicamento selecionado usando o armazenamento provisório local.
export function inicializarDetalhesMedicamento() {
    const titulo = document.querySelector("#med-title");
    if (!titulo) return;
    limparDemonstracoesDetalhes();

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
        mostrarErroMedicamento("Selecione um medicamento na lista para ver os detalhes.");
        return;
    }

    try {
        const medicamento = listarRegistros("medicamentos").find((item) => item.id === id);
        if (!medicamento) throw new Error("Este medicamento não foi encontrado no armazenamento local.");
        mostrarMedicamento(medicamento);
        renderizarLotesDoDetalhe(medicamento);
        renderizarReceita(medicamento);
        renderizarHistorico(medicamento);
        configurarAcoes(medicamento);
    } catch (erro) {
        mostrarErroMedicamento(erro.message);
    }
}

// Carrega os lotes associados ao medicamento e remove os exemplos do HTML.
export function inicializarLotesMedicamento() {
    const caixa = document.querySelector("#batch-title")?.closest(".med-card-section")?.querySelector(".med-inner-box");
    const timeline = document.querySelector("#batch-history-title")?.closest(".med-card-section")?.querySelector(".med-timeline");
    if (!caixa || !timeline) return;
    caixa.replaceChildren();
    timeline.replaceChildren();

    try {
        const id = new URLSearchParams(window.location.search).get("id");
        const medicamento = listarRegistros("medicamentos").find((item) => item.id === id);
        if (!medicamento) throw new Error("Selecione um medicamento para consultar os lotes.");
        const reposicoes = listarRegistros("reposicoes")
            .filter((item) => item.medicamentoId === id)
            .sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

        if (!reposicoes.length) {
            adicionarLinhaLote(caixa, "Estoque atual", `${medicamento.quantidade ?? 0} ${medicamento.unidade || "unidades"}`, true);
            adicionarLinhaLote(caixa, "Validade", formatarData(medicamento.validade));
            timeline.append(mensagemVazia("O histórico de lotes está vazio."));
            return;
        }

        reposicoes.forEach((reposicao, indice) => {
            if (indice === 0) {
                adicionarLinhaLote(caixa, "Lote", reposicao.lote || "Não informado", true);
                adicionarLinhaLote(caixa, "Quantidade", `${reposicao.quantidade} ${medicamento.unidade || "unidades"}`);
                adicionarLinhaLote(caixa, "Validade", formatarData(reposicao.validade));
                adicionarLinhaLote(caixa, "Compra", formatarData(reposicao.dataCompra));
            }
            timeline.append(criarEventoTimeline(
                formatarData(reposicao.dataCompra || reposicao.criadoEm),
                `Lote ${reposicao.lote || "não informado"} • ${reposicao.quantidade} ${medicamento.unidade || "unidades"}`,
                "cart-shopping",
            ));
        });
    } catch (erro) {
        const mensagem = mensagemVazia(erro.message);
        mensagem.setAttribute("role", "alert");
        caixa.append(mensagem);
    }
}

function limparDemonstracoesDetalhes() {
    document.querySelector("#med-title").textContent = "";
    document.querySelectorAll(".med-details-badges .med-badge").forEach((etiqueta) => {
        etiqueta.textContent = "";
    });
    document.querySelectorAll(".med-routine-list .med-routine-item span").forEach((item) => {
        item.textContent = "";
    });
    const quantidade = document.querySelector(".med-stock-number");
    const unidade = document.querySelector(".med-stock-unit");
    if (quantidade) quantidade.textContent = "0";
    if (unidade) unidade.textContent = "unidades disponíveis";
    const estimativa = document.querySelector(".med-stock-estimate");
    if (estimativa) estimativa.textContent = "Estimativa indisponível";
    document.querySelector(".med-inner-box")?.replaceChildren();
    document.querySelector(".med-timeline")?.replaceChildren();
    const tituloReceita = document.querySelector("#section-prescription-title");
    const dataReceita = document.querySelector(".med-card-subtext");
    if (tituloReceita) tituloReceita.textContent = "";
    if (dataReceita) dataReceita.textContent = "";
    document.querySelector(".med-actions-group")?.setAttribute("hidden", "");
}

function mostrarMedicamento(medicamento) {
    document.querySelector("#med-title").textContent = nomeCompleto(medicamento);
    document.querySelector(".med-actions-group")?.removeAttribute("hidden");
    const etiquetas = document.querySelectorAll(".med-details-badges .med-badge");
    if (etiquetas[0]) etiquetas[0].textContent = rotuloTipo(medicamento.tipoUso);
    if (etiquetas[1]) {
        etiquetas[1].textContent = medicamento.status === "encerrado" ? "Encerrado" : "Ativo";
        etiquetas[1].classList.toggle("med-badge--active", medicamento.status !== "encerrado");
    }

    const linhas = document.querySelectorAll(".med-routine-list .med-routine-item span");
    if (linhas[0]) linhas[0].textContent = medicamento.dose || medicamento.apresentacao || "Dose não informada";
    if (linhas[1]) {
        linhas[1].textContent = medicamento.horarios?.length
            ? `Horários: ${medicamento.horarios.join(", ")}`
            : medicamento.frequencia === "intervalo" && medicamento.intervaloHoras
              ? `A cada ${medicamento.intervaloHoras} horas`
              : "Horários não definidos";
    }
    if (linhas[2]) linhas[2].textContent = `Frequência: ${rotuloFrequencia(medicamento.frequencia)}`;

    const quantidade = document.querySelector(".med-stock-number");
    const unidade = document.querySelector(".med-stock-unit");
    if (quantidade) quantidade.textContent = String(medicamento.quantidade ?? 0);
    if (unidade) unidade.textContent = `${medicamento.unidade || "unidades"} disponíveis`;
    const estimativa = document.querySelector(".med-stock-estimate");
    if (estimativa) estimativa.textContent = estimarEstoque(medicamento);

    const linkReposicao = document.querySelector("#btn-register-refill")?.closest("a");
    if (linkReposicao) linkReposicao.href = `refil-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
    const linkEdicao = document.querySelector("#btn-edit-medication");
    if (linkEdicao) linkEdicao.href = `editar-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
    const linkRotina = document.querySelector("#btn-edit-routine");
    if (linkRotina) linkRotina.href = `editar-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
    const linkLotes = document.querySelector("#btn-view-batches");
    if (linkLotes) linkLotes.href = `lotes-medicamento.html?id=${encodeURIComponent(medicamento.id)}`;
}

function estimarEstoque(medicamento) {
    const estoque = Number(medicamento.quantidade);
    const dose = Number(String(medicamento.dose ?? "").match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(",", "."));
    if (!estoque || !dose) return "Estimativa indisponível";

    const dosesPorDia = medicamento.frequencia === "intervalo" && Number(medicamento.intervaloHoras) > 0
        ? 24 / Number(medicamento.intervaloHoras)
        : (medicamento.horarios?.length || 1) *
          (medicamento.frequencia === "especifico" ? (medicamento.dias?.length || 0) / 7 : 1);
    if (!dosesPorDia) return "Estimativa indisponível";
    const dias = Math.floor(estoque / (dose * dosesPorDia));
    return `aprox. ${dias} ${dias === 1 ? "dia" : "dias"} restantes`;
}

function renderizarLotesDoDetalhe(medicamento) {
    const caixa = document.querySelector("#section-batches-title")?.closest(".med-card-section")?.querySelector(".med-inner-box");
    if (!caixa) return;
    const reposicoes = listarRegistros("reposicoes").filter((item) => item.medicamentoId === medicamento.id);
    caixa.replaceChildren();
    if (!reposicoes.length) {
        adicionarLinhaLote(caixa, "Estoque atual", `${medicamento.quantidade ?? 0} ${medicamento.unidade || "unidades"}`, true);
        adicionarLinhaLote(caixa, "Validade", formatarData(medicamento.validade));
        return;
    }
    const lote = reposicoes[0];
    adicionarLinhaLote(caixa, "Lote atual", lote.lote || "Não informado", true);
    adicionarLinhaLote(caixa, "Quantidade adquirida", `${lote.quantidade} ${medicamento.unidade || "unidades"}`);
    adicionarLinhaLote(caixa, "Validade", formatarData(lote.validade));
}

function renderizarReceita(medicamento) {
    const secao = document.querySelector("#section-prescription-title")?.closest(".med-card-section");
    if (!secao) return;
    const receita = listarRegistros("receitas").find((item) => item.medicamentoId === medicamento.id);
    const titulo = document.querySelector("#section-prescription-title");
    const data = secao.querySelector(".med-card-subtext");
    const link = secao.querySelector("#btn-view-prescription");
    if (!receita) {
        titulo.textContent = "Nenhuma receita vinculada";
        if (data) data.textContent = "Vincule uma receita ao cadastrá-la.";
        if (link) {
            link.hidden = true;
            link.style.display = "none";
        }
        return;
    }
    titulo.textContent = receita.titulo || receita.profissional;
    if (data) data.textContent = `${receita.profissional} • ${formatarData(receita.data)}`;
    if (link) {
        link.hidden = false;
        link.style.display = "";
        link.href = `receita-medicamento.html?id=${encodeURIComponent(receita.id)}`;
    }
}

function renderizarHistorico(medicamento) {
    const timeline = document.querySelector(".med-timeline");
    if (!timeline) return;
    const eventos = [
        ...listarRegistros("doses")
            .filter((item) => item.medicamentoId === medicamento.id)
            .map((item) => ({
                data: item.tomadaEm || `${item.data}T${item.horario === "Sem horário" ? "00:00" : item.horario}:00`,
                detalhe: item.status === "tomada" ? "Dose tomada" : item.status === "sem-estoque" ? "Sem estoque" : "Dose pendente",
                icone: "check",
            })),
        ...listarRegistros("reposicoes")
            .filter((item) => item.medicamentoId === medicamento.id)
            .map((item) => ({
                data: item.criadoEm,
                detalhe: `Reposição de ${item.quantidade} ${medicamento.unidade || "unidades"}`,
                icone: "cart-shopping",
            })),
    ].filter((item) => item.data).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    timeline.replaceChildren();
    if (!eventos.length) {
        timeline.append(mensagemVazia("Ainda não há eventos registrados para este medicamento."));
        return;
    }
    eventos.forEach((evento) => timeline.append(
        criarEventoTimeline(formatarDataHora(evento.data), evento.detalhe, evento.icone),
    ));
}

function criarEventoTimeline(data, detalhe, icone) {
    const item = document.createElement("div");
    item.className = "med-timeline-item";
    const simbolo = document.createElement("div");
    simbolo.className = `med-timeline-icon med-timeline-icon--${icone}`;
    simbolo.setAttribute("aria-hidden", "true");
    const fonte = document.createElement("i");
    fonte.className = `fa-solid fa-${icone}`;
    simbolo.append(fonte);
    const conteudo = document.createElement("div");
    conteudo.className = "med-timeline-content";
    const quando = document.createElement("span");
    quando.className = "med-timeline-title";
    quando.textContent = data;
    const texto = document.createElement("span");
    texto.className = "med-timeline-desc";
    texto.textContent = detalhe;
    conteudo.append(quando, texto);
    item.append(simbolo, conteudo);
    return item;
}

function configurarAcoes(medicamento) {
    const encerrar = document.querySelector("#btn-stop-treatment");
    if (encerrar) {
        encerrar.hidden = medicamento.status === "encerrado";
        encerrar.style.display = encerrar.hidden ? "none" : "";
        encerrar.addEventListener("click", () => {
            if (!window.confirm(`Encerrar o tratamento com ${medicamento.nome}?`)) return;
            try {
                atualizarMedicamento(medicamento.id, (registro) => ({
                    ...registro,
                    status: "encerrado",
                    encerradoEm: new Date().toISOString(),
                }));
                window.location.reload();
            } catch (erro) {
                mostrarErroMedicamento(erro.message);
            }
        });
    }

    document.querySelector("#btn-delete-medication")?.addEventListener("click", () => {
        if (!window.confirm(`Excluir ${medicamento.nome} e seu histórico de doses?`)) return;
        try {
            salvarRegistros("medicamentos", listarRegistros("medicamentos").filter((item) => item.id !== medicamento.id));
            salvarRegistros("doses", listarRegistros("doses").filter((item) => item.medicamentoId !== medicamento.id));
            const receitas = listarRegistros("receitas");
            const receitasAtualizadas = receitas.map((receita) =>
                receita.medicamentoId === medicamento.id ? { ...receita, medicamentoId: "" } : receita,
            );
            if (receitasAtualizadas.some((receita, indice) => receita !== receitas[indice])) {
                salvarRegistros("receitas", receitasAtualizadas);
            }
            window.location.href = "medicacoes.html";
        } catch (erro) {
            mostrarErroMedicamento(erro.message);
        }
    });
}

function atualizarMedicamento(id, atualizar) {
    const medicamentos = listarRegistros("medicamentos");
    const indice = medicamentos.findIndex((item) => item.id === id);
    if (indice < 0) throw new Error("O medicamento não foi encontrado.");
    medicamentos[indice] = atualizar(medicamentos[indice]);
    salvarRegistros("medicamentos", medicamentos);
}

function adicionarLinhaLote(caixa, rotulo, valor, destaque = false) {
    const linha = document.createElement("div");
    linha.className = "med-inner-box-row";
    const label = document.createElement("span");
    label.className = "med-inner-label";
    label.textContent = rotulo;
    const conteudo = document.createElement("span");
    conteudo.className = `med-inner-value${destaque ? " med-inner-value--highlight" : ""}`;
    conteudo.textContent = valor;
    linha.append(label, conteudo);
    caixa.append(linha);
}

function nomeCompleto(medicamento) {
    return [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
}

function rotuloTipo(tipo) {
    return tipo === "eventual" ? "Uso eventual" : tipo === "temporario" ? "Tratamento temporário" : "Uso contínuo";
}

function rotuloFrequencia(frequencia) {
    return { diario: "Todos os dias", especifico: "Dias específicos", intervalo: "A cada intervalo" }[frequencia] ?? "Não definida";
}

function formatarData(valor) {
    if (!valor) return "Não informada";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) return valor;
    const data = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
    return Number.isNaN(data.getTime())
        ? valor
        : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(data);
}

function mensagemVazia(texto) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = texto;
    return mensagem;
}

function mostrarErroMedicamento(mensagem) {
    const principal = document.querySelector("#main-content");
    if (!principal) {
        console.error(mensagem);
        return;
    }
    const alerta = document.createElement("p");
    alerta.setAttribute("role", "alert");
    alerta.textContent = mensagem;
    principal.prepend(alerta);
}
