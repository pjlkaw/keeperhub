# Persistência do módulo Finanças

Contas e lançamentos são lidos e gravados no banco de dados pelas rotas do
módulo. O `localStorage` não é usado para persistir dados financeiros.

A chave compartilhada `keeperhub-theme`, usada pelo serviço de tema, continua
sendo apenas uma preferência visual do navegador.
