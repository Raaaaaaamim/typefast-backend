import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import lessonRoutes from './routes/lessons';
import statsRoutes from './routes/stats';
import { HonoEnv } from './types/hono';

// Environment Check
const requiredEnv = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter(k => !process.env[k]);

if (missingEnv.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', `CRITICAL ERROR: Missing environment variables: ${missingEnv.join(', ')}`);
  console.error('\x1b[33m%s\x1b[0m', 'Please check your .env file or deployment settings.');
}

const app = new Hono<{ Variables: HonoEnv['Variables'] }>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors());

// Rate Limiting Middleware (In-memory)
const rateLimitMap = new Map<string, { count: number, reset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW });
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS) {
      return c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded' }, 429);
    }
  }
  await next();
});

// Routes
app.get('/', (c) => c.json({
  status: 'online',
  message: 'TypeFast Backend API',
  environment: missingEnv.length === 0 ? 'configured' : 'missing_config',
  missing_vars: missingEnv.length > 0 ? missingEnv : undefined
}));

app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/lessons', lessonRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api', statsRoutes);

// Error Handling
app.onError((err, c) => {
  console.error(`App Error: ${err}`);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, 500);
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
