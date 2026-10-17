import { enviarMensagem } from '../shared/services/groq.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const mensagem = typeof req.body?.mensagem === 'string'
    ? req.body.mensagem.trim()
    : '';

  if (!mensagem) {
    return res.status(400).json({ erro: 'Digite uma mensagem.' });
  }

  try {
    const resposta = await enviarMensagem(mensagem);
    return res.status(200).json({ resposta });
  } catch (erro) {
    console.error('Erro na API do chatbot:', erro);
    return res.status(500).json({ erro: 'Não foi possível responder agora.' });
  }
}
