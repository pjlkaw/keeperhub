import { buscarUsuarioPorEmail } from '../server/repositories/usuario.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    const usuario = await buscarUsuarioPorEmail(String(email).trim());

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const senhaValida = String(usuario.senha_usuario) === String(senha);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    return res.status(200).json({
      ok: true,
      usuario: {
        id_usuario: usuario.id_usuario,
        nome_usuario: usuario.nome_usuario,
        email_usuario: usuario.email_usuario
      }
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    return res.status(500).json({ erro: 'Erro ao autenticar usuário.' });
  }
}
