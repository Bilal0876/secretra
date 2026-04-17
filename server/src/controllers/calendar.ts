import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { PrismaClient, EventPriority, EventStatus } from '@ps/db';

const prisma = new PrismaClient();

// Explicitly define schemas to help TS inference in some IDE environments
const eventInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  groupId: z.string().uuid().optional(),
  eventType: z.string().default('event'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isAllDay: z.boolean().default(false),
  priority: z.nativeEnum(EventPriority).default(EventPriority.medium),
  status: z.nativeEnum(EventStatus).default(EventStatus.confirmed),
  googleEventId: z.string().optional(),
});

const eventUpdateSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  eventType: z.string().default('event'), // 'meeting' | 'event' | 'reminder' | 'task' | 'call' | 'lunch' | 'travel' | string
  title: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  priority: z.nativeEnum(EventPriority).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  googleEventId: z.string().optional(),
});

export const calendarRouter = router({
  // Get all events for the current user
  getEvents: protectedProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      groupId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return prisma.event.findMany({
        where: {
          userId: ctx.user.id,
          ...(input?.groupId ? { groupId: input.groupId } : {}),
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
      });
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

      // Get the member's events
      return prisma.event.findMany({
        where: {
          userId: input.memberId,
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
      });
    }),

  // Create a new event
  createEvent: protectedProcedure
    .input(eventInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { startAt, endAt, groupId, ...rest } = input;
      const start = new Date(startAt);
      const end = new Date(endAt);

      const conflictWhere = {
        userId: ctx.user.id,
        ...(groupId ? { groupId } : {}),
        AND: [
          { startAt: { lt: end } },
          { endAt: { gt: start } },
        ],
      };

      const conflictingEvent = await prisma.event.findFirst({
        where: conflictWhere,
      });

      if (conflictingEvent) {
        throw new Error('Event time conflicts with an existing booking. Please choose a different time.');
      }

      return prisma.event.create({
        data: {
          ...rest,
          userId: ctx.user.id,
          groupId,
          startAt: start,
          endAt: end,
        },
      });
    }),

  // Update an existing event
  updateEvent: protectedProcedure
    .input(eventUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, startAt, endAt, groupId, ...data } = input;

      // Ensure the event belongs to the user
      const existing = await prisma.event.findFirst({
        where: { id, userId: ctx.user.id }
      });

      if (!existing) {
        throw new Error('Event not found or unauthorized');
      }

      const start = startAt ? new Date(startAt) : existing.startAt;
      const end = endAt ? new Date(endAt) : existing.endAt;
      const targetGroupId = groupId ?? existing.groupId;

      const conflictWhere = {
        userId: ctx.user.id,
        ...(targetGroupId ? { groupId: targetGroupId } : {}),
        AND: [
          { startAt: { lt: end } },
          { endAt: { gt: start } },
          { NOT: { id } },
        ],
      };

      const conflictingEvent = await prisma.event.findFirst({
        where: conflictWhere,
      });

      if (conflictingEvent) {
        throw new Error('Updated event time conflicts with an existing booking. Please choose a different time.');
      }

      return prisma.event.update({
        where: { id },
        data: {
          ...data,
          groupId,
          ...(startAt ? { startAt: start } : {}),
          ...(endAt ? { endAt: end } : {}),
        },
      });
    }),

  // Delete an event
  deleteEvent: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.event.deleteMany({
        where: {
          id: input.id,
          userId: ctx.user.id,
        },
      });
    }),
});
