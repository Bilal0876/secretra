import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { PrismaClient, GroupMemberStatus } from '@ps/db';

const prisma = new PrismaClient();

const groupInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

const groupMemberInputSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().email(),
});

export const groupRouter = router({
  getGroups: protectedProcedure
    .query(async ({ ctx }) => {
      return prisma.group.findMany({
        where: {
          members: { some: { userId: ctx.user.id, status: GroupMemberStatus.accepted } }
        },
        include: { 
          members: {
            where: { status: GroupMemberStatus.accepted },
            include: { user: true },
          }
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

  getGroup: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: {
          id: input.id,
          members: { some: { userId: ctx.user.id, status: GroupMemberStatus.accepted } }
        },
        include: { 
          members: {
            where: { status: GroupMemberStatus.accepted },
            include: { user: true },
          }
        },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      return group;
    }),

  createGroup: protectedProcedure
    .input(groupInputSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.group.create({
        data: {
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          userId: ctx.user.id,
        },
        include: { members: true },
      });

      // Add creator as accepted member
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: ctx.user.id,
          email: ctx.user.email,
          status: GroupMemberStatus.accepted,
        },
      });

      // Return group with members and user relation
      return prisma.group.findUnique({
        where: { id: group.id },
        include: { members: { include: { user: true } } },
      });
    }),

  updateGroup: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      return prisma.group.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
        },
        include: { members: { include: { user: true } } },
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
          status: GroupMemberStatus.pending,
        },
      });
    }),

  getInvites: protectedProcedure
    .query(async ({ ctx }) => {
      return prisma.groupMember.findMany({
        where: {
          userId: ctx.user.id,
          status: GroupMemberStatus.pending,
        },
        include: {
          group: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  acceptInvite: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.groupMember.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.user.id,
          status: GroupMemberStatus.pending,
        },
      });

      if (!member) {
        throw new Error('Invite not found or already accepted');
      }

      return prisma.groupMember.update({
        where: { id: member.id },
        data: { status: GroupMemberStatus.accepted },
        include: { group: true },
      });
    }),

  rejectInvite: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.groupMember.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.user.id,
          status: GroupMemberStatus.pending,
        },
      });

      if (!member) {
        throw new Error('Invite not found');
      }

      return prisma.groupMember.delete({
        where: { id: member.id },
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

      // Check if there are any accepted members left
      const remainingMembers = await prisma.groupMember.count({
        where: { groupId: input.groupId, status: GroupMemberStatus.accepted },
      });

      // If no accepted members left, delete the group
      if (remainingMembers === 0) {
        await prisma.group.delete({
          where: { id: input.groupId },
        });
      }

      return { success: true };
    }),

  leaveGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the member record for the current user
      const member = await prisma.groupMember.findFirst({
        where: { groupId: input.groupId, userId: ctx.user.id, status: GroupMemberStatus.accepted },
      });

      if (!member) {
        throw new Error('You are not a member of this group');
      }

      // Delete the member
      await prisma.groupMember.delete({
        where: { id: member.id },
      });

      // Check if there are any accepted members left
      const remainingMembers = await prisma.groupMember.count({
        where: { groupId: input.groupId, status: GroupMemberStatus.accepted },
      });

      // If no accepted members left, delete the group
      if (remainingMembers === 0) {
        await prisma.group.delete({
          where: { id: input.groupId },
        });
        return { success: true, groupDeleted: true };
      }

      return { success: true, groupDeleted: false };
    }),
});
