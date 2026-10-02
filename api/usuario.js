import { criarUsuario, buscarUsuario } from '../server/repositories/usuario.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const resultado = await criarUsuario(req.body);
      return res.status(201).json({ id: resultado.insertId });
    }

    if (req.method === 'GET') {
      const usuarios = await buscarUsuario();
      return res.status(200).json(usuarios);
    }

    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao acessar usuários' });
  }
}