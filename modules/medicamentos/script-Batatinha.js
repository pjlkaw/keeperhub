// Inicializador do módulo.
// Este arquivo coordena a execução das funções exportadas dos arquivos em /js,
// usando import/export e async functions para montar a lógica principal do módulo.

// MEDICAMENTOS =================================
// mudança de abas em medicacoes.html
import { mudarAbaMedicamentos } from "./js/interface.js";

document.addEventListener("DOMContentLoaded", () => {
    mudarAbaMedicamentos();
});

// SHARED =======================================
// alerts
import { alertShared } from "/shared/services/interface.js"


// DEV TOOL =====================================
document.addEventListener('keydown', (event) => {
    if (event.key === '9') {
        let oi = 'oi'
        alertShared(oi)
    }
});
