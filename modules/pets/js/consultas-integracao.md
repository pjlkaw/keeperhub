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
entram como realizadas. Médico, especialidade e clínica são opcionais; data e
horário continuam obrigatórios. Se a especialidade "Outra" for escolhida, o
texto da especialidade precisa ser preenchido. O lembrete guarda só a preferência: não agenda
notificações do sistema.


## Exames e laudos

A seção "Exames e Laudos" de `components/consultas-exames.html` usa `js/exames-lista.js`;
o cadastro e a edição ficam em `components/cadastrar-exame.html` (`js/cadastrar-exame.js`).
Cada registro é de um pet só e não fica ligado a uma consulta (a coluna `consulta_id` continua
vazia). O campo `tipo_registro` distingue `exame` de `laudo` na mesma tabela `pet_exame`;
registros anteriores à migração recebem o padrão `exame`. Dados da tabela incluem `nome` até 150,
`data_exame` opcional e não futura,
`resultado` até 5000, `observacao` até 2000). Os anexos (PDF, JPG, PNG ou WEBP; até 10
arquivos e 1 MB no total por exame) vão para o Vercel Blob e ficam registrados na tabela
`arquivo` com `entidade_tipo = 'exame'`, como os anexos de receita do módulo Medicamentos.
A listagem de pets traz `pet.exames` com os `anexos` de cada um. Rotas: `POST
?acao=exame` (`petId` + dados + `anexos`), `PUT ?acao=exame&id=` (dados, `anexos` novos e
`removerAnexos`) e `DELETE ?acao=exame&id=` (apaga também os arquivos do Blob). Um pet que
só tem exames também mostra a página. Anexos novos seguem o fluxo público e a conexão
geral do Blob usada pelo módulo de Medicamentos; não exigem `PETS_BLOB_READ_WRITE_TOKEN`.
