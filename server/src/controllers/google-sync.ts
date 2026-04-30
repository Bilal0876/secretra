import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpcBase';
import { GoogleCalendarService } from '../services/google-calendar.service';

export const googleSyncRouter = router({
  /**
   * Manually trigger a sync with Google Calendar
   */
  syncNow: protectedProcedure.mutation(async ({ ctx }) => {
    const service = await GoogleCalendarService.forUser(ctx.user.id);
    if (!service) {
        console.error(`[SyncNow 412] User ID ${ctx.user.id} has no valid OAuth record.`);
        throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Google account not linked or refresh token missing. Please log in again.'
        });
    }

    const count = await service.syncFromGoogle();
    return {
      message: 'Sync successful',
      eventsSynced: count,
    };
  }),
});
