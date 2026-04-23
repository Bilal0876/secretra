import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { EventPriority, EventStatus, GroupMemberStatus } from '@ps/db';
import prisma from '../shared/prisma';
import { emitSignal } from '../socket';
import { checkConflicts } from '../services/conflictService';

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Explicitly define schemas to help TS inference in some IDE environments
const eventInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  eventType: z.string().default('event'),
  priority: z.nativeEnum(EventPriority).default(EventPriority.medium),
  status: z.nativeEnum(EventStatus).default(EventStatus.confirmed),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  groupId: z.string().uuid().optional(),
  attendeeIds: z.array(z.string().uuid()).optional(),
  reminderMinutes: z.number().int().nullable().optional(),
  isAllDay: z.boolean().optional().default(false),
});

const eventUpdateSchema = eventInputSchema.extend({
  id: z.string().uuid(),
  title: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

export const calendarRouter = router({
  // Get all events for the current user
  getEvents: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const filters: any = {
        OR: [
          { userId: ctx.user.id },
          { attendees: { some: { id: ctx.user.id } } },
        ],
      };

      if (input?.groupId) {
        filters.groupId = input.groupId;
      }

      if (input?.startDate || input?.endDate) {
        filters.startAt = {
          ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
          ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
        };
      }

      return prisma.event.findMany({
        where: filters,
        orderBy: { startAt: 'asc' },
        include: {
          group: true,
          user: { select: { name: true } },
        },
      });
    }),

  // Get events for a specific member in a group context
  getTeamMemberCalendar: protectedProcedure
    .input(z.object({
      groupId: z.string().uuid(),
      memberId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ input }) => {
      const events = await prisma.event.findMany({
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
        } as any,
        orderBy: { startAt: 'asc' },
        include: {
          group: true,
        },
      });

      // Privacy: Redact title if event belongs to a different group
      return events.map(e => ({
        ...e,
        title: e.groupId === input.groupId ? e.title : 'Busy (Private Event)',
        location: e.groupId === input.groupId ? e.location : undefined,
      }));
    }),

  // Create a new event
  createEvent: protectedProcedure
    .input(eventInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { startAt, endAt, groupId, attendeeIds, ...rest } = input;
      const start = new Date(startAt);
      const end = new Date(endAt);

      // 🚨 UNIFIED CONFLICT DETECTION 🚨
      const targetUserIds = [ctx.user.id, ...(attendeeIds || [])];

      const conflicts = await checkConflicts(targetUserIds, start, end);

      if (conflicts.length > 0) {
        const busyNames = [...new Set(conflicts.map((c: any) => 
          c.userId === ctx.user.id ? 'You' : (c.userName || 'a participant')
        ))];
        if (busyNames.includes('You')) {
          const idx = busyNames.indexOf('You');
          busyNames.splice(idx, 1);
          busyNames.unshift('You');
        }
        const namesStr = busyNames.length > 1 
          ? busyNames.slice(0, -1).join(', ') + ' & ' + busyNames.slice(-1)
          : busyNames[0];
        
        throw new Error(`Conflict! ${namesStr} ${busyNames.length > 1 ? 'are' : 'is'} busy from ${formatTime(conflicts[0].start)} to ${formatTime(conflicts[0].end)}.`);
      }

      const event = await prisma.event.create({
        data: {
          ...rest,
          isAllDay: input.isAllDay,
          priority: input.priority,
          reminderMinutes: input.reminderMinutes,
          userId: ctx.user.id,
          groupId,
          startAt: start,
          endAt: end,
          attendees: attendeeIds?.length
            ? { connect: attendeeIds.map((id) => ({ id })) }
            : undefined,
        } as any,
        include: { attendees: { select: { id: true } } },
      });

      // Signal attendees and group
      if (groupId) await emitSignal({ groupId }, 'calendar_update');
      for (const a of (event.attendees || [])) {
        await emitSignal({ userId: (a as any).id }, 'calendar_update');
      }
      await emitSignal({ userId: ctx.user.id }, 'calendar_update');

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

      const start = startAt ? new Date(startAt) : existing.startAt;
      const end = endAt ? new Date(endAt) : existing.endAt;

      // Unified Conflict check for owner + new attendee list
      const targetUserIds = [ctx.user.id, ...(attendeeIds || [])];

      const conflicts = await checkConflicts(targetUserIds, start, end, { excludeEventId: id });

      if (conflicts.length > 0) {
        const busyNames = [...new Set(conflicts.map((c: any) => 
          c.userId === ctx.user.id ? 'You' : (c.userName || 'a participant')
        ))];
        if (busyNames.includes('You')) {
          const idx = busyNames.indexOf('You');
          busyNames.splice(idx, 1);
          busyNames.unshift('You');
        }
        const namesStr = busyNames.length > 1 
          ? busyNames.slice(0, -1).join(', ') + ' & ' + busyNames.slice(-1)
          : busyNames[0];
        throw new Error(`Update conflict! ${namesStr} ${busyNames.length > 1 ? 'are' : 'is'} busy from ${formatTime(conflicts[0].start)} to ${formatTime(conflicts[0].end)}.`);
      }

      const updatedEvent = await prisma.event.update({
        where: { id },
        data: {
          ...data,
          isAllDay: input.isAllDay,
          priority: input.priority,
          reminderMinutes: input.reminderMinutes,
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

      const allConflicts = await checkConflicts(memberIds, start, end);

      return members.map((member) => {
        const mId = member.user?.id || member.userId;
        const memberConflicts = allConflicts.filter((c: any) => c.userId === mId);

        return {
          userId: member.user?.id,
          name: member.user?.name,
          avatarUrl: member.user?.avatarUrl,
          isBusy: memberConflicts.length > 0,
          conflictingEvents: memberConflicts.map(c => ({
            ...c,
            // Privacy: Redact title if event belongs to a different group (or no group) or is a task
            title: (c.type === 'event' && c.groupId === groupId) ? c.title : `Busy (${c.type === 'task' ? 'Task' : 'Private Event'})`,
          })),
        };
      });
    }),

  // Get a summary overview for the dashboard
  getDashboardOverview: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const [nextEvent, todayCount] = await Promise.all([
        prisma.event.findFirst({
          where: {
            OR: [
              { userId: ctx.user.id },
              { attendees: { some: { id: ctx.user.id } } },
            ],
            startAt: { gte: now },
          },
          orderBy: { startAt: 'asc' },
          include: {
            group: { select: { name: true } },
          },
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
      ]);

      return {
        nextEvent,
        todayCount,
      };
    }),
});
