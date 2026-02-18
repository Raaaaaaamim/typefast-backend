import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { syncUser } from '../services/userService';
import { authSyncSchema } from '../schemas/apiSchemas';
import { HonoEnv } from '../types/hono';

const auth = new Hono<{ Variables: HonoEnv['Variables'] }>();

auth.post('/sync', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = authSyncSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: 'Validation Error', details: validation.error.format() }, 400);
  }

  try {
    const user = await syncUser(userId, validation.data);
    return c.json({ success: true, user });
  } catch (error) {
    console.error('Sync Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default auth;
