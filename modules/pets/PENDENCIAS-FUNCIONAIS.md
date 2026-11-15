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
- [x] Exames e laudos são salvos no MySQL (`pet_exame`), com anexos no Vercel Blob
  (tabela `arquivo`); ver `js/consultas-integracao.md`.
- [ ] “Ver todos” ainda aguarda comportamento real.
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
- Receitas e exames já têm anexos (Vercel Blob + tabela `arquivo`); certificados de
  vacina ainda precisam de seu fluxo de arquivo.

## Despesas

- [x] Lançamentos por pet são persistidos no `localStorage`; resumo, orçamento
  mensal padrão, categorias, extrato e navegação entre meses usam os dados salvos.
- [x] A visão agregada de todos os pets identifica o animal em cada lançamento.
  Ao cadastrar a partir dela, a pessoa escolhe a qual pet atribuir o gasto para
  evitar duplicar uma compra compartilhada sem rateio definido.
- [x] A tela usa o no-content compartilhado quando o escopo não possui despesas.
- [x] O orçamento mensal de cada pet é editável na tela (toque no "previsto") e
  fica salvo no MySQL (`pet_orcamento`), um valor por pet e mês; sem valor, usa
  R$ 600,00. Editar e remover lançamentos já salvos também funciona.

## Rotinas diárias

- [x] Remover os horários, cuidados e observações de demonstração da página.
- [x] Mostrar o `no-content` compartilhado quando o pet não tem refeições ou
  observações da rotina alimentar salvas; a tela lê os dados atuais de
  `pet.rotinaAlimentar` no `localStorage`.
- [x] Permitir selecionar o pet quando há mais de um e manter o pet atual nos
  links para a edição da rotina alimentar.
- [x] O cadastro de rotina é um formulário único (higiene, alimentar e lazer), no
  padrão do formulário de medicamento, com seleção de pets. A persistência de
  higiene e lazer está feita (`rotinaHigiene` e `rotinaLazer` no pet), assim como
  a da rotina alimentar (`rotinaAlimentar.refeicoes`).
- [x] A edição e a remoção das rotinas passaram para a Rotina diária; a aba
  "Rotina Alimentar" e a página `editar-pet-rotina-alimentar.html` foram
  removidas do Editar pet.
- [x] As rotinas são salvas no MySQL pela API: higiene e lazer em `pet_rotina` e
  refeições em `pet_refeicao` (ver `js/rotinas-integracao.md`). A observação geral
  da rotina alimentar ainda fica no `localStorage`.
- [x] As notas de comportamento são salvas no MySQL (`pet_observacao`), com
  editar e remover (com desfazer) em cada nota.
