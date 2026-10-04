import { criarIdLocal, listarRegistros, salvarRegistros } from "./armazenamento.js";
import { mostrarRetornoFormulario } from "./formularios.js";

const tamanhoMaximoAnexos = 1024 * 1024;

// Exibe receitas locais nas listas e conecta o formulário e a tela de detalhes.
export function inicializarReceitas() {
    preencherMedicamentos();
    renderizarListas();
    inicializarFormulario();
    mostrarDetalhesReceita();
}

function preencherMedicamentos() {
    const seletor = document.querySelector("#prescription-medication");
    if (!seletor) {
        return;
    }

    try {
        Array.from(seletor.options).slice(1).forEach((opcao) => opcao.remove());
        listarRegistros("medicamentos").filter((item) => item.status !== "encerrado").forEach((medicamento) => {
            const opcao = document.createElement("option");
            opcao.value = medicamento.id;
            opcao.textContent = [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ");
            seletor.append(opcao);
        });
    } catch (erro) {
        mostrarRetornoFormulario(seletor.form, erro.message, true);
    }
}

function renderizarListas() {
    const listas = document.querySelectorAll(
        "#recipes-panel .meds-list, #main-content .prescriptions-list",
    );
    if (!listas.length) {
        return;
    }

    try {
        const receitas = listarRegistros("receitas");
        listas.forEach((lista) => {
            const adicionar = lista.querySelector('a[href="adicionar-receita.html"]');
            lista.replaceChildren();
            if (adicionar) lista.append(adicionar);
            receitas.forEach((receita) => lista.append(criarCartaoReceita(receita)));
            if (!receitas.length) {
                const vazio = document.createElement("p");
                vazio.className = "meds-empty-state";
                vazio.textContent = "Nenhuma receita cadastrada.";
                lista.append(vazio);
            }
        });
    } catch (erro) {
        listas.forEach((lista) => {
            const alerta = document.createElement("p");
            alerta.setAttribute("role", "alert");
            alerta.textContent = erro.message;
            lista.before(alerta);
        });
    }
}

function criarCartaoReceita(receita) {
    const link = document.createElement("a");
    link.href = `receita-medicamento.html?id=${encodeURIComponent(receita.id)}`;

    const cartao = document.createElement("div");
    cartao.className = "card card--interactive med-card";
    cartao.setAttribute("role", "listitem");

    const ladoEsquerdo = document.createElement("div");
    ladoEsquerdo.className = "med-card-left";
    const icone = document.createElement("div");
    icone.className = "med-card-icon-wrap";
    icone.setAttribute("aria-hidden", "true");
    icone.innerHTML = '<i class="fa-solid fa-file-medical"></i>';

    const informacoes = document.createElement("div");
    informacoes.className = "med-card-info";
    const titulo = document.createElement("span");
    titulo.className = "med-card-name";
    titulo.textContent = receita.titulo;
    const detalhes = document.createElement("span");
    detalhes.className = "med-card-details";
    detalhes.textContent = `${receita.profissional}${receita.data ? ` • ${formatarData(receita.data)}` : ""}`;
    informacoes.append(titulo, detalhes);
    ladoEsquerdo.append(icone, informacoes);

    const ladoDireito = document.createElement("div");
    ladoDireito.className = "med-card-right";
    ladoDireito.innerHTML = '<span class="med-card-arrow" aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>';
    cartao.append(ladoEsquerdo, ladoDireito);
    link.append(cartao);
    return link;
}

function inicializarFormulario() {
    const formulario = document.querySelector("#form-add-prescription");
    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        if (!formulario.reportValidity()) {
            return;
        }

        const arquivos = Array.from(formulario.querySelector("#prescription-files").files);
        const tamanhoTotal = arquivos.reduce((total, arquivo) => total + arquivo.size, 0);
        if (tamanhoTotal > tamanhoMaximoAnexos) {
            mostrarRetornoFormulario(formulario, "Os anexos precisam ter até 1 MB no total.", true);
            return;
        }

        const dados = new FormData(formulario);
        try {
            const anexos = await Promise.all(arquivos.map(lerArquivo));
            const receita = {
                id: criarIdLocal(),
                titulo: String(dados.get("title")).trim(),
                profissional: String(dados.get("professional")).trim(),
                especialidade: String(dados.get("specialty") ?? "").trim(),
                data: String(dados.get("date")),
                medicamentoId: String(dados.get("medication") ?? ""),
                orientacao: String(dados.get("instructions") ?? "").trim(),
                anexos,
                criadoEm: new Date().toISOString(),
            };

            const receitas = listarRegistros("receitas");
            receitas.unshift(receita);
            // Provisório: receita e anexos ficam no localStorage deste navegador, não em um servidor.
            salvarRegistros("receitas", receitas);
            console.log("[Medicamentos] Receita salva localmente (provisória):", receita);
            window.location.href = "receitas.html";
        } catch (erro) {
            mostrarRetornoFormulario(formulario, erro.message || "Não foi possível salvar a receita.", true);
        }
    });
}

