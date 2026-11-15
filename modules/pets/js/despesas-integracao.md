# Despesas de Pets

A lista fica em `components/despesas.html` (`js/despesas.js`) e o cadastro/edição em
`components/cadastrar-despesa.html` (`js/cadastrar-despesa.js`). As duas telas usam só
`js/despesas-repositorio.js`, que grava pela API `api/modulos/pets-api.js`; a listagem de
pets (`GET`) já traz `pet.despesas` de cada animal.

## Contrato entre telas e repositório

- `listarDespesas(petIds)`: lista as despesas dos pets informados (agrupadas).
- `buscarDespesa(id)`: busca o lançamento com todos os pets associados.
- `criarDespesa(petIds, dados)`: cria a despesa para os pets selecionados.
- `atualizarDespesa(id, petIds, dados)`: atualiza os campos e os pets vinculados.
- `excluirDespesa(id, petIds)`: remove a despesa dos pets informados.

Uma despesa cadastrada para vários pets aparece uma vez na visão "Todos os pets"
(agrupada por `grupoId`, guardado em `keeperhub-pets-grupos`) e em cada pet quando o
filtro é individual. O valor mostrado é a soma das partes dos pets incluídos.

## Como fica no banco

Cada despesa é também um lançamento do módulo Finanças:

- `lancamento` guarda valor, data, descrição e observações, com `tipo = 'despesa'`,
  `status = 'pago'` e `pet_id` preenchido;
- `pet_despesa` liga o pet ao lançamento (`lancamento_id`) e guarda `categoria` e
  `estabelecimento`.

Na primeira despesa, a API cria para o usuário a conta "Pets" (tipo carteira) e a
categoria financeira "Pets"; as próximas reutilizam as duas. Quando a despesa é de
vários pets, o valor total é dividido entre eles (os centavos que sobram ficam com os
primeiros), e o total em Finanças é o valor realmente gasto.

Rotas: `POST ?acao=despesa` cadastra; `PUT ?acao=despesa` edita, divide o valor de novo
e permite trocar os pets (`ids` + `petIdsOrigem`); `DELETE ?acao=despesa` exclui a
despesa e o lançamento. Todas rodam em transação e conferem que os pets e as despesas
são do usuário. O valor trafega em centavos (`valorCentavos`).

## Metas mensais

A meta de cada pet fica na tabela `pet_orcamento` (`pet_id`, `mes` `AAAA-MM`, `valor`
DECIMAL(10,2); um valor por pet e mês), gravada por `PUT ?acao=orcamento` (`petId`,
`mes`, `valorCentavos`); a listagem traz `pet.orcamentosDespesas`
(`{ 'AAAA-MM': centavos }`). Sem meta salva, o pet fica sem limite no mês.

A meta conjunta ("Todos os pets juntos") ainda fica só neste navegador
(`localStorage`), porque a tabela guarda um valor por pet.

## O que continua de fora

Despesas e metas salvas antes só no navegador não foram migradas.
