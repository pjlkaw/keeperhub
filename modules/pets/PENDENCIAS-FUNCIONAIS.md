# Revisão funcional — módulo Pets

Atualizado em 2026-11-02. Este registro acompanha funcionalidades que ainda
precisam de decisão ou integração; ele não altera regras da pasta `shared`.

## Consultas e exames

- [x] O cadastro aceita datas passadas e registra essas consultas como realizadas.
- [x] O mesmo agendamento pode ser salvo para todos os pets ou para uma seleção
  de pets. Cada pet mantém seu registro local, relacionado por `grupoId`.
- [x] A lista de consultas localiza corretamente suas listas depois da inserção
  dinâmica do seletor de pet.
- [x] A página usa o no-content compartilhado quando o pet ainda não tem
  consultas; o seletor e o botão de cadastro permanecem acessíveis.
- [ ] Decidir se o controle **Lembrar** permanece. Hoje ele grava uma preferência
  local por consulta, mas não agenda notificações nem alarmes do sistema.
- [x] Remover os cartões fictícios de exames e laudos e deixar a lista com estado
  vazio até existirem registros reais. A página também usa o no-content
  compartilhado no primeiro cadastro, antes de existir consulta registrada.
- [ ] Integrar o upload, a persistência, a visualização e o download de exames e
  laudos. “Ver todos” também aguarda comportamento real. Parte do histórico médico
  ainda usa exemplos estáticos e precisa ser substituída por registros reais.
- [ ] Decidir se a confirmação de consulta criada para vários pets deve atualizar
  todos os registros do mesmo `grupoId` ou somente o pet aberto.

## Vacinações

- [x] O cadastro permite datas futuras e o registro em mais de um pet.
- [ ] Definir o fluxo para transformar uma vacina agendada em aplicação registrada
  quando o atendimento acontecer. Até lá, um agendamento vencido continua marcado
  como atrasado.
- [ ] Notificações de vacina ainda não são enviadas pelo navegador.

## Medicações

- [x] A lista possui estado vazio compartilhado e visão agregada de todos os pets,
  com o nome do animal em cada card.
- [ ] Revisar ações de editar e remover medicações, que ainda não fazem parte deste
  fluxo da lista.
- [ ] O acompanhamento de uso não registra cada dose administrada nem envia
  lembretes. O histórico atual considera tratamentos temporários cuja data final
  já passou.

## Armazenamento e integrações

- Os cadastros de consultas, vacinas e medicações são mantidos no `localStorage`
  deste navegador; não sincronizam entre dispositivos.
- Receitas, certificados de vacina e anexos de exames ainda precisam de seus
  fluxos de arquivo e persistência definidos.

## Despesas

- [x] Lançamentos por pet são persistidos no `localStorage`; resumo, orçamento
  mensal padrão, categorias, extrato e navegação entre meses usam os dados salvos.
- [x] A visão agregada de todos os pets identifica o animal em cada lançamento.
  Ao cadastrar a partir dela, a pessoa escolhe a qual pet atribuir o gasto para
  evitar duplicar uma compra compartilhada sem rateio definido.
- [x] A tela usa o no-content compartilhado quando o escopo não possui despesas.
- [ ] Definir uma interface para editar o orçamento mensal atualmente padrão em
  R$ 600,00 por pet, e ações para editar/remover lançamentos já salvos.

## Rotinas diárias

- [x] Remover os horários, cuidados e observações de demonstração da página.
- [x] Mostrar o `no-content` compartilhado quando o pet não tem refeições ou
  observações da rotina alimentar salvas; a tela lê os dados atuais de
  `pet.rotinaAlimentar` no `localStorage`.
- [x] Permitir selecionar o pet quando há mais de um e manter o pet atual nos
  links para a edição da rotina alimentar.
- [ ] A tela de cadastro de rotina ainda não persiste atividades de higiene e
  bem-estar; a linha do dia e esses cuidados exibem estados vazios até essa
  integração existir.
- [ ] As anotações de comportamento ainda não são persistidas; o campo de
  anotação não grava dados no momento.
