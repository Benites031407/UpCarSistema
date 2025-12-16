// Ensure environment variables are loaded
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PostgresUserRepository } from '../repositories/user.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('google-auth');
const userRepository = new PostgresUserRepository();

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  name: {
    givenName: string;
    familyName: string;
  };
  photos: Array<{ value: string }>;
}

export function configureGoogleAuth(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback';

  if (!clientID || !clientSecret) {
    logger.warn('Google OAuth credentials not configured. Google authentication will be disabled.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL,
    scope: ['profile', 'email']
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      const googleProfile = profile as GoogleProfile;
      
      // Extract user information from Google profile
      const email = googleProfile.emails?.[0]?.value;
      const googleId = googleProfile.id;
      const name = `${googleProfile.name?.givenName || ''} ${googleProfile.name?.familyName || ''}`.trim();

      if (!email) {
        return done(new Error('No email found in Google profile'), false);
      }

      // Check if user already exists by Google ID
      let user = await userRepository.findByGoogleId(googleId);
      
      if (user) {
        logger.info(`Existing Google user logged in: ${email}`);
        return done(null, user);
      }

      // Check if user exists by email (for linking accounts)
      user = await userRepository.findByEmail(email);
      
      if (user) {
        // Link Google account to existing user
        await userRepository.update(user.id, { googleId });
        const updatedUser = await userRepository.findById(user.id);
        logger.info(`Linked Google account to existing user: ${email}`);
        return done(null, updatedUser || false);
      }

      // Create new user
      user = await userRepository.create({
        email,
        name: name || email.split('@')[0],
        googleId,
        accountBalance: 0,
        subscriptionStatus: 'none'
      });

      logger.info(`New Google user created: ${email}`);
      return done(null, user);

    } catch (error) {
      logger.error('Google OAuth error:', error);
      return done(error, false);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userRepository.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

export { passport };