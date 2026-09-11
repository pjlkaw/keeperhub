# Padrão de Scripts JS — KeeperHub

## 1. Um `script.js` por módulo, como inicializador

Cada módulo tem um único `script.js` na raiz da sua pasta `/js`. Ele não implementa a lógica em si — só importa e chama as funções que vêm de outros arquivos dentro de `/js`, usando `import`/`export` e `async`/`await`. É o ponto de entrada, não o lugar onde a lógica mora.

## 2. Protótipo primeiro, separação depois

É permitido escrever e testar funções direto no `script.js` durante o desenvolvimento. Mas antes de finalizar a tarefa, toda função que não seja estritamente inicialização deve ser movida para seu próprio arquivo em `/js`.

## 3. Ordem de verificação antes de criar uma função nova

Antes de escrever (ou pedir a uma IA para escrever) uma função nova — por exemplo, *"faça uma função de adicionar itens com base nessa parte do HTML"* — siga esta ordem:

1. Verifique se já existe algo equivalente em `shared/services/`. Se existir, reutilize; não duplique.
2. Se não existir em `shared/`, verifique se um módulo diferente do seu já tem uma função parecida.
3. Se tiver: avise os membros daquele módulo e os gerentes, e avaliem juntos se faz sentido promover essa função para `shared/services/` em vez de manter cópias separadas.
4. Só depois desses passos, escreva a função nova dentro do seu módulo.

## 4. Tratamento de erro obrigatório em função assíncrona

Toda função com `async`/`fetch` precisa de `try/catch` — sem isso, um erro de rede quebra silenciosamente e ninguém percebe até reclamação de usuário.

## 5. Nada de lógica direto no HTML

Proibido `onclick="..."` inline no HTML — todo evento é registrado via `addEventListener` dentro do `.js` do módulo. Mantém a separação que já vale pra CSS, agora pro JS também.

## 6. Limpeza antes do commit

Nenhum `console.log` de teste sobrevive até o PR. Se precisar debugar de novo depois, adiciona de novo — não deixa "sujeira" acumulando no código de produção.

## 7. Chaves de `localStorage` com prefixo do projeto

Já é o padrão usado no `theme.js` (`keeperhub-theme`) — formalizado como regra, porque evita um módulo sobrescrever a chave de outro sem querer (`despensa-filtro`, `medicamentos-ultima-tela`, etc.).
