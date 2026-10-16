# Uso de localStorage no módulo Finanças

Todo o armazenamento local do módulo está centralizado em `js/dados.js`.
**PROVISÓRIO:** serve apenas até a integração com o backend.

| Chave | Conteúdo | Origem |
|---|---|---|
| `keeperhub-financas-contas` | Lista JSON de contas (`id`, `nome`, `tipo`) | `js/dados.js` |
| `keeperhub-financas-transacoes` | Lista JSON de transações | `js/dados.js` |
| `keeperhub-theme` | Tema `dark` ou `light` (compartilhado, não é do módulo) | `shared/services/theme.js` |

## Comportamento
- Os dados ficam por origem e perfil do navegador, sem sincronização entre dispositivos ou usuários.
- Limpar o armazenamento do navegador apaga todos os registros.
- Leitura inválida ou indisponível retorna o padrão (contas de demonstração; transações vazias).
- Falha de gravação (cota cheia, modo privado) é ignorada: a alteração não é persistida.

## Pontos provisórios (marcados com `PROVISÓRIO` no código)
- `js/dados.js`: cabeçalho de persistência, `contasIniciais` e o `catch` de `salvarLista`.
- `index.html`: cartões da home com valores fixos de demonstração (saldo, fluxo, despesas mensais, categorias, transações recentes).

## Migração
Substituir `lerLista` e `salvarLista` por chamadas à API mantém as funções exportadas
(`obterContas`, `salvarContas`, `obterTransacoes`, `salvarTransacoes`) e o restante do módulo intacto.
