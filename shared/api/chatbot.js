import { enviarMensagem } from '../shared/services/groq.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            erro: 'Método não permitido'
        });
    }

    try {
        const { prompt } = req.body || {};

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                erro: 'Mensagem inválida'
            });
        }

        const resposta = await enviarMensagem(prompt);

        return res.status(200).json({
            resposta
        });
    } catch (error) {
        console.error('Erro no chatbot:', error);

        return res.status(500).json({
            erro: 'Não foi possível obter uma resposta'
        });
    }
}