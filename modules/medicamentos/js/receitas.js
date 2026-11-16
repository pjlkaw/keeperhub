import { listarRegistros } from "./armazenamento.js";
import {
    adicionarAnexoReceitaApi,
    buscarReceitaApi,
    excluirAnexoReceitaApi,
    excluirReceitaApi,
    listarReceitasApi,
    salvarReceitaApi,
} from "./api.js";
import { mostrarRetornoFormulario } from "./formularios.js";
import { alertShared } from "/shared/services/interface.js";

const tamanhoMaximoAnexos = 1024 * 1024;
const tiposAnexoPermitidos = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

function confirmarAcao(mensagem) {
    return new Promise((resolver) => {
        const modal = document.querySelector("#confirmation-modal");
        if (!modal) {
            resolver(false);
            return;
        }

        const configurar = () => {
            const texto = modal.querySelector("#confirmation-message");
            const confirmar = modal.querySelector("#confirm-btn");
            const cancelar = modal.querySelector("#cancel-btn");
            if (!texto || !confirmar || !cancelar) return false;

            texto.textContent = mensagem;
            modal.style.display = "flex";
            confirmar.onclick = () => {
                modal.style.display = "none";
                resolver(true);
            };
            cancelar.onclick = () => {
                modal.style.display = "none";
                resolver(false);
            };
            return true;
        };

        if (configurar()) return;

        const observador = new MutationObserver(() => {
            if (configurar()) observador.disconnect();
        });
        observador.observe(modal, { childList: true, subtree: true });
        setTimeout(() => {
            observador.disconnect();
            if (modal.style.display !== "flex") resolver(false);
        }, 5000);
    });
}

// Exibe receitas locais nas listas e conecta o formulário e a tela de detalhes.
export async function inicializarReceitas() {
    preencherMedicamentos();
    try {
        const receitas = await listarReceitasApi();
        renderizarListas(receitas);
        inicializarFormulario();
        await mostrarDetalhesReceita();
    } catch (erro) {
        mostrarRetornoFormulario(document.querySelector("#main-content"), erro.message, true);
    }
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
            opcao.textContent = medicamento.nome;
            seletor.append(opcao);
        });
    } catch (erro) {
        mostrarRetornoFormulario(seletor.form, erro.message, true);
    }
}

