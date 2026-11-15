import { randomBytes } from 'node:crypto';
import {
  buscarUsuario, buscarUsuarioPorEmail, buscarUsuarioLoginSocial,
  criarUsuario, criarUsuarioLoginSocial
} from '../../server/repositories/usuario.js';
import { hashPassword } from '../../server/password.js';
import { criarCookieSessao } from '../../server/auth-session.js';
import { criarClienteGoogle, validarIdTokenGoogle } from '../../server/google-auth.js';

const STATE_COOKIE = 'keeperhub_google_state';

function cookieValue(req, name) {
  return String(req.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || null;
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function redirectError(res, message) {
  return res.redirect(302, `/main/entrar/index.html?erro=${encodeURIComponent(message)}`);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ erro: 'Método não permitido' });
    }
    res.setHeader('Set-Cookie', clearStateCookie());

    const { code, state, error } = req.query || {};
    if (error) return redirectError(res, 'Login com Google cancelado.');
    if (!code || !state || state !== cookieValue(req, STATE_COOKIE)) {
      return redirectError(res, 'Não foi possível validar o login com Google.');
    }

    const { client } = criarClienteGoogle();
    const { tokens } = await client.getToken(String(code));
    if (!tokens.id_token) {
      return redirectError(res, 'O Google não retornou uma identidade válida.');
    }

    const payload = await validarIdTokenGoogle(tokens.id_token);
    const email = String(payload.email).trim().toLowerCase();
    const loginSocial = await buscarUsuarioLoginSocial('google', payload.sub);
    let usuarioId = loginSocial?.usuario_id;

    if (!usuarioId) {
      let usuario = await buscarUsuarioPorEmail(email);
      if (!usuario) {
        const resultado = await criarUsuario({
          nome_usuario: String(payload.name || email.split('@')[0]).trim(),
          email_usuario: email,
          senha_usuario: await hashPassword(randomBytes(32).toString('base64url')),
          numero_usuario: null,
          genero_usuario: null,
          foto_usuario: payload.picture || null
        });
        usuario = await buscarUsuario(resultado.insertId);
      }
      usuarioId = usuario.id_usuario;
      await criarUsuarioLoginSocial({
        usuarioId,
        provedor: 'google',
        identificadorExterno: payload.sub,
        emailProvedor: email
      });
    }

    criarCookieSessao(res, usuarioId);
    return res.redirect(302, '/main/home/index.html');
  } catch (erro) {
    console.error('Erro no callback do Google:', erro);
    return redirectError(res, 'Não foi possível concluir o login com Google.');
  }
}
