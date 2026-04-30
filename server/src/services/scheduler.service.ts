import cron from 'node-cron';
import prisma from '../shared/prisma';
import { GoogleCalendarService } from './google-calendar.service';
import { emitSignal } from '../socket';

export class SchedulerService {
  private static isSyncing = false;

  static init() {
    console.log(' Initializing Cron Scheduler...');

    // 1. Google Calendar Sync Heartbeat (Every 1 minute)
    cron.schedule('* * * * *', async () => {
      if (this.isSyncing) {
        console.log('[Scheduler] Sync already in progress, skipping heartbeat.');
        return;
      }

      this.isSyncing = true;
      try {
        await this.syncAllGoogleCalendars();
      } catch (err) {
        console.error('[Scheduler] Global sync failed:', err);
      } finally {
        this.isSyncing = false;
      }
    });

    // 2. Reminder Dispatcher (Every 1 minute)
    cron.schedule('* * * * *', async () => {
      try {
        await this.dispatchReminders();
      } catch (err) {
        console.error('[Scheduler] Reminder dispatch failed:', err);
      }
    });

    console.log('  Background jobs scheduled (1-minute heartbeat)');
  }

  private static async syncAllGoogleCalendars() {
    const accounts = await prisma.oAuthAccount.findMany({
      where: { provider: 'google', NOT: { refreshToken: null } }
    });

    if (accounts.length === 0) return;

    console.log(`[Scheduler] Heartbeat: Syncing ${accounts.length} Google accounts...`);

    for (const account of accounts) {
      try {
        const service = await GoogleCalendarService.forUser(account.userId);
        if (service) {
          const count = await service.syncFromGoogle();
          if (count > 0) {
            emitSignal({ userId: account.userId }, 'calendarSyncComplete', { count });
          }
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to sync for user ${account.userId}:`, err);
      }
    }
  }

  private static async dispatchReminders() {
    const now = new Date();

    // Find reminders that need to fire but haven't yet
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        fireAt: { lte: now },
        sent: false
      },
      include: { user: true }
    });

    if (pendingReminders.length === 0) return;

    console.log(`[Scheduler] Firing ${pendingReminders.length} reminders...`);

    for (const reminder of pendingReminders) {
      try {
        console.log(` NOTIFICATION for User ${reminder.userId}: ${reminder.title}`);

        // In a real app, this would hit FCM. For now, we emit a socket signal and mark as sent.
        emitSignal({ userId: reminder.userId }, 'new_notification', {
          title: reminder.title,
          type: 'reminder'
        });

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { sent: true }
        });
      } catch (err) {
        console.error(`[Scheduler] Failed to fire reminder ${reminder.id}:`, err);
      }
    }
  }
}
