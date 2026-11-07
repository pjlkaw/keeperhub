// Consultas SQL dos animais: listar, cadastrar, atualizar e desativar pets do usuário autenticado.
import db from '../../db.js';

// O tutor fica em pet_contato com tipo = 'tutor'; usamos o primeiro registro desse tipo.
const SELECT_PET = `
  SELECT p.id_pet AS id, p.nome, p.especie, p.raca, p.sexo,
         p.data_nasc AS dataNasc, p.peso, p.foto,
         c.nome AS tutorNome, c.telefone AS tutorTelefone
    FROM pet p
    LEFT JOIN pet_contato c ON c.id_contato = (
      SELECT MIN(c2.id_contato) FROM pet_contato c2
       WHERE c2.pet_id = p.id_pet AND c2.tipo = 'tutor'
    )
`;

function dataParaTexto(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    // O mysql2 cria a data no fuso local do servidor; por isso usamos os getters locais.
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor).slice(0, 10);
}

// Converte a linha do banco para o formato usado pelas telas do módulo.
export function mapearPet(linha) {
  const temTutor = Boolean(linha.tutorNome || linha.tutorTelefone);
  return {
    id: String(linha.id),
    nome: linha.nome,
    especie: linha.especie || '',
    raca: linha.raca || '',
    genero: linha.sexo || '',
    dataNascimento: dataParaTexto(linha.dataNasc),
    peso: linha.peso == null ? null : Number(linha.peso),
    foto: linha.foto || null,
    contatoEmergencia: temTutor
      ? { nomeTutor: linha.tutorNome || '', telefone: linha.tutorTelefone || '' }
      : null,
  };
}

export async function listarPets(usuarioId) {
  const [linhas] = await db.execute(
    `${SELECT_PET} WHERE p.usuario_id = ? AND p.ativo = 1 ORDER BY p.nome, p.id_pet`,
    [usuarioId]
  );
  return linhas.map(mapearPet);
}

export async function buscarPet(idPet, usuarioId) {
  const [linhas] = await db.execute(
    `${SELECT_PET} WHERE p.id_pet = ? AND p.usuario_id = ? AND p.ativo = 1 LIMIT 1`,
    [idPet, usuarioId]
  );
  return linhas[0] ? mapearPet(linhas[0]) : null;
}

export async function criarPet(usuarioId, dados) {
  const [resultado] = await db.execute(
    `INSERT INTO pet (usuario_id, nome, especie, raca, sexo, data_nasc, peso, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId, dados.nome, dados.especie, dados.raca, dados.genero,
      dados.dataNascimento, dados.peso, dados.foto ?? null,
    ]
  );
  return buscarPet(resultado.insertId, usuarioId);
}

// A foto só é alterada quando "foto" vier nos dados (nova URL ou null para remover).
export async function atualizarPet(idPet, usuarioId, dados) {
  const colunas = ['nome = ?', 'especie = ?', 'raca = ?', 'sexo = ?', 'data_nasc = ?', 'peso = ?'];
  const valores = [dados.nome, dados.especie, dados.raca, dados.genero, dados.dataNascimento, dados.peso];
  if (Object.hasOwn(dados, 'foto')) {
    colunas.push('foto = ?');
    valores.push(dados.foto);
  }

  await db.execute(
    `UPDATE pet SET ${colunas.join(', ')}
      WHERE id_pet = ? AND usuario_id = ? AND ativo = 1`,
    [...valores, idPet, usuarioId]
  );
  return buscarPet(idPet, usuarioId);
}

// Grava o tutor numa transação: confirma o dono do pet e atualiza ou cria o contato.
// Nome e telefone vazios removem o tutor.
export async function salvarTutor(idPet, usuarioId, { nomeTutor, telefone }) {
  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();
    const [pets] = await conexao.execute(
      'SELECT id_pet FROM pet WHERE id_pet = ? AND usuario_id = ? AND ativo = 1 FOR UPDATE',
      [idPet, usuarioId]
    );
    if (!pets.length) {
      await conexao.rollback();
      return null;
    }

    const [contatos] = await conexao.execute(
      `SELECT id_contato FROM pet_contato
        WHERE pet_id = ? AND tipo = 'tutor' ORDER BY id_contato LIMIT 1`,
      [idPet]
    );
    const contatoId = contatos[0]?.id_contato;

    if (!nomeTutor && !telefone) {
      await conexao.execute("DELETE FROM pet_contato WHERE pet_id = ? AND tipo = 'tutor'", [idPet]);
    } else if (contatoId) {
      await conexao.execute(
        'UPDATE pet_contato SET nome = ?, telefone = ? WHERE id_contato = ?',
        [nomeTutor, telefone || null, contatoId]
      );
    } else {
      await conexao.execute(
        "INSERT INTO pet_contato (pet_id, nome, telefone, tipo) VALUES (?, ?, ?, 'tutor')",
        [idPet, nomeTutor, telefone || null]
      );
    }

    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  return buscarPet(idPet, usuarioId);
}

// Exclusão lógica, como em medicamentos: o registro continua no banco com ativo = 0.
export async function desativarPet(idPet, usuarioId) {
  const [resultado] = await db.execute(
    'UPDATE pet SET ativo = 0 WHERE id_pet = ? AND usuario_id = ? AND ativo = 1',
    [idPet, usuarioId]
  );
  return resultado.affectedRows > 0;
}
