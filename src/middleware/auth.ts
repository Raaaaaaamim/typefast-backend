import { Next } from 'hono';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { HonoContext } from '../types/hono';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const authMiddleware = async (c: HonoContext, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    if (SUPABASE_JWT_SECRET) {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      if (!payload || !payload.sub) {
        throw new Error('Invalid token payload');
      }

      c.set('userId', payload.sub as string);
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    } else {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
      }

      c.set('userId', user.id);
      c.set('user', user);
    }

    await next();
  } catch (error) {
    console.error('Auth Error:', error);
    return c.json({ error: 'Unauthorized', message: 'Authentication failed' }, 401);
  }
};
