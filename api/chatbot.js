import { enviarMensagem } from '../shared/services/groq.js';
import { usuarioDaSessao } from '../server/auth-session.js';
import { listarPets } from '../server/repositories/pets/animais.js';
import { listarMedicamentos } from '../server/repositories/medicamentos/medicamentos.js';

function mensagemSobrePets(mensagem) {
  return /\b(pets?|animais?|cachorros?|cadelas?|gatos?|gatas?)\b/i.test(mensagem);
}

function mensagemSobreMedicamentos(mensagem) {
  return /\b(medicamentos?|rem[eé]dios?|medica[cç][aã]o|doses?|tratamentos?|estoque)\b/i.test(mensagem);
}

function dadosMedicamentosParaContexto(medicamentos) {
  return medicamentos.map((medicamento) => ({
    nome: medicamento.nome,
    unidade: medicamento.unidade,
    tipoUso: medicamento.tipoUso,
    status: medicamento.status,
    dose: medicamento.dose,
    frequencia: medicamento.frequencia,
    intervaloHoras: medicamento.intervaloHoras,
    dataInicio: medicamento.dataInicio,
    dataFim: medicamento.dataFim,
    dias: medicamento.dias,
    horarios: medicamento.horarios,
    quantidade: medicamento.quantidade,
    estoqueCadastrado: medicamento.estoqueCadastrado,
    validade: medicamento.validade
  }));
}

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
    const contexto = {};

    if (mensagemSobrePets(mensagem)) {
      contexto.pets = await listarPets(usuarioId);
    }

    if (mensagemSobreMedicamentos(mensagem)) {
      const medicamentos = await listarMedicamentos(usuarioId);
      contexto.medicamentos = dadosMedicamentosParaContexto(medicamentos);
    }

    const contextoConsulta = Object.keys(contexto).length ? contexto : null;
    const resposta = await enviarMensagem(mensagem, contextoConsulta);
    return res.status(200).json({ resposta });
  } catch (erro) {
    console.error('Erro na API do chatbot:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder agora.' });
  }
}
