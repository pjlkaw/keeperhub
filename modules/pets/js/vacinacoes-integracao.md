# Vacinações de Pets

As páginas `components/vacinacoes.html` e `components/cadastrar-registro.html?tipo=vacina`
usam `js/vacinacoes.js`. As vacinas ficam na tabela `vacina` do banco e chegam
pela API `api/modulos/pets-api.js`: a listagem de pets (`GET`) já traz
`pet.vacinas` de cada animal. O cadastro usa `POST ?acao=vacina`; a edição usa
`PUT ?acao=vacina`, e a exclusão usa `DELETE ?acao=vacina`, validando a conta
de cada registro.

Na edição, a tela envia os IDs e pets de origem e a seleção atual. A API confere
a propriedade dos registros e dos pets de destino e, em uma transação, atualiza
os registros mantidos, remove os pets desmarcados e cria cópias para os novos.

O formulário permite selecionar um, vários ou todos os pets. A API grava um
registro por pet numa única transação. Os IDs devolvidos pelo cadastro permitem
exibir um card coletivo neste navegador. Datas de hoje ou
passadas são salvas como aplicadas (`status = 'aplicada'`); datas futuras como
agendamentos (`status = 'agendada'`), que aparecem no cronograma sem entrar no
histórico de aplicações. O cronograma permite editar os dados do registro e
marcar uma vacina agendada como aplicada. A confirmação registra a data de hoje;
para reforço anual, a próxima dose passa a ser um ano após a confirmação.

Colunas usadas: `nome` (código da vacina, como `v8`, ou o nome digitado quando a
opção é "Outra"), `status`, `data_aplicacao` (data escolhida no formulário),
`frequencia`, `data_proxima_dose`, `clinica`, `horario` e `observacao`.
Reforços anuais calculam a próxima data a partir da data escolhida; doses
fracionadas exigem uma data manual; dose única não cria uma próxima dose.

Não há notificações do sistema ou anexos de certificados.
