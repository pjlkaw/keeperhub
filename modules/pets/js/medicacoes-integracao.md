# Medicações de Pets

As páginas `components/medicacoes.html` e `components/cadastrar-medicacao.html`
usam `js/medicacoes.js`. Os registros são vinculados ao pet e persistidos em
`pet.medicacoes` por `js/armazenamento.js` no `localStorage`.

Cada registro guarda `id`, `nome`, `tipoUso`, `dosagem`, `horarioDose`,
`frequencia`, `dataFim`, `quantidadeEstoque`, `observacao` e `criadaEm`. A lista
separa uso contínuo, tratamentos temporários, uso eventual e tratamentos
temporários concluídos. Busca e filtro por tipo atuam sobre os dados locais.
Tratamentos temporários com data final anterior a hoje aparecem no histórico.

O estoque baixo é sinalizado quando restam duas unidades ou menos. O fluxo
atual não agenda horários, registra doses administradas ou envia notificações.
Receitas e anexos seguem como uma etapa separada, sem persistência neste fluxo.
