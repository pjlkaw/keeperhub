# Consultas e histórico de Pets

As telas `consultas-exames.html` e `cadastrar-consulta.html` usam `js/consultas.js`.
As consultas ficam na tabela `consulta` do banco e chegam pela API
`api/modulos/pets-api.js`: a listagem de pets (`GET`) já traz `pet.consultas` de
cada animal.

Rotas usadas pela tela:

- `POST ?acao=consulta` cadastra um registro por pet em uma transação e devolve os IDs criados.
- `PUT ?acao=consulta` atualiza os dados e a associação de pets em uma transação.
- `DELETE ?acao=consulta` remove os registros do card após validar a conta.
- `PUT ?acao=consulta-realizada` recebe os IDs do card e registra o atendimento com o resumo em uma transação.

Em “Todos os pets”, os IDs devolvidos pelo mesmo cadastro são associados a um
card coletivo neste navegador. Na edição, `petIdsOrigem` identifica os pets dos
registros existentes e `petIds` contém a seleção atual: os registros mantidos
são atualizados, os desmarcados são removidos e os novos pets recebem uma cópia.
A API valida a conta na sessão e a propriedade dos pets antes de confirmar a
transação. Os IDs criados ou mantidos retornam para reconstruir o grupo visual.

Colunas usadas: `veterinario` (médico), `especialidade` (código, como
`clinico_geral`, ou o texto digitado quando a opção é "Outra"), `clinica`,
`data` (data e horário), `status` (`agendada` ou `realizada`), `realizada_em`,
`lembrete_ativo` e `observacoes` (resumo do atendimento). Datas passadas já
entram como realizadas. O lembrete guarda só a preferência: não agenda
notificações do sistema.

Arquivos de exames e laudos ainda não são persistidos. A seção visual de exames
permanece separada e requer um fluxo próprio (tabela `pet_exame` e envio de
arquivos) antes de aceitar uploads reais.