function renderizarListas(receitas) {
    const listas = document.querySelectorAll(
        "#recipes-panel .meds-list, #main-content .prescriptions-list",
    );
    if (!listas.length) {
        return;
    }

    try {
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
                titulo: String(dados.get("title")).trim(),
                profissional: String(dados.get("professional")).trim(),
                especialidade: String(dados.get("specialty") ?? "").trim(),
                data: String(dados.get("date")),
                medicamentoId: String(dados.get("medication") ?? ""),
                anexos,
            };
            await salvarReceitaApi(receita);
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

async function mostrarDetalhesReceita() {
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
        const receita = await buscarReceitaApi(id);

        const voltar = document.querySelector("#btn-back-header");
        if (voltar) voltar.href = "receitas.html";
        document.querySelector("#prescription-title").textContent = receita.profissional;
        configurarExclusaoReceita(receita);
        const valores = document.querySelectorAll(".med-inner-box-row .med-inner-value");
        if (valores[0]) valores[0].textContent = receita.especialidade || "Não informada";
        if (valores[1]) valores[1].textContent = formatarData(receita.data);
        if (valores[2]) valores[2].textContent = medicamentoDaReceita(receita);
        renderizarAnexos(receita);
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

function renderizarAnexos(receita) {
    const secaoAnexos = document.querySelector("#attachment-title")?.closest(".med-card-section");
    const listaAnexos = secaoAnexos?.querySelector(".med-routine-list");
    if (!listaAnexos) return;

    listaAnexos.replaceChildren();
    if (!receita.anexos?.length) {
        mostrarListaAnexosVazia(listaAnexos, receita.id);
        return;
    }

    receita.anexos.forEach((anexo) => {
        const item = document.createElement("div");
        item.className = "med-attachment-item";

        const link = document.createElement("a");
        link.className = "med-routine-item med-attachment-link";
        link.href = anexo.url;
        link.download = anexo.nome;
        link.target = "_blank";
        link.rel = "noopener";
        link.innerHTML = '<i class="fa-solid fa-paperclip med-routine-icon" aria-hidden="true"></i>';
        const nome = document.createElement("span");
        nome.textContent = anexo.nome;
        link.append(nome);

        const remover = document.createElement("button");
        remover.type = "button";
        remover.className = "btn-meds-remove-attachment";
        remover.setAttribute("aria-label", `Remover anexo ${anexo.nome}`);
        remover.title = "Remover anexo";
        remover.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        remover.addEventListener("click", async (evento) => {
            evento.preventDefault();
            evento.stopPropagation();
            if (!await confirmarAcao(`Remover o anexo ${anexo.nome}?`)) return;

            remover.disabled = true;
            try {
                await excluirAnexoReceitaApi(anexo.id);
                const receitaAtualizada = await buscarReceitaApi(receita.id);
                renderizarAnexos(receitaAtualizada);
                alertShared("Anexo removido com sucesso.");
            } catch (erro) {
                remover.disabled = false;
                alertShared(erro.message);
            }
        });

        item.append(link, remover);
        listaAnexos.append(item);
    });
}

function mostrarListaAnexosVazia(lista, idReceita) {
    const mensagem = document.createElement("p");
    mensagem.className = "meds-empty-state";
    mensagem.textContent = "Nenhum arquivo anexado.";

    const adicionar = document.createElement("button");
    adicionar.type = "button";
    adicionar.className = "btn-meds-action";
    adicionar.innerHTML = '<i class="fa-solid fa-paperclip" aria-hidden="true"></i><span>Adicionar anexo</span>';

    const seletor = document.createElement("input");
    seletor.type = "file";
    seletor.accept = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
    seletor.hidden = true;
    adicionar.addEventListener("click", () => seletor.click());
    seletor.addEventListener("change", async () => {
        const arquivo = seletor.files?.[0];
        seletor.value = "";
        if (!arquivo) return;
        if (!tiposAnexoPermitidos.has(arquivo.type)) {
            alertShared("Escolha um PDF ou uma imagem válida.");
            return;
        }
        if (arquivo.size > tamanhoMaximoAnexos) {
            alertShared("O anexo precisa ter até 1 MB.");
            return;
        }

        adicionar.disabled = true;
        try {
            const anexo = await lerArquivo(arquivo);
            await adicionarAnexoReceitaApi(idReceita, anexo);
            const receitaAtualizada = await buscarReceitaApi(idReceita);
            renderizarAnexos(receitaAtualizada);
            alertShared("Anexo adicionado com sucesso.");
        } catch (erro) {
            adicionar.disabled = false;
            alertShared(erro.message || "Não foi possível adicionar o anexo.");
        }
    });

    lista.append(mensagem, adicionar, seletor);
}

function configurarExclusaoReceita(receita) {
    const botao = document.querySelector("#btn-delete-prescription");
    if (!botao) return;

    botao.onclick = async () => {
        const identificacao = receita.titulo || receita.profissional || "esta receita";
        if (!await confirmarAcao(`Excluir ${identificacao} e todos os seus anexos?`)) return;

        botao.disabled = true;
        try {
            await excluirReceitaApi(receita.id);
            alertShared("Receita excluída com sucesso.");
            window.location.href = "receitas.html";
        } catch (erro) {
            botao.disabled = false;
            alertShared(erro.message);
        }
    };
}

function medicamentoDaReceita(receita) {
    if (!receita.medicamentoId) {
        return "Não vinculado";
    }

    const medicamento = listarRegistros("medicamentos").find((item) => item.id === receita.medicamentoId);
    return medicamento
        ? medicamento.nome
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
