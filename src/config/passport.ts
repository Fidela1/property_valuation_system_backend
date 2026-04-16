import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from '../config/prisma'
import { hashedPassword } from '../utils/hash';

const generateRandomPassword = async () => {
  const randomString = Math.random().toString(36).substring(2, 15);
  return await hashedPassword(randomString);
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error('No email found from Google'), undefined);
        }

        let user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          const hashedPasswordValue = await generateRandomPassword();
          
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || 'Google User',
              password: hashedPasswordValue,
              role: 'CLIENT',
              isActive: true,
            }
          });
          
          console.log(`New user created via Google: ${email}`);
        } else {
          console.log(`Existing user logged in via Google: ${email}`);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;