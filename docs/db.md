# Acesso ao Banco de Dados — KeeperHub

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

O arquivo `shared/services/db.js` é responsável pela conexão:

```js
require('dotenv').config();
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = db;
```

Os dados do `.env` são carregados pelo `dotenv` e utilizados para criar a conexão com o MySQL.

Os outros módulos do projeto podem importar essa conexão através de:

```js
const db = require('../services/db');
```

O caminho deve ser ajustado conforme a localização do arquivo que estiver fazendo a consulta.

## 5. Testar a conexão

Existe um arquivo de teste para verificar se a aplicação consegue acessar o banco.

Execute:

```bash
node shared/services/teste-db.js
```

Se a conexão funcionar, o terminal deverá executar a consulta sem apresentar erro.

Por exemplo:

```text
[]
```

Um resultado `[]` significa que a conexão funcionou, mas a consulta não encontrou registros.

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
