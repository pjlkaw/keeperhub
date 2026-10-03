# Acesso ao Banco de Dados — KeeperHub

## Resumo

Depois de clonar o projeto, o integrante deve:

```text
1. Clonar o repositório
2. Executar npm install
3. Criar o arquivo .env
4. Adicionar as credenciais fornecidas pela equipe
5. Verificar se .env está no .gitignore
6. Executar o teste de conexão
7. Utilizar o db.js nos módulos que precisarem acessar o banco
```

O KeeperHub utiliza um banco de dados MySQL hospedado na nuvem. Para executar o projeto localmente e acessar o banco compartilhado, cada integrante precisa configurar suas próprias variáveis de ambiente.

## 1. Instalar as dependências

Na pasta principal do projeto, execute:

```bash
npm install
```

Caso o projeto ainda não tenha as dependências instaladas:

```bash
npm install mysql2 dotenv
```

## 2. Criar o arquivo `.env`

Na raiz do projeto, crie um arquivo chamado:

```text
.env
```

Esse arquivo **não deve ser enviado para o GitHub**, pois contém as credenciais de acesso ao banco.

Adicione as informações de conexão fornecidas pela equipe:

```env
DB_HOST=keeperhub-pedrorochabispo-dd37.j.aivencloud.com
DB_PORT=14796
DB_USER=avnadmin
DB_PASSWORD=SUA_SENHA
DB_NAME=defaultdb
```

Substitua `SUA_SENHA` pela senha do banco.

> **Importante:** não coloque a senha diretamente no código e não faça commit do arquivo `.env`.

## 3. Verificar o `.gitignore`

O arquivo `.gitignore` deve conter:

```gitignore
.env
node_modules/
```

Assim, as credenciais não serão enviadas para o repositório.

## 4. Como o projeto utiliza o banco

O arquivo `server/db.js` configura o pool de conexão com o MySQL. As consultas ficam em `server/repositories/`, separadas da camada HTTP em `api/` e dos módulos do navegador em `shared/`.

Os dados do `.env` são carregados pelo `dotenv` e utilizados para criar a conexão com o MySQL.

## Cadastro, login e perfil

O fluxo de conta usa a tabela `usuario` e os campos `nome_usuario`,
`email_usuario`, `senha_usuario`, `numero_usuario` e `genero_usuario`.
O cadastro é enviado por `POST /api/usuario`; o login usa `POST /api/login`.
Depois do login, o navegador guarda somente o ID e os dados públicos da conta
em `localStorage`. O perfil é carregado por `GET /api/usuario?id=<id>` e
atualizado por `PUT /api/usuario?id=<id>`.

As senhas novas são armazenadas com `scrypt`. Contas antigas com senha em texto
simples continuam podendo entrar e têm a senha convertida para hash no primeiro
login bem-sucedido. A senha atual é exigida para atualizar a senha pelo perfil.
Data de nascimento fica apenas no dispositivo; ainda não há coluna para ela na
tabela atual. A foto selecionada no perfil é apenas uma prévia e também não é
enviada ao banco.

Um repositório importa o pool por um caminho relativo. Por exemplo, em `server/repositories/usuario.js`:

```js
import db from '../db.js';
```

Mantenha o acesso ao banco restrito ao código de servidor; arquivos do navegador devem chamar os endpoints em `api/`.

## 6. Acesso ao banco

Todos os integrantes utilizam o **mesmo banco remoto**.

Isso significa que:

* não é necessário instalar um MySQL Server local para utilizar o banco do projeto;
* cada integrante precisa ter seu próprio `.env`;
* as credenciais não devem ser colocadas no código;
* alterações feitas no banco compartilhado podem ser visualizadas pelos outros integrantes;
* consultas e alterações devem ser feitas com cuidado para não afetar os dados utilizados pelo restante da equipe.

## 7. Segurança

**Nunca envie para o GitHub:**

* senha do banco;
* arquivo `.env`;
* credenciais completas de conexão;
* chaves ou tokens de acesso.

Caso a senha seja alterada, cada integrante deverá atualizar o próprio `.env`.
