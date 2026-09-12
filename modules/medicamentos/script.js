// Inicializador do módulo.
// Este arquivo coordena a execução das funções exportadas dos arquivos em /js,
// usando import/export e async functions para montar a lógica principal do módulo.

// mudança de abas em medicacoes.html
import { mudarAbaMedicamentos } from "./js/interface.js";

document.addEventListener("DOMContentLoaded", () => {
    mudarAbaMedicamentos();
});
