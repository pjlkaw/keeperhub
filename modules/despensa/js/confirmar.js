/* =====================================================
   KEEPERHUB — DESPENSA / CONFIRMAR.JS

   Substitui o confirm() do navegador pelo modal de
   confirmação compartilhado do site
   (/shared/components/modal-confirmation.html).

   Uso:
       const ok = await confirmarAcao("Deseja excluir?");
       if (!ok) return;

   A página precisa ter:
   - <link rel="stylesheet" href="/shared/styles/modalConfirmation.css">
   - <section id="confirmation-modal" class="modalConfirm" style="display: none;"></section>
   - /shared/services/load-components.js (preenche o modal)
===================================================== */

export function confirmarAcao(mensagem) {

    const modal = document.getElementById("confirmation-modal");
    const texto = document.getElementById("confirmation-message");
    const botaoConfirmar = document.getElementById("confirm-btn");
    const botaoCancelar = document.getElementById("cancel-btn");

    /* Se o modal não carregou, usa o confirm() como reserva */
    if (!modal || !texto || !botaoConfirmar || !botaoCancelar) {
        return Promise.resolve(window.confirm(mensagem));
    }

    texto.textContent = mensagem;
    modal.style.display = "flex";
    botaoConfirmar.focus();

    return new Promise(resolve => {

        function fechar(resposta) {
            modal.style.display = "none";
            botaoConfirmar.removeEventListener("click", aoConfirmar);
            botaoCancelar.removeEventListener("click", aoCancelar);
            modal.removeEventListener("click", aoClicarFora);
            document.removeEventListener("keydown", aoTeclar);
            resolve(resposta);
        }

        function aoConfirmar() { fechar(true); }
        function aoCancelar() { fechar(false); }

        /* Clicar no fundo escuro cancela */
        function aoClicarFora(evento) {
            if (evento.target === modal) fechar(false);
        }

        /* Esc cancela */
        function aoTeclar(evento) {
            if (evento.key === "Escape") fechar(false);
        }

        botaoConfirmar.addEventListener("click", aoConfirmar);
        botaoCancelar.addEventListener("click", aoCancelar);
        modal.addEventListener("click", aoClicarFora);
        document.addEventListener("keydown", aoTeclar);

    });

}
