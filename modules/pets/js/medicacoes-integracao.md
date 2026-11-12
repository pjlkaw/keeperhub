# Medicações de Pets

As páginas `components/medicacoes.html` e `components/cadastrar-registro.html?tipo=medicamento`
usam `js/medicacoes.js`. Os registros são vinculados ao pet e persistidos em
`pet.medicacoes` por `js/armazenamento.js` no `localStorage`.

Cada registro guarda `id`, `nome`, `tipoUso`, `dosagem`, `horarioDose`,
`frequencia`, `dataFim`, `quantidadeEstoque`, `observacao` e `criadaEm`. A lista
separa uso contínuo, tratamentos temporários, uso eventual e tratamentos
temporários concluídos. A lista oferece a visão “Todos os pets”, que agrega os
registros de cada animal e identifica o pet no card. Busca e filtro por tipo
atuam sobre os dados locais. Quando o escopo selecionado não possui registros,
a tela usa o no-content compartilhado sem mensagens vazias duplicadas.
Tratamentos temporários com data final anterior a hoje aparecem no histórico.
Os cartões permitem editar ou excluir o registro no formulário unificado. As
alterações permanecem no `localStorage` e não chamam uma rota de API.

O estoque baixo é sinalizado quando restam duas unidades ou menos. O fluxo
atual não agenda horários, registra doses administradas ou envia notificações.
Receitas e anexos seguem como uma etapa separada, sem persistência neste fluxo.
