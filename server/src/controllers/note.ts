// @ts-nocheck
import { router, protectedProcedure } from '../trpcBase';
import prisma from '../shared/prisma';
import {
  noteFilterSchema,
  noteInputSchema,
  noteUpdateSchema,
  idParam,
} from '../schemas';

export const noteRouter = router({
  // Get all notes for the current user
  getNotes: protectedProcedure
    .input(noteFilterSchema)
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
    .input(noteInputSchema)
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
    .input(noteUpdateSchema)
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
    .input(idParam)
    .mutation(async ({ ctx, input }) => {
      return prisma.note.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { deletedAt: new Date() },
      });
    }),
});
