# Anexos médicos de Pets

Receitas, exames e laudos guardam os metadados na tabela `arquivo` do MySQL e os
conteúdos no Vercel Blob, seguindo o fluxo já usado pelas receitas de Medicamentos.
Novos anexos são enviados com acesso público e as telas recebem a URL do Blob.
As URLs ficam acessíveis a qualquer pessoa que as possua.

O envio usa a conexão padrão do Blob do projeto (`BLOB_READ_WRITE_TOKEN` no ambiente
local ou a conexão OIDC configurada no Vercel). Não é necessário configurar
`PETS_BLOB_READ_WRITE_TOKEN` para os novos anexos. Os limites são 10 arquivos e 1 MB
no total por registro, em PDF, JPG, PNG ou WEBP.

Registros antigos que apontem para um Blob privado continuam usando a rota autenticada
`/api/modulos/pets-arquivo`. Essa compatibilidade depende do token privado que criou
esses arquivos; novos cadastros não usam esse caminho.

O envio local não foi validado ponta a ponta nesta revisão. A configuração do Blob
geral existe no ambiente, mas ainda é necessário cadastrar um anexo e confirmar a
abertura e exclusão reais para validar o fluxo completo.
