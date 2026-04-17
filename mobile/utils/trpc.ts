import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/dist/trpc';

// Force type regeneration
export const trpc = createTRPCReact<AppRouter>();
