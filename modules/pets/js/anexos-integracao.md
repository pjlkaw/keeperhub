# Anexos médicos de Pets

Receitas, exames e laudos usam registros na tabela `arquivo`; os metadados continuam no
MySQL e os arquivos novos ficam em um Blob privado. A tabela guarda a URL do Blob,
mas as telas recebem somente uma URL interna da API, que verifica a sessão, o
acesso ao módulo e a propriedade do arquivo antes de transmiti-lo.

Configure `PETS_BLOB_READ_WRITE_TOKEN` nos ambientes local, Preview e Production
com o token de um Blob Store privado. O token existente usado para fotos de perfil
continua separado. Sem o token privado, o cadastro de metadados sem anexos continua
disponível; a API rejeita o envio de arquivo com erro de configuração.

Anexos antigos podem continuar apontando para Blob público. A API mantém o acesso
autenticado para que os registros existentes continuem abrindo, mas esses objetos
continuam acessíveis pela URL antiga até serem migrados para o store privado. Como os
dados atuais são de teste, a migração desses arquivos pode ficar fora do escopo; a
troca da URL exibida no KeeperHub não revoga um link público já emitido.

## Validação atual

Em 16/11/2026, o envio e a abertura de anexos no Blob privado ainda não foram
validados localmente porque `PETS_BLOB_READ_WRITE_TOKEN` não está configurado no
`.env.local`. Os fluxos de cadastro, edição e listagem estão implementados pela
API/MySQL, mas isso não equivale à validação ponta a ponta de todas as telas.