function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.addEventListener("load", () => {
            if (typeof leitor.result !== "string") {
                reject(new Error(`Não foi possível ler o anexo ${arquivo.name}.`));
                return;
            }

            resolve({
                nome: arquivo.name,
                tipo: arquivo.type || "application/octet-stream",
                conteudo: leitor.result,
            });
        });
        leitor.addEventListener("error", () => {
            reject(new Error(`Não foi possível ler o anexo ${arquivo.name}.`));
        });
        leitor.readAsDataURL(arquivo);
    });
}

function mostrarDetalhesReceita() {
    const id = new URLSearchParams(window.location.search).get("id");
    const tituloProfissional = document.querySelector("#prescription-title");
    if (!tituloProfissional || document.querySelector("#form-add-prescription")) {
        return;
    }

    try {
        tituloProfissional.textContent = "";
        document.querySelectorAll(".med-inner-box-row .med-inner-value").forEach((item) => {
            item.textContent = "";
        });
        document.querySelector("#attachment-title")?.closest(".med-card-section")?.querySelector(".med-routine-list")?.replaceChildren();
        if (!id) throw new Error("Selecione uma receita na lista para ver os detalhes.");
        const receita = listarRegistros("receitas").find((item) => item.id === id);
        if (!receita) {
            throw new Error("Esta receita não foi encontrada no armazenamento local.");
        }

        const voltar = document.querySelector("#btn-back-header");
        if (voltar) voltar.href = "receitas.html";
        document.querySelector("#prescription-title").textContent = receita.profissional;
        const valores = document.querySelectorAll(".med-inner-box-row .med-inner-value");
        if (valores[0]) valores[0].textContent = receita.especialidade || "Não informada";
        if (valores[1]) valores[1].textContent = formatarData(receita.data);
        if (valores[2]) valores[2].textContent = medicamentoDaReceita(receita);
        if (valores[3]) valores[3].textContent = receita.orientacao || "Sem orientação informada";

        const secaoAnexos = document.querySelector("#attachment-title")?.closest(".med-card-section");
        const listaAnexos = secaoAnexos?.querySelector(".med-routine-list");
        if (listaAnexos) {
            listaAnexos.replaceChildren();
            (receita.anexos ?? []).forEach((anexo) => {
                const link = document.createElement("a");
                link.className = "med-routine-item";
                link.href = anexo.conteudo;
                link.download = anexo.nome;
                link.target = "_blank";
                link.rel = "noopener";
                link.innerHTML = '<i class="fa-solid fa-paperclip med-routine-icon" aria-hidden="true"></i>';
                const nome = document.createElement("span");
                nome.textContent = anexo.nome;
                link.append(nome);
                listaAnexos.append(link);
            });

            if (!receita.anexos?.length) {
                const mensagem = document.createElement("p");
                mensagem.textContent = "Nenhum arquivo anexado.";
                listaAnexos.append(mensagem);
            }
        }
    } catch (erro) {
        const principal = document.querySelector("#main-content");
        if (principal) {
            const alerta = document.createElement("p");
            alerta.setAttribute("role", "alert");
            alerta.textContent = erro.message;
            principal.prepend(alerta);
        } else {
            console.error(erro);
        }
    }
}

function medicamentoDaReceita(receita) {
    if (!receita.medicamentoId) {
        return "Não vinculado";
    }

    const medicamento = listarRegistros("medicamentos").find((item) => item.id === receita.medicamentoId);
    return medicamento
        ? [medicamento.nome, medicamento.concentracao].filter(Boolean).join(" ")
        : "Medicamento não encontrado";
}

function formatarData(valor) {
    if (!valor) {
        return "Não informada";
    }

    const data = new Date(`${valor}T00:00:00`);
    return Number.isNaN(data.getTime())
        ? valor
        : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(data);
}
