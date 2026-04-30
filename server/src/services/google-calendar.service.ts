import { google } from 'googleapis';
import prisma from '../shared/prisma';

export class GoogleCalendarService {
  private oauth2Client: any;
  private userId: string;

  private syncToken: string | null = null;

  constructor(userId: string, accessToken?: string, refreshToken?: string, syncToken?: string | null, expiresAt?: Date | null) {
    this.userId = userId;
    this.syncToken = syncToken || null;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback'
    );
    // ... existing token logic ...
    if (accessToken || refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiresAt ? expiresAt.getTime() : undefined,
      });
    }

    // Refresh token automatically when expired
    this.oauth2Client.on('tokens', (tokens: any) => {
      if (tokens.refresh_token) {
        prisma.oAuthAccount.updateMany({
           where: { userId: this.userId, provider: 'google' },
           data: { refreshToken: tokens.refresh_token }
        }).catch((err: any) => console.error('Failed to update refreshed refresh token:', err));
      }
      if (tokens.access_token) {
          prisma.oAuthAccount.updateMany({
              where: { userId: this.userId, provider: 'google' },
              data: { 
                  accessToken: tokens.access_token,
                  expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
              }
          }).catch((err: any) => console.error('Failed to update refreshed access token:', err));
      }
    });
  }

  /**
   * Initializes the service for a specific user
   */
  static async forUser(userId: string) {
    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: { userId, provider: 'google' },
    });

    if (!oauthAccount || !oauthAccount.refreshToken) {
      return null;
    }

    return new GoogleCalendarService(
      userId,
      oauthAccount.accessToken || undefined,
      oauthAccount.refreshToken,
      (oauthAccount as any).syncToken,
      oauthAccount.expiresAt
    );
  }

  /**
   * Syncs events FROM Google TO Local (Incremental)
   */
  async syncFromGoogle() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const params: any = {
        calendarId: 'primary',
        singleEvents: true,
      };

      if (this.syncToken) {
        params.syncToken = this.syncToken;
      } else {
        params.timeMin = new Date().toISOString();
      }

      let res;
      try {
        res = await calendar.events.list(params);
      } catch (err: any) {
        if (err.code === 410) {
          console.log('🔄 Sync token expired, performing full sync...');
          delete params.syncToken;
          params.timeMin = new Date().toISOString();
          res = await calendar.events.list(params);
        } else {
          throw err;
        }
      }

      const googleEvents = res.data.items || [];
      const nextSyncToken = res.data.nextSyncToken;
      
      for (const gEvent of googleEvents) {
        if (!gEvent.id) continue;

        // Handle Deletions
        if (gEvent.status === 'cancelled') {
          await this.handleGoogleDeletion(gEvent.id);
          continue;
        }

        if (!gEvent.summary) continue;

        try {
          const startAt = new Date(gEvent.start?.dateTime || gEvent.start?.date || '');
          const endAt = new Date(gEvent.end?.dateTime || gEvent.end?.date || '');

          if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
             console.warn(`[GoogleSync] Skipping google event ${gEvent.id} - Invalid Date`);
             continue;
          }

          // 1. Check if this is a reflection of a local Task
          const existingTask = await prisma.task.findFirst({
              where: { googleEventId: gEvent.id }
          });

          if (existingTask) {
              await prisma.task.update({
                  where: { id: existingTask.id },
                  data: {
                      title: gEvent.summary.replace(/^\[Task\]\s*/, ''),
                      description: gEvent.description || '',
                      startDate: startAt,
                      dueDate: endAt,
                  }
              });
              continue;
          }

          // 2. Handle as normal Event
          const existingEvent = await prisma.event.findFirst({
            where: { googleEventId: gEvent.id }
          });

          const eventData = {
            title: gEvent.summary,
            description: gEvent.description || '',
            location: gEvent.location || '',
            startAt,
            endAt,
            isAllDay: !!gEvent.start?.date,
          };

          if (existingEvent) {
            await prisma.event.update({
              where: { id: existingEvent.id },
              data: eventData,
            });
          } else {
            await prisma.event.create({
              data: {
                ...eventData,
                userId: this.userId,
                googleEventId: gEvent.id,
                priority: 'medium',
                status: 'confirmed',
              },
            });
          }
        } catch (eventErr) {
           console.error(`[GoogleSync] Failed to process event ${gEvent.id}:`, eventErr);
        }
      }

      // Update sync token in DB
      if (nextSyncToken) {
          await prisma.oAuthAccount.updateMany({
              where: { userId: this.userId, provider: 'google' },
              data: { syncToken: nextSyncToken }
          });
          this.syncToken = nextSyncToken;
      }
      
      return googleEvents.length;
    } catch (error) {
      console.error('syncFromGoogle error:', error);
      throw error;
    }
  }

  private async handleGoogleDeletion(googleEventId: string) {
    await prisma.event.deleteMany({
      where: { userId: this.userId, googleEventId }
    });
    await prisma.task.deleteMany({
      where: { userId: this.userId, googleEventId }
    });
  }

  /**
   * Pushes a local event TO Google
   */
  async pushToGoogle(localEventId: string) {
    const event = await prisma.event.findUnique({
        where: { id: localEventId }
    });
    if (!event) return;

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    let startObj: any = { dateTime: event.startAt.toISOString() };
    let endObj: any = { dateTime: event.endAt.toISOString() };

    if (event.isAllDay) {
        // Google requires YYYY-MM-DD for all-day events
        startObj = { date: event.startAt.toISOString().split('T')[0] };
        
        // End date is exclusive in Google Calendar, so we shouldn't necessarily add a day 
        // if Prisma endAt is already correctly set to next day, but let's just use the endAt date
        // Note: For 1-day all-day event, end date must be the next day (exclusive).
        // Since our app might store endAt = startAt for 1 day events, let's ensure it's exclusive:
        const d = new Date(event.endAt);
        if (event.startAt.toISOString().split('T')[0] === event.endAt.toISOString().split('T')[0]) {
           d.setDate(d.getDate() + 1);
        }
        endObj = { date: d.toISOString().split('T')[0] };
    }

    const gBody = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: startObj,
        end: endObj,
    };

    if (event.googleEventId) {
        await calendar.events.update({
            calendarId: 'primary',
            eventId: event.googleEventId,
            requestBody: gBody,
        });
    } else {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: gBody,
        });
        if (res.data.id) {
            await prisma.event.update({
                where: { id: event.id },
                data: { googleEventId: res.data.id }
            });
        }
    }
  }

  /**
   * Pushes a local task TO Google as an event
   */
  async pushTaskToGoogle(taskId: string) {
    const task = await prisma.task.findUnique({
        where: { id: taskId }
    });
    if (!task || (!task.startDate && !task.dueDate)) return;

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const start = task.startDate || task.dueDate;
    const end = task.dueDate || task.startDate;

    const gBody = {
        summary: `[Task] ${task.title}`,
        description: task.description || '',
        start: { dateTime: start?.toISOString() },
        end: { dateTime: end?.toISOString() },
    };

    if (task.googleEventId) {
        await calendar.events.update({
            calendarId: 'primary',
            eventId: task.googleEventId,
            requestBody: gBody,
        });
    } else {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: gBody,
        });
        if (res.data.id) {
            await prisma.task.update({
                where: { id: task.id },
                data: { googleEventId: res.data.id }
            });
        }
    }
  }

  /**
   * Deletes an event from Google
   */
  async deleteFromGoogle(googleEventId: string) {
    console.log(`[GoogleDelete] Attempting to delete event ${googleEventId} from Google...`);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
      console.log(`[GoogleDelete] Successfully deleted event ${googleEventId} from Google.`);
    } catch (error: any) {
        if (error.code === 410 || error.code === 404) {
             console.log(`[GoogleDelete] Event ${googleEventId} already deleted or not found on Google.`);
             return;
        }
        console.error(`[GoogleDelete] Failed to delete event ${googleEventId}:`, error);
        throw error;
    }
  }

  /**
   * Deletes a task from Google
   */
  async deleteTaskFromGoogle(googleEventId: string) {
    return this.deleteFromGoogle(googleEventId);
  }
}
