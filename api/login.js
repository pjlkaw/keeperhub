import { atualizarUsuario, buscarUsuarioPorEmail } from '../server/repositories/usuario.js';
import { hashPassword, verificarSenha } from '../server/password.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { email, senha } = req.body || {};

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' });
    }

    const usuario = await buscarUsuarioPorEmail(String(email).trim().toLowerCase());

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const senhaArmazenada = String(usuario.senha_usuario ?? '');
    const senhaValida = await verificarSenha(String(senha), senhaArmazenada);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    if (!senhaArmazenada.startsWith('scrypt:')) {
      await atualizarUsuario(usuario.id_usuario, {
        senha_usuario: await hashPassword(String(senha))
      });
    }

    return res.status(200).json({
      ok: true,
      usuario: {
        id_usuario: usuario.id_usuario,
        nome_usuario: usuario.nome_usuario,
        email_usuario: usuario.email_usuario,
        numero_usuario: usuario.numero_usuario,
        genero_usuario: usuario.genero_usuario
      }
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    return res.status(500).json({ erro: 'Erro ao autenticar usuário.' });
  }
}
