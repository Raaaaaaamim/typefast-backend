import { Next } from 'hono';
import { jwtVerify } from 'jose';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HonoContext } from '../types/hono';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

let supabase: SupabaseClient | null = null;

const getSupabase = () => {
  if (supabase) return supabase;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
};

export const authMiddleware = async (c: HonoContext, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    // Priority 1: Local JWT Verification (Performance)
    if (SUPABASE_JWT_SECRET) {
      try {
        const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        if (payload && payload.sub) {
          c.set('userId', payload.sub as string);
          c.set('user', {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          });
          return await next();
        }
      } catch (jwtErr) {
        console.warn('Local JWT verification failed, falling back to Supabase API:', jwtErr);
      }
    }

    // Priority 2: Supabase API Verification
    const client = getSupabase();
    const { data: { user }, error } = await client.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Unauthorized', message: 'Invalid token' }, 401);
    }

    c.set('userId', user.id);
    c.set('user', user);

    await next();
  } catch (error: any) {
    console.error('Auth Error:', error.message);
    return c.json({
      error: 'Unauthorized',
      message: 'Authentication configuration error or invalid token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, 401);
  }
};
