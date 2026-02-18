import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { submitLesson } from '../services/lessonService';
import { lessonSubmissionSchema } from '../schemas/apiSchemas';
import { HonoEnv } from '../types/hono';

const lessons = new Hono<{ Variables: HonoEnv['Variables'] }>();

lessons.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();

  const validation = lessonSubmissionSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ error: 'Validation Error', details: validation.error.format() }, 400);
  }

  try {
    const result = await submitLesson(userId, validation.data);
    return c.json(result, 201);
  } catch (error: any) {
    console.error('Lesson Submission Error:', error);
    return c.json({ error: 'Failed to save lesson', message: error.message }, 500);
  }
});

export default lessons;
