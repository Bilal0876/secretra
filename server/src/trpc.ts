import { createContext, router, publicProcedure, protectedProcedure } from './trpcBase';
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
export { createContext };
