import {
  atualizarUsuario, buscarSenhaUsuario, buscarUsuario,
  buscarUsuarioPorEmail, criarUsuario
} from '../server/repositories/usuario.js';
import { hashPassword, verificarSenha } from '../server/password.js';
import { validarFoto } from '../server/image-validation.js';
import { armazenarFoto } from '../server/image-storage.js';
import {
  criarCookieSessao, origemDaRequisicaoValida, usuarioDaSessao,
  validarConfiguracaoSessao
} from '../server/auth-session.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENEROS_VALIDOS = ['masculino', 'feminino', 'LGBTQ+', 'nao-binario', 'nao-informar'];
const GENEROS_CADASTRO = GENEROS_VALIDOS.slice(0, 2);
async function validarFormularioUsuario(body, { cadastro = false } = {}) {
  const dados = {};
  const temCampo = (campo) => Object.prototype.hasOwnProperty.call(body, campo);

  if (cadastro || temCampo('nome_usuario')) {
    const nome = typeof body.nome_usuario === 'string' ? body.nome_usuario.trim() : '';
    if (!nome) {
      return { erro: 'Informe o nome do usuário.' };
    }
    dados.nome_usuario = nome;
  }

  if (cadastro || temCampo('email_usuario')) {
    const email = typeof body.email_usuario === 'string'
      ? body.email_usuario.trim().toLowerCase()
      : '';
    if (!EMAIL_VALIDO.test(email)) {
      return { erro: 'Informe um email válido.' };
    }
    dados.email_usuario = email;
  }

  if (cadastro || temCampo('numero_usuario')) {
    const telefone = typeof body.numero_usuario === 'string'
      ? body.numero_usuario.replace(/\D/g, '')
      : '';
    if (!/^\d{10,11}$/.test(telefone)) {
      return { erro: 'Informe um telefone válido com DDD.' };
    }
    dados.numero_usuario = telefone;
  }

  if (cadastro || temCampo('genero_usuario')) {
    const generosPermitidos = cadastro ? GENEROS_CADASTRO : GENEROS_VALIDOS;
    if (!generosPermitidos.includes(body.genero_usuario)) {
      return { erro: 'Informe um gênero válido.' };
    }
    dados.genero_usuario = body.genero_usuario;
  }

  if (cadastro || (typeof body.senha_usuario === 'string' && body.senha_usuario.length > 0)) {
    if (typeof body.senha_usuario !== 'string' || body.senha_usuario.length < 8) {
      return { erro: 'A senha deve ter pelo menos 8 caracteres.' };
    }
    if (!cadastro && (typeof body.senha_atual !== 'string' || !body.senha_atual)) {
      return { erro: 'Informe a senha atual para alterá-la.' };
    }
    dados.senha_usuario = body.senha_usuario;
  }

  // A imagem chega como Base64 e fica salva na coluna foto_usuario.
  if (Object.prototype.hasOwnProperty.call(body, 'foto_usuario')) {
    if (body.foto_usuario === null || body.foto_usuario === '') {
      dados.foto_usuario = null;
    } else {
      const resultadoImagem = await validarFoto(body.foto_usuario);
      if (resultadoImagem.erro) {
        return resultadoImagem;
      }
      dados.foto_usuario = await armazenarFoto(resultadoImagem);
    }
  }

  return { dados };
}

async function criarConta(body, res) {
  const validacao = await validarFormularioUsuario(body, { cadastro: true });
  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const { dados } = validacao;
  if (await buscarUsuarioPorEmail(dados.email_usuario)) {
    return res.status(409).json({ erro: 'Já existe uma conta com este email.' });
  }

  const resultado = await criarUsuario({
    ...dados,
    senha_usuario: await hashPassword(dados.senha_usuario)
  });
  const usuario = await buscarUsuario(resultado.insertId);
  // O cadastro inicia a sessão sem expor uma credencial ao JavaScript da página.
  criarCookieSessao(res, usuario.id_usuario);
  return res.status(201).json({ usuario });
}

async function obterUsuario(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) {
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }

  const usuario = await buscarUsuario(usuarioId);
  return usuario
    ? res.status(200).json({ usuario })
    : res.status(404).json({ erro: 'Usuário não encontrado.' });
}

async function atualizarPerfil(req, body, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!origemDaRequisicaoValida(req)) {
    return res.status(403).json({ erro: 'Origem da requisição não permitida.' });
  }

  const usuarioId = usuarioDaSessao(req);
  if (!usuarioId) {
    return res.status(401).json({ erro: 'Entre na sua conta para continuar.' });
  }

  const validacao = await validarFormularioUsuario(body);
  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const { dados } = validacao;
  if (dados.email_usuario) {
    const usuarioExistente = await buscarUsuarioPorEmail(dados.email_usuario);
    if (usuarioExistente && Number(usuarioExistente.id_usuario) !== usuarioId) {
      return res.status(409).json({ erro: 'Este email já está sendo usado.' });
    }
  }

  if (dados.senha_usuario) {
    const usuarioComSenha = await buscarSenhaUsuario(usuarioId);
    if (!usuarioComSenha) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const senhaAtualValida = await verificarSenha(body.senha_atual, usuarioComSenha.senha_usuario);
    if (!senhaAtualValida) {
      return res.status(401).json({ erro: 'A senha atual está incorreta.' });
    }
    dados.senha_usuario = await hashPassword(dados.senha_usuario);
  }

  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: 'Nenhum dado válido para atualizar.' });
  }

  const resultado = await atualizarUsuario(usuarioId, dados);
  if (resultado.affectedRows === 0 && !(await buscarUsuario(usuarioId))) {
    return res.status(404).json({ erro: 'Usuário não encontrado.' });
  }

  const usuario = await buscarUsuario(usuarioId);
  return res.status(200).json({ usuario });
}

export default async function handler(req, res) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    switch (req.method) {
      case 'POST':
        if (!origemDaRequisicaoValida(req)) {
          return res.status(403).json({ erro: 'Request origin not allowed.' });
        }
        validarConfiguracaoSessao();
        return await criarConta(body, res);
      case 'GET':
        return await obterUsuario(req, res);
      case 'PUT':
        return await atualizarPerfil(req, body, res);
      default:
        return res.status(405).json({ erro: 'Método não permitido' });
    }
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Já existe uma conta com estes dados.' });
    }
    console.error('Erro na API de usuários:', erro);
    return res.status(500).json({ erro: 'Erro ao acessar usuários' });
  }
}
