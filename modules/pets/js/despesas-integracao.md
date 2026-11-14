# Integração das despesas de Pets com Finanças

## Situação atual

As despesas ainda são locais. As telas chamam `despesas-repositorio.js`, que
preserva os dados em `pet.despesas` por meio do armazenamento local do módulo
Pets. A camada apresenta à tela um lançamento com `id`, `descricao`,
`categoria`, `valorCentavos`, `data`, `estabelecimento`, `observacoes`,
`criadaEm`, `petIds` e `petNome`.

O repositório tem operações assíncronas de listar, buscar, criar, editar e
excluir. A tela não precisa conhecer os IDs locais repetidos usados para
representar um lançamento compartilhado entre pets. O agrupamento local usa
`grupoId`; o lançamento aparece uma vez na visão de todos e em cada pet
associado quando o filtro é individual.

Nenhuma rota ou tabela foi alterada para esta preparação. `despesas.js` e
`cadastrar-despesa.js` não enviam as despesas para a API de Finanças.

## Contrato atual entre telas e repositório

O módulo usa estas operações de `despesas-repositorio.js`:

- `listarDespesas(petIds)`: lista as despesas relacionadas aos pets informados.
- `buscarDespesa(id)`: busca o lançamento e todos os pets associados.
- `criarDespesa(petIds, dados)`: cria uma despesa para os pets selecionados.
- `atualizarDespesa(id, petIds, dados)`: atualiza os campos e os vínculos.
- `excluirDespesa(id, petIds)`: remove os vínculos selecionados. A remoção
  iniciada pela visão de todos os pets inclui os pets associados àquele
  lançamento.

As operações são assíncronas para permitir que a implementação local seja
substituída por chamadas HTTP. O formato que as telas usam mantém o valor em
centavos e as categorias próprias de Pets.

## Integração desejada

Uma despesa cadastrada em Pets deve ser uma única transação no módulo Finanças,
associada a um ou mais pets. Finanças soma a transação uma vez; Pets mostra o
mesmo lançamento nos pets vinculados. Os dois módulos passam a ler e alterar a
mesma fonte de dados.

A API existente de Finanças trabalha com `lancamento`, exige `conta_id` e
recebe `tipo`, `valor` decimal, `descricao`, `categoria`, `data`, `vencimento`,
`status` e `observacoes`. Ela ainda não recebe os pets associados nem possui um
campo específico para o estabelecimento da despesa. O endpoint atual ignora
campos adicionais que não estejam no validador.

Uma proposta de dados para a operação originada em Pets:

```json
{
  "origem": "pets",
  "pet_ids": ["id-do-pet"],
  "conta_id": 12,
  "tipo": "despesa",
  "valor": 125.00,
  "descricao": "Banho",
  "categoria": "higiene",
  "data": "2026-11-14",
  "status": "pago",
  "estabelecimento": "Cobasi",
  "observacoes": null
}
```

Este exemplo é um contrato proposto, não uma rota ou schema aprovado. A API
deve obter o usuário pela sessão, validar a conta e todos os pets desse usuário
e gravar a transação e seus vínculos em uma transação de banco. O navegador
nunca deve enviar `usuario_id` como autoridade.

## Decisões para alinhar com a API

1. Definir o vínculo banco entre `lancamento` e `pet`. Como um lançamento pode
   envolver vários pets, uma tabela de associação é a opção mais flexível.
2. Definir como a pessoa escolhe a `conta_id` no cadastro de Pets: selecionar
   uma conta ou usar uma conta padrão escolhida em Finanças.
3. Definir o status inicial. O formulário de Pets hoje não pergunta se a
   despesa está paga; Finanças distingue `pending` e `pago`.
4. Definir o armazenamento de `estabelecimento` e o mapeamento das categorias
   `alimentacao`, `saude`, `higiene` e `lazer` para as categorias financeiras.
5. Alinhar edição e exclusão entre os módulos. Ao remover uma transação em
   Finanças, ela também deve deixar de aparecer em Pets. Na visão de um pet,
   excluir pode remover só o vínculo daquele pet; na visão de todos, pode
   remover o lançamento inteiro e todos os vínculos.
6. Preservar a opção “Desfazer”: a exclusão em Pets só é efetivada depois do
   prazo de 7 segundos. Se a API excluir definitivamente, a chamada deve ocorrer
   quando esse prazo acabar.

## Dados locais existentes

O cadastro compartilhado local cria cópias por pet e usa o mesmo `grupoId`.
Na migração, cada grupo precisa virar uma transação financeira, com todos os
seus pets associados; registros sem `grupoId` são despesas individuais. A
migração precisa ser idempotente e só remover os dados locais depois de
confirmar que foram gravados e conferidos no servidor.

As metas mensais (`orcamentosDespesas`) são configurações de acompanhamento,
não transações. A meta conjunta atual fica no `localStorage` e deve ter uma
decisão de persistência separada.

## Referências do projeto

- A camada usada pelas telas: `modules/pets/js/despesas-repositorio.js`.
- A rota financeira atual: `api/modulos/financas-api.js`.
- A persistência de transações: `server/repositories/financas/transacoes.js`.
- `docs/financas-db.sql` é um exemplo comentado com nomes de tabelas antigos;
  o repositório atual usa `lancamento`, `conta` e `categoria_financeira`.
