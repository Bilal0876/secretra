import { google } from 'googleapis';
import prisma from '../shared/prisma';

export class GoogleCalendarService {
  private oauth2Client: any;
  private userId: string;

  constructor(userId: string, accessToken?: string, refreshToken?: string) {
    this.userId = userId;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback'
    );

    if (accessToken || refreshToken) {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    // Refresh token automatically when expired
    this.oauth2Client.on('tokens', (tokens: any) => {
      if (tokens.refresh_token) {
        // Save new refresh token
        prisma.oAuthAccount.updateMany({
           where: { userId: this.userId, provider: 'google' },
           data: { refreshToken: tokens.refresh_token }
        }).catch(err => console.error('Failed to update refreshed refresh token:', err));
      }
      if (tokens.access_token) {
          prisma.oAuthAccount.updateMany({
              where: { userId: this.userId, provider: 'google' },
              data: { 
                  accessToken: tokens.access_token,
                  expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
              }
          }).catch(err => console.error('Failed to update refreshed access token:', err));
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
      oauthAccount.refreshToken
    );
  }

  /**
   * Syncs events FROM Google TO Local
   */
  async syncFromGoogle() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    try {
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const googleEvents = res.data.items || [];
      
      for (const gEvent of googleEvents) {
        if (!gEvent.summary || !gEvent.id) continue;

        const startAt = new Date(gEvent.start?.dateTime || gEvent.start?.date || '');
        const endAt = new Date(gEvent.end?.dateTime || gEvent.end?.date || '');

        // 1. Check if this is a reflection of a local Task
        const existingTask = await (prisma.task as any).findFirst({
            where: { googleEventId: gEvent.id }
        });

        if (existingTask) {
            // Update the task instead of creating an event
            await (prisma.task as any).update({
                where: { id: existingTask.id },
                data: {
                    title: gEvent.summary.replace(/^\[Task\]\s*/, ''),
                    description: gEvent.description || '',
                    startDate: startAt,
                    dueDate: endAt,
                }
            });

            // Cleanup: If we accidentally created an Event for this Task earlier, delete it
            await (prisma.event as any).deleteMany({
                where: { googleEventId: gEvent.id }
            });

            continue; // Skip event creation
        }

        // 2. Otherwise handle as a normal Event
        const existingEvent = await (prisma.event as any).findFirst({
          where: { googleEventId: gEvent.id }
        });

        const eventData = {
          title: gEvent.summary,
          description: gEvent.description || '',
          location: gEvent.location || '',
          startAt,
          endAt,
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
      }
      
      return googleEvents.length;
    } catch (error) {
      console.error('syncFromGoogle error:', error);
      throw error;
    }
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
    const gBody = {
        summary: event.title,
        description: event.description || '',
        location: event.location || '',
        start: { dateTime: event.startAt.toISOString() },
        end: { dateTime: event.endAt.toISOString() },
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
    }) as any;
    if (!task || (!task.startDate && !task.dueDate)) return;

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const start = task.startDate || task.dueDate;
    const end = task.dueDate || task.startDate;

    const gBody = {
        summary: `[Task] ${task.title}`,
        description: task.description || '',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
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
                data: { googleEventId: res.data.id } as any
            });
        }
    }
  }

  /**
   * Deletes an event from Google
   */
  async deleteFromGoogle(googleEventId: string) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleEventId,
      });
    } catch (error: any) {
        // If already deleted on Google, ignore
        if (error.code !== 410 && error.code !== 404) throw error;
    }
  }

  /**
   * Deletes a task from Google
   */
  async deleteTaskFromGoogle(googleEventId: string) {
    return this.deleteFromGoogle(googleEventId);
  }
}
