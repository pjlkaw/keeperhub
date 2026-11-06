# Despesas de Pets — integração atual e próximos passos

A tela está em `components/despesas.html`, com lógica em `js/despesas.js`.
A persistência atual usa o `localStorage` por meio de `js/armazenamento.js`;
nenhum endpoint Node ou schema MySQL de despesas está conectado.

## Funcionamento local atual

- A pessoa escolhe o pet na própria tela quando houver mais de um. Se houver
  apenas um pet, ele é selecionado automaticamente. O ID segue na URL.
- Despesas ficam em `pet.despesas` e guardam `id`, `descricao`, `categoria`,
  `valorCentavos`, `data`, `estabelecimento`, `observacoes` e `criadaEm`.
- O resumo, os subtotais, percentuais e extrato são calculados a partir dos
  lançamentos locais do mês selecionado. O valor é guardado em centavos.
- O orçamento continua com o padrão visual existente de R$ 600,00; se houver
  valor em `pet.orcamentosDespesas[AAAA-MM]`, esse valor é usado para o mês.
  A tela ainda não oferece edição de orçamento.
- A consulta programada de exemplo não é registrada como despesa.

## Próximos passos para uma API Node.js

- Definir schema e autorização de acesso por pet antes de criar rotas. O
  repositório não contém uma tabela de despesas Pets.
- Migrar leitura e gravação do `localStorage` para um endpoint autenticado,
  preservando os campos e cálculos acima.
- Definir como orçamentos mensais serão configurados e persistidos.
- Considerar ações para editar/remover lançamentos, que ainda não existem na
  tela atual.

## Referência visual

Os números de Outubro/2024 (R$ 420,00 em despesas, teto de R$ 600,00 e saldo
de R$ 180,00) eram dados de demonstração e foram removidos da interface. O
teto de R$ 600,00 permanece como valor padrão visual enquanto não houver uma
configuração de orçamento na tela. A consulta programada continua fora do
extrato de despesas.

Os PNGs originais das categorias foram preservados na pasta `assets/img/`, mas
os ícones exibidos agora são Font Awesome.
