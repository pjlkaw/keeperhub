import { randomBytes } from 'node:crypto';
import { criarClienteGoogle } from '../../server/google-auth.js';

const STATE_COOKIE = 'keeperhub_google_state';
const STATE_DURATION_SECONDS = 10 * 60;

function isHttps(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return forwardedProto === 'https' || (!forwardedProto && req.headers.host !== 'localhost');
}

export default function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ erro: 'Método não permitido' });
    }

    const { client, clientId, redirectUri } = criarClienteGoogle();
    const state = randomBytes(32).toString('base64url');
    const secure = isHttps(req) ? '; Secure' : '';
    res.setHeader(
      'Set-Cookie',
      `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${STATE_DURATION_SECONDS}${secure}`
    );

    const url = client.generateAuthUrl({
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
      include_granted_scopes: true,
      client_id: clientId,
      redirect_uri: redirectUri
    });
    return res.redirect(302, url);
  } catch (erro) {
    console.error('Erro ao iniciar login Google:', erro);
    return res.status(500).json({ erro: 'Não foi possível iniciar o login com Google.' });
  }
}
