# Despesas de Pets

A tela está em `components/despesas.html`, com lógica em `js/despesas.js`. As
despesas ficam no banco e chegam pela API `api/modulos/pets-api.js`: a listagem de
pets (`GET`) já traz `pet.despesas` de cada animal.

## Como fica no banco

Cada despesa é também um lançamento do módulo Finanças:

- `lancamento` guarda valor, data, descrição e observações, com `tipo = 'despesa'`,
  `status = 'pago'` e `pet_id` preenchido;
- `pet_despesa` liga o pet ao lançamento (`lancamento_id`) e guarda `categoria` e
  `estabelecimento`.

Na primeira despesa, a API cria para o usuário a conta "Pets" (tipo carteira) e a
categoria financeira "Pets"; as próximas despesas reutilizam as duas. Assim os
gastos dos pets aparecem também em Finanças.

Quando a despesa é registrada para vários pets, o valor total é dividido entre
eles (os centavos que sobram ficam com os primeiros). O card agrupado mostra a
soma, e o total em Finanças é o valor realmente gasto.

## Rotas

- `POST ?acao=despesa` cadastra para um ou vários pets;
- `PUT ?acao=despesa` edita, divide o valor de novo e permite trocar os pets
  associados (`ids` + `petIdsOrigem`);
- `DELETE ?acao=despesa` exclui a despesa e o lançamento correspondente.

Todas rodam em transação e conferem que os pets e as despesas são do usuário. O
valor trafega em centavos (`valorCentavos`), como a tela já calculava.

## Orçamento mensal

O orçamento fica na tabela `pet_orcamento` (`pet_id`, `mes` no formato `AAAA-MM`,
`valor` DECIMAL(10,2); um valor por pet e mês). A listagem de pets traz
`pet.orcamentosDespesas` (`{ 'AAAA-MM': centavos }`) e a rota `PUT ?acao=orcamento`
(`petId`, `mes`, `valorCentavos`) grava ou troca o valor do mês. Na tela, com um pet
selecionado, o valor "previsto" abre um campo para editar o orçamento do mês exibido;
em "Todos os pets" o previsto é a soma e não pode ser editado. Mês sem valor salvo
usa o padrão de R$ 600,00 por pet; zero é aceito.

## O que continua de fora

A consulta programada de exemplo não é registrada como despesa. Despesas e
orçamentos salvos antes só no navegador não foram migrados.

Os PNGs originais das categorias foram preservados na pasta `assets/img/`, mas
os ícones exibidos agora são Font Awesome.
