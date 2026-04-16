import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/src/trpc';

// Force type regeneration
export const trpc = createTRPCReact<AppRouter>();
