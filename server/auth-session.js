import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import dotenv from 'dotenv';

// A rota de logout tambem precisa carregar a chave local, mesmo sem importar o pool SQL.
dotenv.config({ path: '.env.local' });
dotenv.config();

const COOKIE_NAME = '__Host-keeperhub_session';
const SESSION_DURATION_SECONDS = 12 * 60 * 60;

function sessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('AUTH_SESSION_SECRET deve ter pelo menos 32 bytes.');
  }
  return secret;
}

export function validarConfiguracaoSessao() {
  sessionSecret();
}

function assinar(conteudo) {
  return createHmac('sha256', sessionSecret()).update(conteudo).digest();
}

function lerCookie(req) {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.find((parte) => parte.trim().startsWith(`${COOKIE_NAME}=`));
  return cookie ? cookie.trim().slice(COOKIE_NAME.length + 1) : null;
}

// Cria um token assinado. O conteúdo pode ser lido pelo cliente, mas não alterado
// sem invalidar a assinatura; por isso, não inclua dados secretos no payload.
export function criarCookieSessao(res, usuarioId) {
  const agora = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: Number(usuarioId),
    iat: agora,
    exp: agora + SESSION_DURATION_SECONDS,
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  const assinatura = assinar(payload).toString('base64url');
  const token = `${payload}.${assinatura}`;

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`
  );
  res.setHeader('Cache-Control', 'no-store');
}

export function limparCookieSessao(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  res.setHeader('Cache-Control', 'no-store');
}

// Retorna o ID assinado somente quando a assinatura e a validade forem corretas.
export function usuarioDaSessao(req) {
  const token = lerCookie(req);
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length !== 2 || !partes.every((parte) => /^[A-Za-z0-9_-]+$/.test(parte))) {
    return null;
  }

  try {
    const [payloadCodificado, assinaturaCodificada] = partes;
    const assinaturaRecebida = Buffer.from(assinaturaCodificada, 'base64url');
    const assinaturaEsperada = assinar(payloadCodificado);
    if (assinaturaRecebida.length !== assinaturaEsperada.length ||
        !timingSafeEqual(assinaturaRecebida, assinaturaEsperada)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadCodificado, 'base64url').toString('utf8'));
    const usuarioId = Number(payload.sub);
    const agora = Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0 ||
        !Number.isSafeInteger(payload.exp) || payload.exp <= agora) {
      return null;
    }
    return usuarioId;
  } catch {
    return null;
  }
}

// Como a autenticação usa cookies, restringe operações de escrita à origem do app.
export function origemDaRequisicaoValida(req) {
  const origem = req.headers.origin;
  if (typeof origem !== 'string') return false;

  const hostEncaminhado = req.headers['x-forwarded-host'] || req.headers.host;
  const protocoloEncaminhado = req.headers['x-forwarded-proto'];
  const host = String(hostEncaminhado || '').split(',')[0].trim();
  const protocolo = String(protocoloEncaminhado || (host.startsWith('localhost') ? 'http' : 'https'))
    .split(',')[0].trim();
  if (!host || !['http', 'https'].includes(protocolo)) return false;

  try {
    return new URL(origem).origin === `${protocolo}://${host}`;
  } catch {
    return false;
  }
}
