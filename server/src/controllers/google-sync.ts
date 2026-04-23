import { router, protectedProcedure } from '../trpcBase';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { googleCallbackSchema } from '../schemas';

export const googleSyncRouter = router({
  /**
   * Generates the Google Auth URL for the user
   */
  getAuthUrl: protectedProcedure.query(async ({ ctx }) => {
    return {
      url: GoogleCalendarService.getAuthUrl(ctx.user.id),
    };
  }),

  /**
   * Manually trigger a sync with Google Calendar
   */
  syncNow: protectedProcedure.mutation(async ({ ctx }) => {
    const count = await GoogleCalendarService.syncEvents(ctx.user.id);
    return {
      message: 'Sync successful',
      eventsSynced: count,
    };
  }),

  /**
   * Handle the OAuth callback (This should ideally be a REST route, 
   * but for simplified testing we can call it from a script)
   */
  handleCallback: protectedProcedure
    .input(googleCallbackSchema)
    .mutation(async ({ ctx, input }) => {
      await GoogleCalendarService.handleCallback(ctx.user.id, input.code);
      return { success: true };
    }),
});
