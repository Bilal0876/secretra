import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { PrismaClient } from '@ps/db';

const prisma = new PrismaClient();

const groupInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const groupMemberInputSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().email(),
});

export const groupRouter = router({
  getGroups: protectedProcedure
    .query(async ({ ctx }) => {
      return prisma.group.findMany({
        where: { userId: ctx.user.id },
        include: { members: true },
        orderBy: { createdAt: 'asc' },
      });
    }),

  getGroup: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { members: true },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      return group;
    }),

  createGroup: protectedProcedure
    .input(groupInputSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.group.create({
        data: {
          name: input.name,
          description: input.description,
          userId: ctx.user.id,
        },
      });
    }),

  addGroupMember: protectedProcedure
    .input(groupMemberInputSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: { id: input.groupId, userId: ctx.user.id },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (!user) {
        throw new Error('User with this email does not exist');
      }

      const existing = await prisma.groupMember.findFirst({
        where: { groupId: input.groupId, email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new Error('Member already exists in this group');
      }

      return prisma.groupMember.create({
        data: {
          groupId: input.groupId,
          email: input.email.toLowerCase(),
          userId: user.id,
        },
      });
    }),

  removeGroupMember: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: { id: input.groupId, userId: ctx.user.id },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      await prisma.groupMember.delete({
        where: { id: input.memberId },
      });

      return { success: true };
    }),
});
