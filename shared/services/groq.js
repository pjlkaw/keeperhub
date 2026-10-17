import Groq from 'groq-sdk';
import 'dotenv/config';

const groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function enviarMensagem(prompt) {
    const resposta = await groqClient.chat.completions.create({
    messages: [{
        role: 'user',
        content: prompt
    }],
    model: 'openai/gpt-oss-20b'
});

    return resposta.choices[0]?.message?.content || '';
}

try {
    const resposta = await enviarMensagem('Olá, como você está?');
    console.log(resposta);
} catch (error) {
    console.error('Erro ao consultar a API do Groq:', error);
    process.exitCode = 1;
}