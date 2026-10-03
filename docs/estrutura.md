# Estrutura do KeeperHub

Use este arquivo para decidir onde começar. Cada funcionalidade costuma ficar
em uma pasta de página ou de módulo; `shared/` é para código realmente usado
por mais de uma parte do projeto.

## Pastas principais

| Pasta | O que fica aqui | Quando abrir |
| --- | --- | --- |
| `main/` | Páginas do site: início, entrar, criar conta, hub e páginas institucionais | Ao mudar uma página do site |
| `modules/` | Ferramentas do hub: finanças, metas, despensa, pets e medicamentos | Ao mudar uma ferramenta |
| `shared/` | Componentes, estilos, serviços e chamadas reutilizadas | Quando a mudança serve a mais de uma página |
| `api/` | Rotas do servidor no formato de funções da Vercel | Ao receber ou responder um pedido HTTP |
| `server/` | Conexão com o banco e consultas SQL | Ao ler ou gravar dados no banco |
| `docs/` | Guias e decisões de organização | Ao procurar instruções do projeto |

## Como uma página é organizada

Nas páginas de `main/`, procure os arquivos da própria página:

- `index.html` descreve os campos e elementos que aparecem na tela.
- `css/` controla a aparência.
- `js/` controla as interações.

Exemplo: a página de entrar está em `main/entrar/`; seu HTML, CSS e JavaScript
ficam juntos nessa pasta.

As ferramentas em `modules/` são áreas separadas do hub. `main/` e `modules/`
não são cópias uma da outra: `main/` contém páginas do site e `modules/`
contém as ferramentas.

## Caminho de um pedido ao servidor

1. O JavaScript da página chama uma função de `shared/api/` (ou chama a rota
   diretamente, se ainda não houver um cliente compartilhado).
2. O arquivo correspondente em `api/` recebe o pedido. Por exemplo,
   `api/login.js` corresponde a `/api/login`.
3. Se precisar acessar o banco, a rota usa uma função de
   `server/repositories/`.
4. O repositório usa `server/db.js` para executar consultas SQL.

O navegador não deve importar `server/` nem conectar diretamente ao banco.

## Exemplo: login

- Tela: `main/entrar/index.html`
- Interações da tela: `main/entrar/js/entrar.js`
- Cliente HTTP compartilhado: `shared/api/usuario.js`
- Rota HTTP: `api/login.js`
- Consulta de usuário: `server/repositories/usuario.js`
- Conexão com o banco: `server/db.js`

Ao trabalhar no login, siga essa lista de cima para baixo. Não é necessário
entender as outras ferramentas para mudar essa funcionalidade.

## Regras para novas alterações

- Mantenha juntos os arquivos de uma página ou ferramenta.
- Coloque em `shared/` somente algo usado por mais de uma área.
- Não faça um módulo importar arquivos diretamente de outro módulo.
- Use nomes minúsculos em kebab-case para arquivos novos, como
  `recuperar-senha.js`.
- Preserve os nomes existentes quando possível. Ao renomear, atualize todos os
  imports, links HTML, chamadas de API e referências na documentação.
- A API e o servidor são código de backend; HTML, CSS e JavaScript de tela são
  código de frontend.