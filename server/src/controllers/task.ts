import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { PrismaClient, TaskPriority, TaskStatus } from '@ps/db';

const prisma = new PrismaClient();

export const taskRouter = router({
  // Get all tasks for the current user
  getTasks: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(TaskStatus).optional(),
      priority: z.nativeEnum(TaskPriority).optional(),
    }).optional())
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
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.nativeEnum(TaskPriority).default(TaskPriority.P3),
      status: z.nativeEnum(TaskStatus).default(TaskStatus.todo),
      startDate: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the last task's sortOrder to append this one
      const lastTask = await prisma.task.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { sortOrder: 'desc' },
      });

      const nextOrder = lastTask?.sortOrder 
        ? String.fromCharCode(lastTask.sortOrder.charCodeAt(lastTask.sortOrder.length - 1) + 1)
        : 'n';

      return prisma.task.create({
        data: {
          ...input,
          userId: ctx.user.id,
          startDate: input.startDate ? new Date(input.startDate) : null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          sortOrder: nextOrder,
        },
      });
    }),

  // Update task (position/status/title)
  updateTask: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.nativeEnum(TaskPriority).optional(),
      status: z.nativeEnum(TaskStatus).optional(),
      startDate: z.string().datetime().nullable().optional(),
      dueDate: z.string().datetime().nullable().optional(),
      sortOrder: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return prisma.task.update({
        where: { id, userId: ctx.user.id },
        data: {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : (data.startDate === null ? null : undefined),
          dueDate: data.dueDate ? new Date(data.dueDate) : (data.dueDate === null ? null : undefined),
        },
      });
    }),

  // Soft delete task
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.task.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { deletedAt: new Date() },
      });
    }),
});
