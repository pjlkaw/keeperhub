# Rotinas de Pets

As páginas `components/rotina-diaria.html` e `components/cadastrar-rotina.html` usam
`js/rotina-diaria.js`, `js/cadastrar-rotina.js` e `js/rotinas-armazenamento.js`.
As regras puras (catálogos, validação e em que dia cada rotina aparece) continuam em
`js/rotinas.js`. As rotinas chegam pela API `api/modulos/pets-api.js`: a listagem de
pets (`GET`) já traz `pet.rotinaHigiene`, `pet.rotinaLazer` e
`pet.rotinaAlimentar.refeicoes` de cada animal.

Onde cada tipo fica no banco:

- higiene e lazer: tabela `pet_rotina` (`tipo` = `higiene` ou `lazer`), com
  `atividade`, `nome` (texto mostrado: o rótulo da atividade ou o nome digitado em
  "Outro"), `frequencia`, `dias_semana` (ex.: `1,3,5`, de 0 = domingo a 6 = sábado),
  `data_inicio`, `horario`, `duracao_min` e `observacao`;
- alimentar: tabela `pet_refeicao`, com `nome`, `horario` e `observacao`.

Rotas usadas pelas telas (o tipo da rotina vai no corpo):

- `POST ?acao=rotina` cadastra para um, vários ou todos os pets (um registro por pet);
- `PUT ?acao=rotina` edita e permite trocar os pets associados (`ids` + `petIdsOrigem`);
- `DELETE ?acao=rotina` exclui os registros (`tipo` + `ids`).

Todas conferem, numa transação, que os pets e as rotinas pertencem ao usuário.
Um cadastro feito para vários pets guarda o mesmo `grupo_id` no banco e aparece
como um card só, como nas medicações. Na Rotina diária, "Remover" apaga a rotina só do pet aberto, com a
opção de desfazer; os outros pets do grupo continuam com ela.

Nada das rotinas fica no navegador. A antiga observação geral da rotina alimentar
(`rotinaAlimentar.observacoes`, só no navegador) saiu da tela; cada refeição tem a
sua própria observação no banco.
