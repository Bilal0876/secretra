import { z } from 'zod';
import { TRPCError } from '@trpc/server'; 

import { router, publicProcedure, protectedProcedure } from '../trpcBase';
import { PrismaClient } from '@ps/db';
import { AuthService } from '../services/auth.service';

const prisma = new PrismaClient();

export const userRouter = router({
  // Register a new user
  register: publicProcedure
    .input(z.object({ 
      email: z.string().email(), 
      password: z.string().min(8),
      name: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { email, password, name } = input;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A user with this email already exists',
        });
      }

      const hashedPassword = await AuthService.hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || null,
        },
      });

      const accessToken = AuthService.signAccessToken({ userId: user.id, email: user.email });
      const refreshToken = AuthService.signRefreshToken({ userId: user.id, email: user.email });

      return {
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
      };
    }),

  // Google OAuth login/signup
  googleLogin: publicProcedure
    .input(z.object({
      idToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const googleUser = await AuthService.verifyGoogleToken(input.idToken);
      if (!googleUser || !googleUser.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Google token or email missing',
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || '',
            password: '', // Password not required for OAuth users
            googleId: googleUser.sub,
          },
        });
      }

      const payload = { userId: user.id, email: user.email };
      const accessToken = AuthService.signAccessToken(payload);
      const refreshToken = AuthService.signRefreshToken(payload);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    }),

  // Login with email and password
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.password) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const isValid = await AuthService.comparePassword(password, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      const accessToken = AuthService.signAccessToken({ userId: user.id, email: user.email });
      const refreshToken = AuthService.signRefreshToken({ userId: user.id, email: user.email });

      return {
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
      };
    }),

  socialLogin: publicProcedure
    .input(z.object({
      provider: z.enum(['google', 'apple']),
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { provider, token } = input;
      let socialData: { sub: string, email: string, name?: string } | null = null;

      if (provider === 'google') {
        const data = await AuthService.verifyGoogleToken(token);
        if (data && data.email) {
          socialData = { sub: data.sub, email: data.email, name: data.name || undefined };
        }
      } else if (provider === 'apple') {
        const data = await AuthService.verifyAppleToken(token);
        if (data && data.email) {
          socialData = { sub: data.sub, email: data.email };
        }
      }

      if (!socialData) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Invalid ${provider} token or email not provided`,
        });
      }

      const { sub, email, name } = socialData;

      // 1. Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
        include: { oauthAccounts: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: name || null,
            oauthAccounts: {
              create: {
                provider,
                providerId: sub,
                accessToken: token, // Actually we should store refresh token if provided
              }
            }
          },
          include: { oauthAccounts: true },
        });
      } else {
        // 2. Check if this social account is already linked
        const existingAccount = user.oauthAccounts.find((acc: any) => acc.provider === provider);
        if (!existingAccount) {
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider,
              providerId: sub,
              accessToken: token,
            }
          });
        }
      }

      // 3. Generate tokens
      const accessToken = AuthService.signAccessToken({ userId: user.id, email: user.email });
      const refreshToken = AuthService.signRefreshToken({ userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    }),

  // Protected procedure: Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        _count: {
          select: { tasks: true, events: true, notes: true }
        }
      }
    });

    if (!user) {
      return null;
    }

    return user;
  }),

  // Protected procedure: Update profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),
});
