// Rota da página de notificações, atendida por api/usuario.js com ?recurso=notificacoes
// (fica fora de api/ para não somar uma função a mais no deploy da Vercel).
//   GET                    -> { hoje, modulos, avisos }
//   PUT ?acao=marcar       -> { chave, acao: 'vista' | 'concluida' }
//   PUT ?acao=desfazer     -> { chave }
import { origemDaRequisicaoValida, usuarioDaSessao } from '../auth-session.js';
import { listarAcessosUsuario } from '../repositories/modulos.js';
import {
  desfazerNotificacao, limparAvisosResolvidos, listarChavesVistas, marcarNotificacao,
} from '../repositories/notificacoes.js';
import {
  avisosDespensa, avisosFinancas, avisosMedicamentos, avisosPets, hojeEmSaoPaulo, ordenarAvisos,
} from './regras.js';
import { listarPets } from '../repositories/pets/animais.js';
import { listarVacinasPorPet } from '../repositories/pets/vacinas.js';
import { listarConsultasPorPet } from '../repositories/pets/consultas.js';
import { listarMedicacoesPorPet } from '../repositories/pets/medicacoes.js';
import { listarDespesasPorPet } from '../repositories/pets/despesas.js';
import { listarRotinasPorPet } from '../repositories/pets/rotinas.js';
import { listarReceitasPorPet } from '../repositories/pets/receitas.js';
import { listarOrcamentoGeral, listarOrcamentosPorPet } from '../repositories/pets/orcamentos.js';
import { listarMedicamentos } from '../repositories/medicamentos/medicamentos.js';
import { listarReceitas } from '../repositories/medicamentos/receitas.js';
import { listarTransacoes } from '../repositories/financas/transacoes.js';
import { listarProdutos } from '../repositories/despensa/produtos.js';

export const MODULOS = ['pets', 'medicamentos', 'financas', 'despensa'];
const ACOES = { vista: 'vista', concluida: 'concluida' };
const CHAVE_VALIDA = /^[a-z-]+:[a-z-]+:[\w:-]{1,100}$/;

async function carregarPets(usuarioId, hoje) {
  const [lista, vac, con, med, des, rot, rec, orc, geral] = await Promise.all([
    listarPets(usuarioId),
    listarVacinasPorPet(usuarioId), listarConsultasPorPet(usuarioId),
    listarMedicacoesPorPet(usuarioId), listarDespesasPorPet(usuarioId),
    listarRotinasPorPet(usuarioId), listarReceitasPorPet(usuarioId),
    listarOrcamentosPorPet(usuarioId), listarOrcamentoGeral(usuarioId),
  ]);
  const completos = lista.map(pet => {
    const id = String(pet.id);
    const rotinasDoPet = rot.get(id) || {};
    return {
      id, nome: pet.nome,
      vacinas: vac.get(id) || [], consultas: con.get(id) || [], medicacoes: med.get(id) || [],
      despesas: des.get(id) || [], receitas: rec.get(id) || [], orcamentosDespesas: orc.get(id) || {},
      rotinaHigiene: rotinasDoPet.higiene || [], rotinaLazer: rotinasDoPet.lazer || [],
      rotinaAlimentar: { refeicoes: rotinasDoPet.refeicoes || [] },
    };
  });
  return avisosPets(completos, hoje, geral);
}

async function carregarMedicamentos(usuarioId, hoje) {
  const [medicamentos, receitas] = await Promise.all([listarMedicamentos(usuarioId), listarReceitas(usuarioId)]);
  return avisosMedicamentos(medicamentos, receitas, hoje);
}

async function carregarFinancas(usuarioId, hoje) {
  return avisosFinancas(await listarTransacoes(usuarioId), hoje);
}

async function carregarDespensa(usuarioId, hoje) {
  return avisosDespensa(await listarProdutos(usuarioId), hoje);
}

const CARREGADORES = {
  pets: carregarPets, medicamentos: carregarMedicamentos, financas: carregarFinancas, despensa: carregarDespensa,
};

// Avisos de todos os módulos liberados, sem os já marcados. Um módulo com erro fica sem avisos.
export async function listarAvisos(usuarioId, agora = new Date()) {
  const hoje = hojeEmSaoPaulo(agora);
  const liberados = new Set((await listarAcessosUsuario(usuarioId)).map(acesso => acesso.codigo));
  const modulos = MODULOS.filter(modulo => liberados.has(modulo));
  const [vistas, ...porModulo] = await Promise.all([
    listarChavesVistas(usuarioId),
    ...modulos.map(modulo => CARREGADORES[modulo](usuarioId, hoje).catch(erro => {
      console.error(`Notificações: não foi possível calcular os avisos de ${modulo}:`, erro);
      return [];
    })),
  ]);
  const todos = porModulo.flat();
  await limparAvisosResolvidos(usuarioId, vistas, new Set(todos.map(aviso => aviso.chave)));
  return { hoje, modulos, avisos: ordenarAvisos(todos.filter(aviso => !vistas.has(aviso.chave))) };
}

export async function tratarNotificacoes(req, res) {
  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') return res.status(200).json(await listarAvisos(usuarioId));
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ erro: 'Método não permitido.' });
  }
  if (!origemDaRequisicaoValida(req)) return res.status(403).json({ erro: 'Origem da requisição não permitida.' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const chave = typeof body.chave === 'string' ? body.chave.trim() : '';
  if (!CHAVE_VALIDA.test(chave) || !MODULOS.includes(chave.split(':')[0])) {
    return res.status(400).json({ erro: 'Aviso inválido.' });
  }
  if (req.query?.acao === 'marcar') {
    const acao = ACOES[body.acao];
    if (!acao) return res.status(400).json({ erro: 'Informe se o aviso foi visto ou concluído.' });
    await marcarNotificacao(usuarioId, chave, acao);
    return res.status(200).json({ ok: true });
  }
  if (req.query?.acao === 'desfazer') {
    await desfazerNotificacao(usuarioId, chave);
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ erro: 'Ação inválida.' });
}
