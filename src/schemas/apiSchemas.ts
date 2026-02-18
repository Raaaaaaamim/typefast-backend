import { z } from 'zod';

export const authSyncSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const keystrokeSchema = z.object({
  key: z.string(),
  timestamp: z.number(),
  correct: z.boolean(),
  position: z.number(),
});

export const lessonSubmissionSchema = z.object({
  wpm: z.number().min(0).max(350),
  accuracy: z.number().min(0).max(1.0),
  score: z.number().min(0),
  duration: z.number().min(0),
  lessonText: z.string(),
  errorKeys: z.array(z.string()),
  correctKeys: z.array(z.string()),
  replay: z.object({
    keystrokes: z.array(keystrokeSchema),
  }),
});

export const leaderboardQuerySchema = z.object({
  type: z.enum(['wpm', 'time', 'score']),
  period: z.enum(['daily', 'weekly', 'alltime']),
});

export const userUpdateSchema = z.object({
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  isPublic: z.boolean().optional(),
});
