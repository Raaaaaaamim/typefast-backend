import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getUserProfile } from '../services/userService';
import { HonoEnv } from '../types/hono';

const user = new Hono<{ Variables: HonoEnv['Variables'] }>();

user.get('/:userId', async (c) => {
  const targetUserId = c.req.param('userId');

  let requesterId: string | undefined;
  // Note: We could try to extract userId from token here if present

  const profile = await getUserProfile(targetUserId, requesterId);

  if (!profile) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (profile === 'FORBIDDEN') {
    return c.json({ error: 'Forbidden', message: 'This profile is private' }, 403);
  }

  return c.json(profile);
});

user.get('/me/profile', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const profile = await getUserProfile(userId, userId);
  return c.json(profile);
});

export default user;
