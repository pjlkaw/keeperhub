# Consultas e histórico de Pets

As telas `consultas-exames.html` e `cadastrar-consulta.html` usam `js/consultas.js`.
As consultas ficam na tabela `consulta` do banco e chegam pela API
`api/modulos/pets-api.js`: a listagem de pets (`GET`) já traz `pet.consultas` de
cada animal.

Rotas usadas pela tela:

- `POST ?acao=consulta` cadastra a consulta para um, vários ou todos os pets
  (um registro por pet, numa transação);
- `PUT ?acao=consulta-lembrete&id=` liga ou desliga o lembrete;
- `PUT ?acao=consulta-realizada&id=` move a consulta para o histórico com o resumo.

Colunas usadas: `veterinario` (médico), `especialidade` (código, como
`clinico_geral`, ou o texto digitado quando a opção é "Outra"), `clinica`,
`data` (data e horário), `status` (`agendada` ou `realizada`), `realizada_em`,
`lembrete_ativo` e `observacoes` (resumo do atendimento). Datas passadas já
entram como realizadas. O lembrete guarda só a preferência: não agenda
notificações do sistema.

Arquivos de exames e laudos ainda não são persistidos. A seção visual de exames
permanece separada e requer um fluxo próprio (tabela `pet_exame` e envio de
arquivos) antes de aceitar uploads reais.
