# Consultas, exames e laudos

Consultas são persistidas na tabela `consulta` pela API de Pets. O cadastro,
a edição e a conclusão do atendimento preservam a validação da conta e dos pets.
Cards criados para vários pets podem ser editados juntos; na visão de um pet,
editar um registro o separa do grupo visual.

A seção **Exames e Laudos** ainda não persiste arquivos. O lembrete da consulta
guarda a preferência, mas não agenda notificações do sistema.

Detalhes das rotas e das colunas estão em [`js/consultas-integracao.md`](js/consultas-integracao.md).
