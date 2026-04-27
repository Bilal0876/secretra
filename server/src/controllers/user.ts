import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpcBase';
import prisma from '../shared/prisma';
import { AuthService } from '../services/auth.service';
import {
  registerSchema,
  loginSchema,
  socialLoginSchema,
  googleLoginSchema,
  updateProfileSchema,
  pushTokenSchema,
} from '../schemas';

export const userRouter = router({
  // Register a new user
  register: publicProcedure
    .input(registerSchema)
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
    .input(googleLoginSchema)
    .mutation(async ({ input }) => {
      let googleUser;
      let googleTokens: any = null;
      
      if (input.serverAuthCode) {
        const exchangeResult = await AuthService.exchangeServerCodeForTokens(input.serverAuthCode);
        if (exchangeResult) {
          googleUser = exchangeResult.user;
          googleTokens = exchangeResult.tokens;
        }
      } else if (input.code) {
        googleUser = await AuthService.exchangeCodeForToken(input.code);
      } else if (input.idToken) {
        googleUser = await AuthService.verifyGoogleToken(input.idToken);
      }

      if (!googleUser || !googleUser.email) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid Google token/code or email missing',
        });
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email },
        include: { oauthAccounts: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || '',
            password: '', // Password not required for OAuth users
            googleId: googleUser.sub,
          },
          include: { oauthAccounts: true },
        });
      }

      // Upsert OAuthAccount (store refresh token if we got one)
      if (googleTokens || googleUser.sub) {
        const existing = user.oauthAccounts.find(acc => acc.provider === 'google');
        if (existing) {
          await prisma.oAuthAccount.update({
            where: { id: existing.id },
            data: {
              accessToken: googleTokens?.access_token,
              refreshToken: googleTokens?.refresh_token,
              expiresAt: googleTokens?.expiry_date ? new Date(googleTokens.expiry_date) : undefined,
            }
          });
        } else {
          await prisma.oAuthAccount.create({
            data: {
              userId: user.id,
              provider: 'google',
              providerId: googleUser.sub,
              accessToken: googleTokens?.access_token,
              refreshToken: googleTokens?.refresh_token,
              expiresAt: googleTokens?.expiry_date ? new Date(googleTokens.expiry_date) : undefined,
            }
          });
        }
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
    .input(loginSchema)
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
    .input(socialLoginSchema)
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
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),

  // Protected procedure: Register push token
  registerPushToken: protectedProcedure
    .input(pushTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const { token, deviceId, platform } = input;

      const existing = await prisma.pushSubscription.findFirst({
        where: { endpoint: token }
      });

      if (existing) {
        return prisma.pushSubscription.update({
          where: { id: existing.id },
          data: {
            userId: ctx.user.id,
            deviceId: deviceId || null,
            platform: platform as any,
          }
        });
      }

      return prisma.pushSubscription.create({
        data: {
          userId: ctx.user.id,
          endpoint: token,
          deviceId: deviceId || null,
          platform: platform as any,
        }
      });
    }),
});
