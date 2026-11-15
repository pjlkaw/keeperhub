# Medicações de Pets

As páginas `components/medicacoes.html` e `components/cadastrar-registro.html?tipo=medicamento`
usam `js/medicacoes.js`. As medicações ficam na tabela `pet_medicacao` do banco e
chegam pela API `api/modulos/pets-api.js`: a listagem de pets (`GET`) já traz
`pet.medicacoes` de cada animal.

Rotas usadas pela tela:

- `POST ?acao=medicacao` cadastra para um, vários ou todos os pets (um registro por pet);
- `PUT ?acao=medicacao` edita e permite trocar os pets associados (`ids` + `petIdsOrigem`);
- `PUT ?acao=medicacao-concluida` move o tratamento para o histórico (`concluida_em` = hoje);
- `DELETE ?acao=medicacao` exclui os registros.

Todas conferem, numa transação, que os pets e as medicações pertencem ao usuário.
Colunas usadas: `nome`, `tipo_uso` (`continuo`, `temporario` ou `eventual`),
`dosagem`, `horario_dose` (uso contínuo), `frequencia` e `data_fim` (temporário),
`concluida_em`, `quantidade_estoque` e `observacao`. O agrupamento visual de um
cadastro feito para vários pets fica no navegador (`keeperhub-pets-grupos`), como
em vacinas e consultas.

A lista separa uso contínuo, tratamentos temporários, uso eventual e o histórico
(tratamentos concluídos ou temporários com data final anterior a hoje), com a
visão "Todos os pets", busca e filtro por tipo. O estoque baixo é sinalizado
quando restam duas unidades ou menos. O fluxo não agenda horários, não registra
doses administradas e não envia notificações. Receitas e anexos seguem como uma
etapa separada.
