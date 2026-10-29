//este arquivo é um exemplo e não deve ser executado.
//
// A ideia é simples:
// 1. A API recebe a requisição e identifica o usuário logado.
// 2. A API chama uma função do repositório.
// 3. O repositório consulta o banco e devolve os dados.
//
// navegador -> API -> repositório -> banco
//
// Não deixe o navegador enviar SQL nem escolha o usuarioId pelo body.

// Exemplo: server/repositories/medicamentos/medicamentos.js
// No banco, o nome do medicamento está em item e os detalhes estão em medicamento.
import db from '../../db.js';

// Listar os medicamentos do usuário logado
export async function listarMedicamentos(usuarioId) {
  const [linhas] = await db.execute(
    `SELECT m.id_medicamento, i.id_item, i.nome,
            m.unidade_estoque, m.concentracao
       FROM medicamento AS m
       JOIN item AS i ON i.id_item = m.item_id
      WHERE i.usuario_id = ? AND i.tipo_item = 'medicamento'
      ORDER BY i.nome`,
    [usuarioId]
  );

  return linhas;
}

// Buscar um medicamento específico do usuário logado
export async function buscarMedicamento(idMedicamento, usuarioId) {
  const [linhas] = await db.execute(
    `SELECT m.id_medicamento, i.nome, m.unidade_estoque, m.concentracao
       FROM medicamento AS m
       JOIN item AS i ON i.id_item = m.item_id
      WHERE m.id_medicamento = ? AND i.usuario_id = ?
      LIMIT 1`,
    [idMedicamento, usuarioId]
  );

  return linhas[0] ?? null;
}

// Na API, o uso será parecido com:
//
// const usuarioId = req.session.usuarioId; // usuário autenticado
// const medicamentos = await listarMedicamentos(usuarioId);
// res.json(medicamentos);
//
// Regras para adaptar este exemplo:
// - Troque tabelas, colunas e nomes das funções pelo seu módulo.
// - Use db.execute(sql, [valores]); nunca monte SQL com concatenação.
// - Em SELECT, UPDATE e DELETE, filtre pelo usuarioId.
// - Se a tabela não tiver usuario_id, faça JOIN até a tabela que tenha.
// - Antes de relacionar dois registros, confirme que ambos pertencem ao usuário.
// - Para estoque ou operações com várias alterações, use transação:
//   começar -> validar -> alterar tudo -> confirmar; se falhar, desfazer.
//
// Antes de entregar, confira:
// [ ] consultei o schema do banco;
// [ ] usei o usuário da sessão;
// [ ] usei parâmetros (?) na consulta;
// [ ] testei que um usuário não acessa o registro de outro.
