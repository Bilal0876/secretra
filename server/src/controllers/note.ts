// @ts-nocheck
import { z } from 'zod';
import { router, protectedProcedure } from '../trpcBase';
import { PrismaClient } from '@ps/db';

const prisma = new PrismaClient();

export const noteRouter = router({
  // Get all notes for the current user
  getNotes: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return prisma.note.findMany({
        where: {
          userId: ctx.user.id,
          deletedAt: null,
          ...(input?.search ? {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { plainText: { contains: input.search, mode: 'insensitive' } },
            ]
          } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  // Create a new note
  createNote: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      content: z.any().optional(),
      plainText: z.string().optional(),
      contactId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      folder: z.string().optional(),
      isPinned: z.boolean().optional(),
      isArchived: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { title, content, plainText, contactId, tags, folder, isPinned, isArchived } = input;
      try {
        // @ts-ignore - Bypass IDE TS cache for new Prisma schema fields
        const result = await prisma.note.create({
          data: {
            title,
            content: content ? content : {},
            plainText,
            contactId,
            tags: tags || [],
            folder,
            isPinned: isPinned || false,
            isArchived: isArchived || false,
            userId: ctx.user.id,
          },
        });
        return result;
      } catch (err: any) {
        console.error("CREATE NOTE ERROR:", err);
        throw new Error(err?.message || "Failed to create note");
      }
    }),

  // Update a note
  updateNote: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      content: z.any().optional(),
      plainText: z.string().optional(),
      contactId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
      folder: z.string().optional(),
      isPinned: z.boolean().optional(),
      isArchived: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, title, content, plainText, contactId, tags, folder, isPinned, isArchived } = input;
      return prisma.note.update({
        where: { id, userId: ctx.user.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(content !== undefined ? { content } : {}),
          ...(plainText !== undefined ? { plainText } : {}),
          ...(contactId !== undefined ? { contactId } : {}),
          ...(tags !== undefined ? { tags } : {}),
          ...(folder !== undefined ? { folder } : {}),
          ...(isPinned !== undefined ? { isPinned } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
        },
      });
    }),

  // Delete a note
  deleteNote: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.note.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { deletedAt: new Date() },
      });
    }),
});
