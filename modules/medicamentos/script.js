// Inicializador do módulo.
// Este arquivo coordena a execução das funções exportadas dos arquivos em /js,
// usando import/export e async functions para montar a lógica principal do módulo.

// MEDICAMENTOS =================================
// mudança de abas em medicacoes.html
import { mudarAbaMedicamentos } from "./js/interface.js";
import { inicializarFormularios } from "./js/formularios.js";
import { inicializarFormularioMedicamento } from "./js/formulario-medicamento.js";
import { inicializarInicioMedicamentos } from "./js/inicio.js";
import { inicializarRotinaMedicamentos } from "./js/rotina.js";
import { inicializarHistoricoMedicamentos } from "./js/historico.js";
import { inicializarDashboardMedicamentos } from "./js/dashboard.js";
import { inicializarDetalhesMedicamento } from "./js/detalhes-medicamento.js";
import { inicializarHabitos } from "./js/habitos.js";
import { inicializarListaMedicamentos } from "./js/medicamentos.js";
import { inicializarReceitas } from "./js/receitas.js";
import { listarMedicamentosApi, listarRegistrosUsoApi } from "./js/api.js";
import { definirMedicamentosDoBanco, definirRegistrosUsoDoBanco } from "./js/armazenamento.js";
import { atualizarNoContent } from "/shared/services/no-content.js";

document.addEventListener("DOMContentLoaded", async () => {
    const [medicamentos, registrosUso] = await Promise.allSettled([
        listarMedicamentosApi(),
        listarRegistrosUsoApi(),
    ]);
    if (medicamentos.status === "fulfilled") {
        definirMedicamentosDoBanco(medicamentos.value);
    } else {
        definirMedicamentosDoBanco(null);
        mostrarErroDeCarregamento(medicamentos.reason);
    }
    if (registrosUso.status === "fulfilled") {
        definirRegistrosUsoDoBanco(registrosUso.value);
    } else {
        definirRegistrosUsoDoBanco(null);
        mostrarErroDeCarregamento(registrosUso.reason);
    }

    mudarAbaMedicamentos();
    inicializarFormularios();
    await inicializarFormularioMedicamento();
    inicializarInicioMedicamentos();
    inicializarRotinaMedicamentos();
    inicializarHistoricoMedicamentos();
    inicializarDashboardMedicamentos();
    inicializarDetalhesMedicamento();
    inicializarHabitos();
    inicializarListaMedicamentos();
    inicializarReceitas();
    if (document.querySelector(".no-content-section")) {
        try {
            atualizarNoContent((await listarMedicamentosApi()).length > 0);
        } catch (erro) {
            console.error("Não foi possível atualizar o estado vazio dos medicamentos:", erro);
        }
    }
});

function mostrarErroDeCarregamento(erro) {
    const principal = document.querySelector("#main-content");
    if (!principal) return;
    const aviso = document.createElement("p");
    aviso.setAttribute("role", "alert");
    aviso.textContent = erro?.message || "Não foi possível carregar os dados do módulo.";
    principal.prepend(aviso);
}



// SHARED =======================================
// alerts
import { alertShared } from "/shared/services/interface.js"

// DEV TOOL =====================================
// adciona no-content.html para teste de desenvolvimento
document.addEventListener('keydown', (event) => {
    if (event.key === '8') {
        document.getElementById('confirmation-modal').style.display = 'flex';
        const mensagem = document.getElementById('confirmation-message');
        mensagem.textContent = 'Deseja realmente excluir todos os itens?'; // Exemplo de mensagem

        const confirmBtn = document.getElementById('confirm-btn');
            confirmBtn.addEventListener('click', () => {
            // Ação a ser executada quando o usuário confirmar
            alertShared('Itens excluídos com sucesso!');
            document.getElementById('confirmation-modal').style.display = 'none';

        });

        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn.addEventListener('click', () => {
            // Ação a ser executada quando o usuário cancelar
            document.getElementById('confirmation-modal').style.display = 'none';
        });
    }
});

// alerta
document.addEventListener('keydown', (event) => {
    if (event.key === '9') {
        let oi = 'oi'
        alertShared(oi)
    }
});
