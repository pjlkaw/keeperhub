# Vacinações de Pets

As páginas `components/vacinacoes.html` e `components/adicionar-vacina.html`
usam `js/vacinacoes.js`. O formulário vincula o registro ao pet selecionado e
persiste em `pet.vacinas` pelo `localStorage` encapsulado em
`js/armazenamento.js`.

Cada registro guarda `id`, `nome`, `nomePersonalizado`, `dataAplicacao`,
`frequencia`, `proximaDose`, `observacao` e `criadaEm`. Reforços anuais calculam
a próxima data a partir da aplicação; doses fracionadas exigem uma data manual;
dose única não cria uma próxima dose. A agenda mostra a próxima dose mais
recente de cada vacina, identifica vencimentos e mantém o histórico das
aplicações registradas.

O cadastro não agenda notificações do sistema e ainda não permite anexar
certificados. A futura migração para API Node.js pode preservar este formato.
