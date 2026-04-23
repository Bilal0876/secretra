import { z } from 'zod';
import { EventPriority, EventStatus, TaskPriority, TaskStatus } from '@ps/db';

// ─── Common Primitives ───────────────────────────────────────────────
export const idParam = z.object({ id: z.string().uuid() });
export const groupIdParam = z.object({ groupId: z.string().uuid() });

// ─── Calendar / Event Schemas ────────────────────────────────────────
export const eventInputSchema = z.object({
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

export const eventUpdateSchema = eventInputSchema.extend({
  id: z.string().uuid(),
  title: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

export const eventFilterSchema = z.object({
  groupId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).optional();

export const teamMemberCalendarSchema = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const teamAvailabilitySchema = z.object({
  groupId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

// ─── Task Schemas ────────────────────────────────────────────────────
export const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
}).optional();

export const taskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.medium),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.todo),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  reminderMinutes: z.number().int().nullable().optional(),
});

export const taskUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  sortOrder: z.string().optional(),
  reminderMinutes: z.number().int().nullable().optional(),
});

// ─── Note Schemas ────────────────────────────────────────────────────
export const noteFilterSchema = z.object({
  search: z.string().optional(),
}).optional();

export const noteInputSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  plainText: z.string().optional(),
  contactId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const noteUpdateSchema = noteInputSchema.extend({
  id: z.string().uuid(),
});

// ─── Group Schemas ───────────────────────────────────────────────────
export const groupInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const groupUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const groupMemberInputSchema = z.object({
  groupId: z.string().uuid(),
  email: z.string().email(),
});

export const removeGroupMemberSchema = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
});

// ─── User / Auth Schemas ─────────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  token: z.string(),
});

export const googleLoginSchema = z.object({
  idToken: z.string(),
});

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().optional(),
  theme: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
});

export const pushTokenSchema = z.object({
  token: z.string(),
  deviceId: z.string().optional(),
  platform: z.enum(['web', 'ios', 'android']),
});

// ─── Google Sync Schemas ─────────────────────────────────────────────
export const googleCallbackSchema = z.object({
  code: z.string(),
});

