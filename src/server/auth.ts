import jwt from 'jsonwebtoken';
import { query } from './db';

// In production, this MUST come from import.meta.env.SPIRAL_SESSION_SECRET
const JWT_SECRET = import.meta.env.SPIRAL_SESSION_SECRET || 'dev_secret_key_12345';

export interface AuthSession {
  humanId: string;
  username: string;
  roles: string[];
}

export async function createSession(humanId: string, username: string): Promise<string> {
  // 1. Fetch user's roles from DB
  const roleResult = await query(
    `SELECT sr.role_name 
     FROM human_site_roles hsr 
     JOIN site_roles sr ON hsr.site_role_id = sr.id 
     WHERE hsr.human_id = $1`,
    [humanId]
  );
  
  const roles = roleResult.rows.map(r => r.role_name);

  // 2. Sign JWT
  const token = jwt.sign(
    { humanId, username, roles },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return token;
}

export function verifySession(token: string): AuthSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthSession;
    return decoded;
  } catch (err) {
    return null;
  }
}
