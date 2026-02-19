import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || 'dehla-pakad-secret-change-me';

const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo | null> {
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) return null;

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture,
    };
  } catch (err) {
    console.error('[Auth] Google token verification failed:', err);
    return null;
  }
}

export function createJWT(googleId: string, email: string, name: string): string {
  return jwt.sign({ googleId, email, name }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJWT(token: string): { googleId: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { googleId: string; email: string; name: string };
  } catch {
    return null;
  }
}
