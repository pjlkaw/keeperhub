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
import { inicializarDetalhesMedicamento, inicializarLotesMedicamento } from "./js/detalhes-medicamento.js";
import { inicializarHabitos } from "./js/habitos.js";
import { inicializarListaMedicamentos } from "./js/medicamentos.js";
import { inicializarReceitas } from "./js/receitas.js";
import { listarRegistros } from "./js/armazenamento.js";
import { atualizarNoContent } from "/shared/services/no-content.js";

document.addEventListener("DOMContentLoaded", () => {
    mudarAbaMedicamentos();
    inicializarFormularios();
    inicializarFormularioMedicamento();
    inicializarInicioMedicamentos();
    inicializarRotinaMedicamentos();
    inicializarHistoricoMedicamentos();
    inicializarDashboardMedicamentos();
    inicializarDetalhesMedicamento();
    inicializarLotesMedicamento();
    inicializarHabitos();
    inicializarListaMedicamentos();
    inicializarReceitas();
    if (document.querySelector(".no-content-section")) {
        atualizarNoContent(listarRegistros("medicamentos").length > 0);
    }
});



// SHARED =======================================
// alerts
import { alertShared } from "/shared/services/interface.js"

// DEV TOOL =====================================
// adciona no-content.html para teste de desenvolvimento
document.addEventListener('keydown', (event) => {
    if (event.key === '8') {
        document.getElementById('confirmation-modal').style.display = 'flex';
        const mensagem = document.getElementById('confirmation-message');
        mensagem.textContent = 'Deseja realmente excluir este item?'; // Exemplo de mensagem

        const confirmBtn = document.getElementById('confirm-btn');
            confirmBtn.addEventListener('click', () => {
            // Ação a ser executada quando o usuário confirmar
            alertShared('Item excluído com sucesso!');
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
