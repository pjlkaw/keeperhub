# Vacinações de Pets

As páginas `components/vacinacoes.html` e `components/adicionar-vacina.html`
usam `js/vacinacoes.js`. As vacinas ficam na tabela `vacina` do banco e chegam
pela API `api/modulos/pets-api.js`: a listagem de pets (`GET`) já traz
`pet.vacinas` de cada animal, e o cadastro usa `POST ?acao=vacina`.

O formulário permite selecionar um pet ou todos os pets cadastrados. Ao escolher
todos, a API grava um registro por pet numa única transação. Datas de hoje ou
passadas são salvas como aplicadas (`status = 'aplicada'`); datas futuras como
agendamentos (`status = 'agendada'`), que aparecem no cronograma sem entrar no
histórico de aplicações.

Colunas usadas: `nome` (código da vacina, como `v8`, ou o nome digitado quando a
opção é "Outra"), `status`, `data_aplicacao` (data escolhida no formulário),
`frequencia`, `data_proxima_dose`, `clinica`, `horario` e `observacao`.
Reforços anuais calculam a próxima data a partir da data escolhida; doses
fracionadas exigem uma data manual; dose única não cria uma próxima dose.

Ainda não é possível editar ou excluir vacinas, agendar notificações do sistema
ou anexar certificados.
