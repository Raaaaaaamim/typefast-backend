import { Hono } from 'hono';
import { getLeaderboard } from '../services/statsService';
import { leaderboardQuerySchema } from '../schemas/apiSchemas';

const stats = new Hono();

stats.get('/leaderboard', async (c) => {
  const query = c.req.query();

  const validation = leaderboardQuerySchema.safeParse(query);
  if (!validation.success) {
    return c.json({ error: 'Invalid query parameters', details: validation.error.format() }, 400);
  }

  try {
    const leaderboard = await getLeaderboard(validation.data as any);
    return c.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default stats;
