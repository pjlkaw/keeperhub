// Avisos da página de notificações que o usuário marcou como vistos ou concluídos
// (tabela notificacao_vista). Os avisos em si são calculados em server/notificacoes/regras.js.
import db from '../db.js';

export const DIAS_GUARDADOS = 60;
const PREFIXO_SEM_DATA = 'despensa:acabou:';

// Chaves marcadas pelo usuário. Antes de ler, apaga as marcações com mais de 60 dias.
export async function listarChavesVistas(usuarioId) {
  await db.execute(
    `DELETE FROM notificacao_vista
      WHERE usuario_id = ? AND criado_em < (NOW() - INTERVAL ${DIAS_GUARDADOS} DAY)`,
    [usuarioId]
  );
  const [linhas] = await db.execute(
    'SELECT chave FROM notificacao_vista WHERE usuario_id = ?',
    [usuarioId]
  );
  return new Set(linhas.map(linha => linha.chave));
}

export async function marcarNotificacao(usuarioId, chave, acao) {
  await db.execute(
    `INSERT INTO notificacao_vista (usuario_id, chave, acao) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE acao = VALUES(acao), criado_em = CURRENT_TIMESTAMP`,
    [usuarioId, chave, acao]
  );
}

export async function desfazerNotificacao(usuarioId, chave) {
  await db.execute(
    'DELETE FROM notificacao_vista WHERE usuario_id = ? AND chave = ?',
    [usuarioId, chave]
  );
}

// Avisos sem data (produto que acabou): quando o produto volta a ter estoque, a marcação
// é apagada, para que o aviso apareça de novo se ele acabar outra vez.
export async function limparAvisosResolvidos(usuarioId, vistas, chavesAtuais) {
  const resolvidas = [...vistas].filter(chave => chave.startsWith(PREFIXO_SEM_DATA) && !chavesAtuais.has(chave));
  if (!resolvidas.length) return;
  await db.execute(
    `DELETE FROM notificacao_vista WHERE usuario_id = ? AND chave IN (${resolvidas.map(() => '?').join(', ')})`,
    [usuarioId, ...resolvidas]
  );
}
