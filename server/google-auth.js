import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config({ path: '.env.local' });
dotenv.config();

function googleConfig() {
  const config = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  };
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error(
      'Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.'
    );
  }
  return config;
}

export function criarClienteGoogle() {
  const config = googleConfig();
  return {
    client: new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri),
    ...config
  };
}

export async function validarIdTokenGoogle(idToken) {
  const { client, clientId } = criarClienteGoogle();
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('A conta Google não possui um email verificado.');
  }
  return payload;
}
