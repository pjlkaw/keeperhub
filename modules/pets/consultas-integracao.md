# Consultas, exames e laudos — integração atual e pendências

Consultas e seu histórico são persistidos localmente por `js/consultas.js` em
`pet.consultas`, usando `js/armazenamento.js`. O cadastro aceita data passada e
pode gravar uma mesma consulta em todos os pets ou numa seleção de pets.

A seção **Exames e Laudos** não contém registros de demonstração. Ela apresenta
um estado vazio até a integração de upload e persistência. Upload, visualização,
download e “Ver todos” ainda não estão conectados. O histórico médico estático
também precisa ser substituído por dados reais.

O controle **Lembrar** salva uma preferência local, mas ainda não agenda
notificações do navegador. A confirmação do atendimento salva resumo e status no
registro do pet; a atualização de consultas criadas para vários pets permanece
uma decisão funcional pendente.
