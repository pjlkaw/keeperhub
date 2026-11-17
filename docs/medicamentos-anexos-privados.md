# Anexos privados de receitas

Novos anexos de receitas são armazenados como blobs privados e só podem ser baixados pela rota autenticada do módulo Medicamentos. A rota verifica a sessão, o acesso ao módulo e a propriedade do arquivo.

Anexos existentes foram enviados como blobs públicos. Eles continuam acessíveis por URLs públicas antigas até que a migração abaixo seja executada. A aplicação deixa de expor essas URLs e serve os arquivos existentes pela rota autenticada enquanto a migração não é feita.

## Migrar anexos existentes

1. Implante primeiro a versão que suporta blobs privados.
2. Faça um backup do banco de dados e confirme que o ambiente está apontando para a base correta.
3. Execute a simulação, que apenas conta os anexos públicos:

   ```powershell
   npm run migrate:prescription-blobs-private
   ```

4. Após conferir o resultado e as credenciais de produção, aplique a migração:

   ```powershell
   npm run migrate:prescription-blobs-private -- --apply
   ```

O script copia cada blob para armazenamento privado, atualiza a URL no banco e remove o blob público anterior. Não execute `--apply` sem backup e sem confirmar o ambiente. Se a migração falhar, ela retorna um código de saída diferente de zero; corrija a causa e rode novamente.

Links públicos já compartilhados, baixados ou armazenados em cache antes da remoção não podem ser revogados retroativamente.
