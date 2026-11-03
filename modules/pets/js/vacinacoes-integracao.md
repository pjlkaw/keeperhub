# Vacinações de Pets

As páginas `components/vacinacoes.html` e `components/adicionar-vacina.html`
usam `js/vacinacoes.js`. Os registros ficam em `pet.vacinas`, persistidos no
`localStorage` pelo módulo `js/armazenamento.js`.

O formulário permite selecionar um pet ou todos os pets cadastrados. Ao escolher
todos, a mesma agenda é gravada no histórico individual de cada animal em uma
única atualização local. Registros feitos para hoje ou datas passadas são
marcados como aplicados; datas futuras são guardadas como agendamentos e aparecem
no cronograma sem entrar no histórico de aplicações.

Cada registro guarda `id`, `grupoId`, `nome`, `nomePersonalizado`, `status`,
`dataAplicacao`, `dataAgendada`, `frequencia`, `proximaDose`, `clinica`,
`horario`, `observacao` e `criadaEm`. `grupoId` relaciona os registros criados
para vários pets na mesma operação. Reforços anuais calculam a próxima data a
partir da data escolhida; doses fracionadas exigem uma data manual; dose única
não cria uma próxima dose. Clínica e horário são opcionais.

A agenda mostra agendamentos e próximas doses, identifica vencimentos e mantém
o histórico apenas das aplicações. O cadastro continua local ao navegador, não
agenda notificações do sistema e ainda não permite anexar certificados. A futura
migração para API Node.js pode preservar este formato.
