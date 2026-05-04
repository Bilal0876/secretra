import { router, protectedProcedure } from '../trpcBase';
import { TRPCError } from '@trpc/server';
import { GroupMemberStatus } from '@prisma/client';
import prisma from '../shared/prisma';
import { emitSignal } from '../socket';
import {
  groupInputSchema,
  groupUpdateSchema,
  groupMemberInputSchema,
  groupIdParam,
  removeGroupMemberSchema,
  idParam,
} from '../schemas';
import { GoogleCalendarService } from '../services/google-calendar.service';

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
    .input(idParam)
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
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: `Group not found or you are not an accepted member. (ID: ${input.id})` 
        });
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
    .input(groupUpdateSchema)
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
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User with this email does not exist' });
      }

      const existing = await prisma.groupMember.findFirst({
        where: { groupId: input.groupId, email: input.email.toLowerCase() },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Member already exists in this group' });
      }

      const member = await prisma.groupMember.create({
        data: {
          groupId: input.groupId,
          email: input.email.toLowerCase(),
          userId: user.id,
          status: GroupMemberStatus.pending,
        },
      });

      // Signal new invite
      await emitSignal({ userId: user.id }, 'new_invite');

      return member;
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
    .input(groupIdParam)
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.groupMember.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.user.id,
          status: GroupMemberStatus.pending,
        },
      });

      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found or already accepted' });
      }

      const updated = await prisma.groupMember.update({
        where: { id: member.id },
        data: { status: GroupMemberStatus.accepted },
        include: { group: true },
      });

      // Signal group and user
      await emitSignal({ groupId: input.groupId }, 'group_update');
      await emitSignal({ userId: ctx.user.id }, 'group_update');

      return updated;
    }),

  rejectInvite: protectedProcedure
    .input(groupIdParam)
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.groupMember.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.user.id,
          status: GroupMemberStatus.pending,
        },
      });

      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invite not found' });
      }

      const result = await prisma.groupMember.delete({
        where: { id: member.id },
      });

      // Signal group and user
      await emitSignal({ groupId: input.groupId }, 'group_update');
      await emitSignal({ userId: ctx.user.id }, 'group_update');

      return result;
    }),

  removeGroupMember: protectedProcedure
    .input(removeGroupMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.group.findFirst({
        where: { id: input.groupId, userId: ctx.user.id },
      });

      if (!group) {
        throw new Error('Group not found or unauthorized');
      }

      const member = await prisma.groupMember.findFirst({
        where: { id: input.memberId },
        select: { userId: true },
      });

      if (!member?.userId) {
        throw new Error('Member not found');
      }

      // Cleanup: Find all group events created by this user
      const userGroupEvents = await prisma.event.findMany({
        where: { groupId: input.groupId, userId: member.userId },
        select: { id: true, googleEventId: true }
      });

      // Cleanup: Delete from Google in background (Fire and forget)
      if (userGroupEvents.length > 0) {
        GoogleCalendarService.forUser(member.userId).then((service: any) => {
          if (service) {
            for (const ev of userGroupEvents) {
               if (ev.googleEventId) {
                 (service as any).deleteFromGoogle(ev.googleEventId).catch((err: any) => console.error('Background Google delete failed for removed member event:', err));
               }
            }
          }
        }).catch((err: any) => console.error('GoogleCalendarService init failed for removed member:', err));
      }

      // Cleanup: Delete events and tasks created by the user in this group
      await prisma.event.deleteMany({
        where: { groupId: input.groupId, userId: member.userId },
      });
      // (Wait, Tasks do not have a groupId in Prisma schema directly! 
      // Tasks are linked to user and event or contact. If event is deleted, task is SetNull or Cascade depending on Prisma schema.
      // We'll leave Tasks alone unless they belonged to the event, which is CASCADE or SetNull handled)

      // Cleanup: Remove user from being an attendee on ANY event in this group
      const groupEventsWithUser = await prisma.event.findMany({
         where: { groupId: input.groupId, attendees: { some: { id: member.userId } } },
         select: { id: true }
      });
      for (const ev of groupEventsWithUser) {
         await prisma.event.update({
            where: { id: ev.id },
            data: { attendees: { disconnect: { id: member.userId } } }
         });
      }

      await prisma.groupMember.delete({
        where: { id: input.memberId },
      });

      // Signal group and the specific removed user
      await emitSignal({ groupId: input.groupId }, 'group_update');
      if (member?.userId) await emitSignal({ userId: member.userId }, 'group_update');

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
    .input(groupIdParam)
    .mutation(async ({ ctx, input }) => {
      // Find the member record for the current user
      const member = await prisma.groupMember.findFirst({
        where: { groupId: input.groupId, userId: ctx.user.id, status: GroupMemberStatus.accepted },
      });

      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this group' });
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

      // Signal group update
      await emitSignal({ groupId: input.groupId }, 'group_update');
      await emitSignal({ userId: ctx.user.id }, 'group_update');

      return { success: true, groupDeleted: false };
    }),
});
