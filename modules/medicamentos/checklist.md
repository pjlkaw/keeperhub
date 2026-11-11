# Checklist de revisão — módulo Medicamentos

Escopo desta sessão: somente `modules/medicamentos`. Este checklist registra pontos para verificar; itens pendentes não significam que o código já tenha um erro confirmado.

Prioridade: **P4** visual/pequena; **P3** comportamento menor; **P2** funcionalidade ou persistência; **P1** dados, segurança ou bloqueio do módulo.

## P4 — Visual e clareza

- [x] Conferir que os dias da semana aparecem como botões selecionáveis iguais em adicionar e editar medicamento, com os dias salvos destacados ao abrir a edição.
- [x] Corrigir e conferir o selo “Em tratamento” cortado no cartão quando o resumo tem vários horários; testar em largura de celular e confirmar que o selo e a seta ficam visíveis.
- [x] Conferir o resumo de medicamento com vários horários. No exemplo enviado aparece `4 • 02:40 e 16:20 e 19:20 • Até...`; confirmar se `4` é a dose esperada e se deve mostrar unidade.
- [x] Remover a barra e a lupa da página de histórico recente.
- [x] Abrir o histórico recente e confirmar visualmente que a barra saiu e os registros continuam visíveis.

## P3 — Comportamento dos formulários

- [ ] Conferir mensagens de validação ao cadastrar medicamento com campos obrigatórios vazios ou inválidos.
- [ ] Conferir adicionar e remover horários no formulário e na edição.
- [ ] Conferir estados vazios e mensagens de erro nas páginas do módulo.

## P2 — Funcionalidade e persistência

- [x] Testar frequência por intervalo que atravessa a meia-noite (por exemplo, a cada 8 horas) e definir qual é o horário inicial esperado para gerar as doses corretamente.
- [x] Cadastrar um medicamento com 1, 2 e 3 horários e verificar se todos são salvos e reaparecem após recarregar.
- [x] Editar horários, salvar e confirmar que horários removidos não reaparecem.
- [x] Conferir se lista, detalhes, rotina e histórico mostram os dados salvos de forma consistente.
- [x] Conferir registro de dose, uso eventual, receita e movimentação de estoque.

## P1 — Integridade e acesso aos dados

- [ ] Conferir se as operações do módulo retornam erros claros quando a API ou o banco não estão disponíveis.
- [ ] Conferir se medicamentos e registros de uso ficam associados ao usuário correto.
- [ ] Conferir se falhas ao salvar ou atualizar não deixam dados duplicados ou inconsistentes.

## Achados confirmados

- A rotina por intervalo é gerada a partir das 08:00 e o laço só inclui horas menores que 24; assim, intervalos que deveriam atravessar a meia-noite não mostram a dose de 00:00 (ex.: intervalo de 8 horas gera 08:00 e 16:00). Falta confirmar qual horário inicial a rotina deve usar.
- O formulário de edição usava caixas de seleção nativas para os dias da semana, enquanto o cadastro já tinha o estilo de botões; agora os dois fluxos compartilham o mesmo visual e atualizam o destaque da seleção.
- O selo “Em tratamento” aparece cortado no cartão do medicamento com três horários, conforme a captura enviada. O `4` no resumo parece vir do campo de dose; falta confirmar se o formato mostrado é o esperado.
