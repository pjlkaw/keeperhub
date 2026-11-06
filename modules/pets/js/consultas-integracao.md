# Consultas e histórico de Pets

As telas `consultas-exames.html` e `cadastrar-consulta.html` usam `js/consultas.js`.
Consultas são vinculadas ao pet selecionado e persistidas em `pet.consultas` por
meio de `js/armazenamento.js` e do `localStorage` atual.

Cada registro inclui `id`, `medico`, `especialidade`, `especialidadePersonalizada`,
`clinica`, `data`, `horario`, `lembrar`, `status`, `resumo`, `criadaEm` e, após
registro do atendimento, `realizadaEm`. A página lista agendamentos futuros,
permite atualizar a opção de lembrete e mover um atendimento para o histórico
com seu resumo. O checkbox guarda somente uma preferência local: não agenda
notificações do sistema.

Arquivos de exames e laudos ainda não são persistidos. A seção visual de exames
permanece separada e requer um fluxo próprio de armazenamento antes de aceitar
uploads reais. A migração para API Node.js também fica para etapa posterior.
