import { initTRPC, TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { AuthService } from './services/auth.service';

// Context definition
export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  const authHeader = req.headers.authorization;
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = AuthService.verifyToken(token);
    if (payload) {
      user = { id: payload.userId, email: payload.email };
    }
  }

  return {
    user,
    req,
    res,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialization of tRPC
 */
const t = initTRPC.context<Context>().create();

/**
 * Reusable middleware that checks if the user is logged in
 */
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

import { userRouter } from './controllers/user';
import { calendarRouter } from './controllers/calendar';
import { taskRouter } from './controllers/task';
import { googleSyncRouter } from './controllers/google-sync';
import { noteRouter } from './controllers/note';
import { groupRouter } from './controllers/group';

export const appRouter = router({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  profile: userRouter,
  calendar: calendarRouter,
  task: taskRouter,
  googleSync: googleSyncRouter,
  note: noteRouter,
  group: groupRouter,
});

export type AppRouter = typeof appRouter;
