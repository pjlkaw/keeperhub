import { enviarMensagem } from '../shared/services/groq.js';
import { usuarioDaSessao } from '../server/auth-session.js';
import { listarAcessosUsuario } from '../server/repositories/modulos.js';
import { listarPets } from '../server/repositories/pets/animais.js';
import { listarMedicamentos } from '../server/repositories/medicamentos/medicamentos.js';
import { listarContas } from '../server/repositories/financas/contas.js';
import { listarTransacoes } from '../server/repositories/financas/transacoes.js';
import { listarProdutos } from '../server/repositories/despensa/produtos.js';
import { listarItensDaListaAberta } from '../server/repositories/despensa/checklist.js';
import {
  dadosDespensaParaContexto,
  dadosFinancasParaContexto,
  dadosMedicamentosParaContexto,
  dadosPetsParaContexto,
  detectarModulosDaMensagem,
} from '../server/services/keeper-context.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) {
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }

  const mensagem = typeof req.body?.mensagem === 'string'
    ? req.body.mensagem.trim()
    : '';

  if (!mensagem) {
    return res.status(400).json({ erro: 'Digite uma mensagem.' });
  }

  try {
    const modulosSolicitados = detectarModulosDaMensagem(mensagem);
    let contextoConsulta = null;

    if (modulosSolicitados.length) {
      const acessos = await listarAcessosUsuario(usuarioId);
      const modulosDisponiveis = new Set(acessos.map((acesso) => acesso.codigo));
      const contexto = {
        modulosDisponiveis: [...modulosDisponiveis],
        modulosSemAcesso: modulosSolicitados.filter((modulo) => !modulosDisponiveis.has(modulo)),
      };

      if (modulosSolicitados.includes('pets') && modulosDisponiveis.has('pets')) {
        contexto.pets = dadosPetsParaContexto(await listarPets(usuarioId));
      }

      if (modulosSolicitados.includes('medicamentos') && modulosDisponiveis.has('medicamentos')) {
        contexto.medicamentos = dadosMedicamentosParaContexto(await listarMedicamentos(usuarioId));
      }

      if (modulosSolicitados.includes('financas') && modulosDisponiveis.has('financas')) {
        const [contas, transacoes] = await Promise.all([
          listarContas(usuarioId),
          listarTransacoes(usuarioId),
        ]);
        contexto.financas = dadosFinancasParaContexto(contas, transacoes);
      }

      if (modulosSolicitados.includes('despensa') && modulosDisponiveis.has('despensa')) {
        const [produtos, itens] = await Promise.all([
          listarProdutos(usuarioId),
          listarItensDaListaAberta(usuarioId),
        ]);
        contexto.despensa = dadosDespensaParaContexto(produtos, itens);
      }

      contextoConsulta = contexto;
    }

    const resposta = await enviarMensagem(mensagem, contextoConsulta);
    return res.status(200).json({ resposta });
  } catch (erro) {
    console.error('Erro na API do chatbot:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder agora.' });
  }
}
