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
doses administradas e não envia notificações. As receitas ficam numa página própria
(ver abaixo).

## Receitas dos pets

A página `components/receitas.html` (link "Ver receitas" em Medicações) usa `js/receitas.js`;
o cadastro e a edição ficam em `components/cadastrar-receita.html` (`js/cadastrar-receita.js`).
A receita é de um pet só e não fica ligada a uma medicação. Dados na tabela `pet_receita`
(`nome` até 150, `veterinario` até 150, `data_emissao` não futura, `data_validade` não
anterior à emissão, `concluida_em` e `observacao` até 2000). A lista separa "Receitas
Ativas" (sem validade ou com validade em dia) e "Histórico" (expiradas ou concluídas), tem
busca por nome ou veterinário e as ações Editar, Concluir/Reabrir e Remover (com desfazer).
Os anexos (PDF, JPG, PNG ou WEBP; até 10 arquivos e 1 MB no total) vão para o Vercel Blob e
ficam na tabela `arquivo` com `entidade_tipo = 'pet_receita'`, pelo mesmo módulo dos anexos
de exames (`server/repositories/pets/anexos.js`). Rotas: `POST ?acao=receita`, `PUT
?acao=receita&id=`, `PUT ?acao=receita-concluida&id=` (`concluida: true | false`) e
`DELETE ?acao=receita&id=`. A listagem de pets traz `pet.receitas` com os `anexos`.
