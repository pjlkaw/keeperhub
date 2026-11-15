// Transação com nova tentativa quando o MySQL desfaz a operação por deadlock.
// Duas gravações ao mesmo tempo nos mesmos pets (ex.: editar e cadastrar) podem
// travar uma à outra; o MySQL cancela uma delas (erro 1213) e ela é refeita do zero.
import db from '../../db.js';

const ERRO_DEADLOCK = 1213; // ER_LOCK_DEADLOCK
const TENTATIVAS = 3;

// acao recebe a conexão; se devolver null, a transação é desfeita e retorna null.
export async function emTransacao(acao, banco = db) {
  for (let tentativa = 1; ; tentativa += 1) {
    const conexao = await banco.getConnection();
    try {
      await conexao.beginTransaction();
      const resultado = await acao(conexao);
      if (resultado === null) {
        await conexao.rollback();
        return null;
      }
      await conexao.commit();
      return resultado;
    } catch (erro) {
      await conexao.rollback().catch(() => {});
      if (erro?.errno !== ERRO_DEADLOCK || tentativa >= TENTATIVAS) throw erro;
    } finally {
      conexao.release();
    }
  }
}
