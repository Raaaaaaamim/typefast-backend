import { Context } from 'hono';

export interface HonoEnv {
  Variables: {
    userId: string;
    user: any;
  };
}

export type HonoContext = Context<HonoEnv>;
