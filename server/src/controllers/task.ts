import { router, protectedProcedure } from '../trpcBase';
import prisma from '../shared/prisma';
import { checkConflicts } from '../services/conflictService';
import {
  taskFilterSchema,
  taskInputSchema,
  taskUpdateSchema,
  idParam,
} from '../schemas';

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const taskRouter = router({
  // Get all tasks for the current user
  getTasks: protectedProcedure
    .input(taskFilterSchema)
    .query(async ({ ctx, input }) => {
      return prisma.task.findMany({
        where: {
          userId: ctx.user.id,
          ...(input?.status ? { status: input.status } : {}),
          ...(input?.priority ? { priority: input.priority } : {}),
          deletedAt: null,
        },
        orderBy: { sortOrder: 'asc' },
      });
    }),

  // Create a new task
  createTask: protectedProcedure
    .input(taskInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Find the last task's sortOrder to append this one
      const lastTask = await prisma.task.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { sortOrder: 'desc' },
      });

      const nextOrder = lastTask?.sortOrder 
        ? String.fromCharCode(lastTask.sortOrder.charCodeAt(lastTask.sortOrder.length - 1) + 1)
        : 'n';

      const start = input.startDate ? new Date(input.startDate) : null;
      const end = input.dueDate ? new Date(input.dueDate) : null;

      if (start && end) {
        const conflicts = await checkConflicts([ctx.user.id], start, end);
        if (conflicts.length > 0) {
          const first = conflicts[0];
          throw new Error(`Conflict! You have "${first.title}" from ${formatTime(first.start)} to ${formatTime(first.end)}.`);
        }
      }

      return prisma.task.create({
        data: {
          ...input,
          userId: ctx.user.id,
          startDate: start,
          dueDate: end,
          sortOrder: nextOrder,
        },
      });
    }),

  // Update task (position/status/title)
  updateTask: protectedProcedure
    .input(taskUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const start = data.startDate ? new Date(data.startDate) : (data.startDate === null ? null : undefined);
      const end = data.dueDate ? new Date(data.dueDate) : (data.dueDate === null ? null : undefined);

      if (start && end) {
        const conflicts = await checkConflicts([ctx.user.id], start, end, { excludeTaskId: id });
        if (conflicts.length > 0) {
          const first = conflicts[0];
          throw new Error(`Update failed: Conflict with "${first.title}" from ${formatTime(first.start)} to ${formatTime(first.end)}.`);
        }
      }

      return prisma.task.update({
        where: { id, userId: ctx.user.id },
        data: {
          ...data,
          startDate: start,
          dueDate: end,
        },
      });
    }),

  // Soft delete task
  deleteTask: protectedProcedure
    .input(idParam)
    .mutation(async ({ ctx, input }) => {
      return prisma.task.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { deletedAt: new Date() },
      });
    }),
});
