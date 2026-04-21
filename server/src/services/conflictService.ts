import { PrismaClient } from '@prisma/client';
import prisma from '../shared/prisma';

export interface Conflict {
  type: 'event' | 'task';
  id: string;
  title: string;
  start: Date;
  end: Date;
  userId: string; // The user for whom this is a conflict
  userName?: string;
  groupId?: string | null;
  ownerId?: string; // Original owner of the event/task
}

export async function checkConflicts(
  userIds: string[],
  start: Date,
  end: Date,
  params: { excludeEventId?: string; excludeTaskId?: string } = {}
): Promise<Conflict[]> {
  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: {
        AND: [
          {
            OR: [
              { userId: { in: userIds } },
              { attendees: { some: { id: { in: userIds } } } },
            ],
          },
          { startAt: { lt: end } },
          { endAt: { gt: start } },
          ...(params.excludeEventId ? [{ NOT: { id: params.excludeEventId } }] : []),
        ],
      } as any,
      include: { 
        user: { select: { id: true, name: true } },
        attendees: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        AND: [
          { userId: { in: userIds } },
          { startDate: { lt: end, not: null } },
          { dueDate: { gt: start, not: null } },
          { deletedAt: null },
          ...(params.excludeTaskId ? [{ NOT: { id: params.excludeTaskId } }] : []),
        ],
      } as any,
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const conflicts: Conflict[] = [];

  // Add event conflicts for EVERY involved user requested
  events.forEach((e: any) => {
    // Check owner
    if (userIds.includes(e.userId)) {
      conflicts.push({
        type: 'event',
        id: e.id,
        title: e.title,
        start: e.startAt,
        end: e.endAt,
        userId: e.userId,
        userName: e.user?.name || 'User',
        groupId: e.groupId,
        ownerId: e.userId,
      });
    }

    // Check attendees
    e.attendees?.forEach((att: any) => {
      if (userIds.includes(att.id) && att.id !== e.userId) {
        conflicts.push({
          type: 'event',
          id: e.id,
          title: e.title,
          start: e.startAt,
          end: e.endAt,
          userId: att.id,
          userName: att.name || 'User',
          groupId: e.groupId,
          ownerId: e.userId,
        });
      }
    });
  });

  // Add task conflicts
  tasks.forEach((t: any) => {
    conflicts.push({
      type: 'task',
      id: t.id,
      title: t.title,
      start: t.startDate!,
      end: t.dueDate!,
      userId: t.userId,
      userName: t.user?.name || 'User',
      ownerId: t.userId,
    });
  });

  return conflicts;
}
