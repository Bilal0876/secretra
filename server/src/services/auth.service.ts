import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not defined!');
}
const ACCESS_TOKEN_EXPIRY = '7d'; 
const REFRESH_TOKEN_EXPIRY = '30d';

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID!;
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID!;

const googleClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID, GOOGLE_CLIENT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthService {
  /**
   * Hashes a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares a plain text password with a hashed password
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  static signRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET!) as unknown as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifies a Google ID Token
   */
  static async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          GOOGLE_WEB_CLIENT_ID!,
          GOOGLE_ANDROID_CLIENT_ID,
          GOOGLE_IOS_CLIENT_ID,
        ],
      });
      const payload = ticket.getPayload();
      if (!payload) return null;

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      console.error('Google verification error:', error);
      return null;
    }
  }

  /**
   * Exchanges an Auth Code for an ID Token (for Auth Code Flow)
   */
  static async exchangeCodeForToken(code: string) {
    try {
      const { tokens } = await googleClient.getToken({
        code,
        // 💡 Must match what makeRedirectUri() returns on mobile (the custom scheme)
        redirect_uri: 'com.bilal.secretra://', 
      });
      
      if (!tokens.id_token) return null;
      return this.verifyGoogleToken(tokens.id_token);
    } catch (error) {
      console.error('Google code exchange error:', error);
      return null;
    }
  }

  /**
   * Exchanges a Server Auth Code (from mobile) for tokens (including refresh token)
   */
  static async exchangeServerCodeForTokens(code: string) {
    try {
      // For mobile 'serverAuthCode' exchange, redirect_uri is often omitted or empty
      const { tokens } = await googleClient.getToken({
        code,
      });

      if (!tokens.id_token) return null;

      const user = await this.verifyGoogleToken(tokens.id_token);
      if (!user) return null;

      return {
        user,
        tokens, // Includes access_token, refresh_token, etc.
      };
    } catch (error) {
      console.error('Google server code exchange error:', error);
      return null;
    }
  }

  /**
   * Verifies an Apple Identity Token
   */
  static async verifyAppleToken(identityToken: string) {
    try {
      const { sub, email } = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_CLIENT_ID,
      });

      return {
        sub,
        email,
      };
    } catch (error) {
      console.error('Apple verification error:', error);
      return null;
    }
  }
}
