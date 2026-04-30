import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { GroupMemberStatus } from '@ps/db';
import prisma from '../shared/prisma';
import { emitSignal } from '../socket';
import { GoogleCalendarService } from '../services/google-calendar.service';
import {
  eventInputSchema,
  eventUpdateSchema,
  eventFilterSchema,
  teamMemberCalendarSchema,
  teamAvailabilitySchema,
  dashboardOverviewSchema,
} from '../schemas';

export const calendarRouter = router({
  // Get dashboard overview stats
  getDashboardOverview: protectedProcedure
    .output(dashboardOverviewSchema)
    .query(async ({ ctx }) => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const [nextEvent, nextTask, todayCount, notesCount] = await Promise.all([
        prisma.event.findFirst({
          where: {
            OR: [
              { userId: ctx.user.id },
              { attendees: { some: { id: ctx.user.id } } },
            ],
            endAt: { gte: now }, // Include ongoing events
          },
          orderBy: { startAt: 'asc' },
          include: {
            group: { select: { name: true } },
            attendances: {
              where: { userId: ctx.user.id },
              take: 1
            },
          },
        }),
        prisma.task.findFirst({
          where: {
            userId: ctx.user.id,
            deletedAt: null,
            status: { not: 'done' },
            OR: [
              { startDate: { gte: now } },
              { dueDate: { gte: now } },
              { AND: [{ startDate: { lte: now } }, { dueDate: { gte: now } }] } // Currently active
            ],
          },
          orderBy: [
            { dueDate: 'asc' },
            { startDate: 'asc' }
          ],
        }),
        prisma.event.count({
          where: {
            OR: [
              { userId: ctx.user.id },
              { attendees: { some: { id: ctx.user.id } } },
            ],
            startAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),
        prisma.note.count({
          where: { userId: ctx.user.id, deletedAt: null },
        }),
      ]);

      return {
        nextEvent,
        nextTask,
        todayCount,
        notesCount,
      };
    }),

  // Get real activity log for Secretarial Log
  getRecentActivity: protectedProcedure
    .query(async ({ ctx }) => {
      const limit = 4; // Fetch few of each to keep it snappy
      const [notes, events, tasks] = await Promise.all([
        prisma.note.findMany({
          where: { userId: ctx.user.id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.event.findMany({
          where: { userId: ctx.user.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.task.findMany({
          where: { userId: ctx.user.id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);

      const log = [
        ...notes.map(n => ({
          id: `note-${n.id}`,
          text: `Created note: ${n.title || n.plainText?.slice(0, 20) || 'New Log'}`,
          time: n.createdAt,
          type: 'note'
        })),
        ...events.map(e => ({
          id: `event-${e.id}`,
          text: `Scheduled meeting: ${e.title}`,
          time: e.createdAt,
          type: 'event'
        })),
        ...tasks.map(t => ({
          id: `task-${t.id}`,
          text: `${t.status === 'done' ? 'Completed' : 'Task added'}: ${t.title}`,
          time: t.createdAt,
          type: 'task'
        })),
      ].sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5); // Return top 5 overall

      return log;
    }),

  // Get all events and tasks for the calendar view
  getEvents: protectedProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      groupId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const [events, tasks] = await Promise.all([
        prisma.event.findMany({
          where: {
            OR: [
              { userId: ctx.user.id },
              { groupId: input?.groupId },
              { attendees: { some: { id: ctx.user.id } } },
            ],
            ...(input?.startDate || input?.endDate ? {
              startAt: {
                ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
              }
            } : {}),
          },
          orderBy: { startAt: 'asc' },
          include: {
            group: true,
            attendees: { select: { id: true, name: true, avatarUrl: true } },
          },
        }),
        // Only fetch tasks for personal view (no groupId)
        !input?.groupId ? prisma.task.findMany({
          where: {
            userId: ctx.user.id,
            deletedAt: null,
            OR: [
              { startDate: { not: null } },
              { dueDate: { not: null } },
            ],
            ...(input?.startDate || input?.endDate ? {
              OR: [
                {
                  startDate: {
                    ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                    ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
                  }
                },
                {
                  dueDate: {
                    ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                    ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
                  }
                }
              ]
            } : {}),
          },
          orderBy: { startDate: 'asc' },
        }) : Promise.resolve([]),
      ]);

      // Normalize tasks into event-like objects
      const normalizedTasks = tasks.map(t => ({
        ...t,
        eventType: 'task',
        startAt: t.startDate || t.dueDate,
        endAt: t.dueDate || t.startDate,
        priority: t.priority,
        isRealTask: true,
      }));

      return [...events, ...normalizedTasks].sort((a, b) =>
        new Date(a.startAt as any).getTime() - new Date(b.startAt as any).getTime()
      );
    }),

  // Get team member's calendar (only if they're in a shared group)
  getTeamMemberCalendar: protectedProcedure
    .input(z.object({
      memberId: z.string().uuid(),
      groupId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify both users are members of the same group
      const [currentUserInGroup, targetUserInGroup] = await Promise.all([
        prisma.groupMember.findFirst({
          where: {
            groupId: input.groupId,
            userId: ctx.user.id,
          },
        }),
        prisma.groupMember.findFirst({
          where: {
            groupId: input.groupId,
            userId: input.memberId,
          },
        }),
      ]);

      if (!currentUserInGroup || !targetUserInGroup) {
        throw new Error('Access denied: Both users must be in the same group');
      }

      // Get the member's events and tasks
      const [events, tasks] = await Promise.all([
        prisma.event.findMany({
          where: {
            OR: [
              { userId: input.memberId },
              { attendees: { some: { id: input.memberId } } },
            ],
            ...(input?.startDate || input?.endDate ? {
              startAt: {
                ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
              }
            } : {}),
          },
          orderBy: { startAt: 'asc' },
          include: {
            group: true,
          },
        }),
        prisma.task.findMany({
          where: {
            userId: input.memberId,
            deletedAt: null,
            ...(input?.startDate || input?.endDate ? {
              startDate: {
                ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
              }
            } : {}),
          },
          orderBy: { startDate: 'asc' },
        }),
      ]);

      // Map combined items
      const combined = [
        ...events.map(e => ({
          ...e,
          type: 'event',
          title: e.groupId === input.groupId ? e.title : 'Busy (Private Event)',
          location: e.groupId === input.groupId ? e.location : undefined,
          start: e.startAt,
          end: e.endAt,
        })),
        ...tasks.map(t => ({
          ...t,
          type: 'task',
          title: 'Busy (Private Task)', // 🔒 Privacy: Task titles are always masked for others
          start: t.startDate,
          end: t.dueDate,
        })),
      ].sort((a, b) => new Date(a.start as any).getTime() - new Date(b.start as any).getTime());

      return combined;
    }),

  // Create a new event
  createEvent: protectedProcedure
    .input(eventInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { startAt, endAt, groupId, attendeeIds, ...rest } = input;
      const start = new Date(startAt);
      const end = new Date(endAt);

      // 🚨 TARGETED CONFLICT DETECTION 🚨
      // We check for the owner AND specified attendees
      const targetUserIds = [ctx.user.id, ...(attendeeIds || [])];

      const conflictingEvents = await prisma.event.findMany({
        where: {
          OR: [
            { userId: { in: targetUserIds } },
            { attendees: { some: { id: { in: targetUserIds } } } },
          ],
          AND: [
            { startAt: { lt: end } },
            { endAt: { gt: start } },
          ],
        },
        include: { user: { select: { name: true } } },
      });

      if (conflictingEvents.length > 0) {
        const busyNames = [...new Set(conflictingEvents.map((e: any) =>
          e.userId === ctx.user.id ? 'You' : (e.user?.name || 'a participant')
        ))];
        // Move "You" to the front if it exists
        if (busyNames.includes('You')) {
          const idx = busyNames.indexOf('You');
          busyNames.splice(idx, 1);
          busyNames.unshift('You');
        }
        const namesStr = busyNames.length > 1
          ? busyNames.slice(0, -1).join(', ') + ' & ' + busyNames.slice(-1)
          : busyNames[0];
        throw new Error(`Conflict! ${namesStr} ${busyNames.length > 1 ? 'are' : 'is'} already busy during this time.`);
      }

      const event = await prisma.event.create({
        data: {
          ...rest,
          userId: ctx.user.id,
          groupId,
          startAt: start,
          endAt: end,
          attendees: attendeeIds?.length
            ? { connect: attendeeIds.map((id) => ({ id })) }
            : undefined,
        },
        include: { attendees: { select: { id: true } } },
      });

      // Signal attendees and group
      if (groupId) await emitSignal({ groupId }, 'calendar_update');
      for (const a of (event.attendees || [])) {
        await emitSignal({ userId: (a as any).id }, 'calendar_update');
      }
      await emitSignal({ userId: ctx.user.id }, 'calendar_update');

      // Push to Google in background
      GoogleCalendarService.forUser(ctx.user.id).then(service => {
        if (service) service.pushToGoogle(event.id).catch((err: any) => console.error('Background Google push failed:', err));
      }).catch((err: any) => console.error('Background Google push initialization failed:', err));

      return event;
    }),

  // Update an existing event
  updateEvent: protectedProcedure
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, startAt, endAt, groupId, attendeeIds, ...data } = input;

      const existing = await prisma.event.findFirst({
        where: { id, userId: ctx.user.id },
        include: { attendees: { select: { id: true } } },
      });

      if (!existing) {
        throw new Error('Event not found or unauthorized');
      }

      const start = (startAt ? new Date(startAt) : existing.startAt) as Date;
      const end = (endAt ? new Date(endAt) : existing.endAt) as Date;

      // Conflict check for owner + new attendee list
      const targetUserIds = [ctx.user.id, ...(attendeeIds || [])];

      const conflictingEvents = await prisma.event.findMany({
        where: {
          AND: [
            {
              OR: [
                { userId: { in: targetUserIds } },
                { attendees: { some: { id: { in: targetUserIds } } } },
              ],
            },
            { startAt: { lt: end } },
            { endAt: { gt: start } },
            { NOT: { id } },
          ],
        },
        include: { user: { select: { name: true } } },
      });

      if (conflictingEvents.length > 0) {
        const busyNames = [...new Set(conflictingEvents.map((e: any) =>
          e.userId === ctx.user.id ? 'You' : (e.user?.name || 'a participant')
        ))];
        if (busyNames.includes('You')) {
          const idx = busyNames.indexOf('You');
          busyNames.splice(idx, 1);
          busyNames.unshift('You');
        }
        const namesStr = busyNames.length > 1
          ? busyNames.slice(0, -1).join(', ') + ' & ' + busyNames.slice(-1)
          : busyNames[0];
        throw new Error(`Update conflict! ${namesStr} ${busyNames.length > 1 ? 'are' : 'is'} busy during this time.`);
      }

      const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
          ...data,
          groupId,
          ...(startAt ? { startAt: start } : {}),
          ...(endAt ? { endAt: end } : {}),
          attendees: attendeeIds
            ? { set: attendeeIds.map((aid) => ({ id: aid })) }
            : undefined,
        } as any,
        include: { attendees: { select: { id: true } } },
      });

      // Signal attendees and group
      if (groupId) await emitSignal({ groupId }, 'calendar_update');
      if (existing.groupId && existing.groupId !== groupId) {
        await emitSignal({ groupId: existing.groupId }, 'calendar_update');
      }

      const allAttendeeIds = new Set([
        ...existing.attendees.map((a: any) => a.id),
        ...(updatedEvent.attendees?.map((a: any) => a.id) || [])
      ]);

      for (const uid of allAttendeeIds) {
        await emitSignal({ userId: uid as string }, 'calendar_update');
      }
      await emitSignal({ userId: ctx.user.id }, 'calendar_update');

      // Push to Google
      GoogleCalendarService.forUser(ctx.user.id).then(service => {
        if (service) service.pushToGoogle(updatedEvent.id).catch((err: any) => console.error('Background Google push failed:', err));
      }).catch((err: any) => console.error('Background Google push initialization failed:', err));

      return updatedEvent;
    }),

  // Delete an event
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const event = await prisma.event.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { attendees: { select: { id: true } } },
      });

      if (!event) return;

      const result = await prisma.event.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      });

      // Signal attendees and group
      if (event.groupId) await emitSignal({ groupId: event.groupId }, 'calendar_update');
      for (const a of (event.attendees || [])) {
        await emitSignal({ userId: (a as any).id }, 'calendar_update');
      }
      await emitSignal({ userId: ctx.user.id }, 'calendar_update');

      // Delete from Google if exists
      if (event.googleEventId) {
        GoogleCalendarService.forUser(ctx.user.id).then(service => {
          if (service) (service as any).deleteFromGoogle(event.googleEventId!).catch((err: any) => console.error('Background Google delete failed:', err));
        }).catch((err: any) => console.error('Background Google delete initialization failed:', err));
      }

      return result;
    }),

  // Check availability for all members of a group within a time range
  getTeamAvailability: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }))
    .query(async ({ input }) => {
      const { groupId, startDate, endDate } = input;
      const start = new Date(startDate);
      const end = new Date(endDate);

      const members = await prisma.groupMember.findMany({
        where: { groupId, status: GroupMemberStatus.accepted },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      });

      const memberIds = members
        .map((m) => m.userId)
        .filter((id): id is string => id !== null);

      const [events, tasks] = await Promise.all([
        prisma.event.findMany({
          where: {
            OR: [
              { userId: { in: memberIds } },
              { attendees: { some: { id: { in: memberIds } } } },
            ],
            AND: [
              { startAt: { lt: end } },
              { endAt: { gt: start } },
            ],
          } as any,
          select: {
            userId: true,
            title: true,
            startAt: true,
            endAt: true,
            groupId: true,
            attendees: { select: { id: true } },
            attendances: { select: { userId: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            userId: { in: memberIds },
            startDate: { lt: end, not: null },
            dueDate: { gt: start, not: null },
            deletedAt: null,
            status: { not: 'done' },
          },
          select: {
            userId: true,
            title: true,
            startDate: true,
            dueDate: true,
          },
        }),
      ]);

      return members.map((member) => {
        const mId = member.user?.id || member.userId;
        const now = new Date();
        const tenMins = 10 * 60 * 1000;

        const memberEvents = events
          .filter((e: any) => e.userId === mId || e.attendees?.some((a: any) => a.id === mId))
          .map(e => ({
            ...e,
            type: 'event',
            start: e.startAt,
            end: e.endAt,
          }));

        const memberTasks = tasks
          .filter((t: any) => t.userId === mId)
          .map(t => ({
            ...t,
            type: 'task',
            start: t.startDate,
            end: t.dueDate,
          }));

        const allItems = [...memberEvents, ...memberTasks].sort(
          (a, b) => new Date(a.start as any).getTime() - new Date(b.start as any).getTime()
        );

        // Calculate Status
        let status: 'available' | 'busy' | 'starting_soon' | 'ending_soon' = 'available';

        const currentItem = allItems.find(item =>
          new Date(item.start as any) <= now && new Date(item.end as any) > now
        );

        if (currentItem) {
          const timeLeft = new Date(currentItem.end as any).getTime() - now.getTime();
          
          if (currentItem.type === 'event') {
            const hasJoined = (currentItem as any).attendances?.some((a: any) => a.userId === mId);
            if (hasJoined) {
              status = timeLeft <= tenMins ? 'ending_soon' : 'busy';
            }
          } else {
            // Tasks (which don't have a join action) still show as busy when active
            status = timeLeft <= tenMins ? 'ending_soon' : 'busy';
          }
        } else {
          const nextItem = allItems.find(item => new Date(item.start as any) > now);
          if (nextItem) {
            const timeUntil = new Date(nextItem.start as any).getTime() - now.getTime();
            if (timeUntil <= tenMins) {
              status = 'starting_soon';
            }
          }
        }

        return {
          userId: member.user?.id,
          name: member.user?.name,
          avatarUrl: member.user?.avatarUrl,
          isBusy: status === 'busy' || status === 'ending_soon',
          status,
          conflictingEvents: allItems,
        };
      });
    }),

  // Mark user as "Joined" a meeting
  joinEvent: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { eventId } = input;

      // Verify user is an attendee or creator
      const event = await prisma.event.findFirst({
        where: {
          id: eventId,
          OR: [
            { userId: ctx.user.id },
            { attendees: { some: { id: ctx.user.id } } },
          ],
        },
      });

      if (!event) {
        throw new Error('Event not found or access denied');
      }

      const attendance = await prisma.eventAttendance.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId: ctx.user.id,
          },
        },
        create: {
          eventId,
          userId: ctx.user.id,
        },
        update: {
          joinedAt: new Date(), // Update join time if re-joining
        },
      });

      return attendance;
    }),
});
