import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import { env } from "./env";
import { encrypt } from "./crypto";
import { prisma } from "./prisma";

/** Least-privilege scopes: read mail, send (only after explicit approval), read/create calendar events. */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export const DEMO_USER_ID = "demo-user";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: env.hasGoogle
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          authorization: { params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent" } },
        }),
      ]
    : [],
  callbacks: {
    async signIn({ profile }) {
      // Single-user app: only Hari's account may sign in.
      const email = profile?.email?.toLowerCase();
      if (!email) return false;
      if (env.allowedEmail && email !== env.allowedEmail) return false;
      return true;
    },
    async jwt({ token, account, profile }) {
      // Runs on sign-in with `account` populated. Tokens go to the DB encrypted, never into the JWT.
      if (account && profile?.email && env.hasDb) {
        const user = await prisma.user.upsert({
          where: { email: profile.email.toLowerCase() },
          update: { name: profile.name ?? undefined, image: (profile as { picture?: string }).picture },
          create: { email: profile.email.toLowerCase(), name: profile.name, image: (profile as { picture?: string }).picture },
        });
        const data = {
          accessTokenEnc: encrypt(account.access_token!),
          ...(account.refresh_token ? { refreshTokenEnc: encrypt(account.refresh_token) } : {}),
          expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
          scope: account.scope ?? GOOGLE_SCOPES,
        };
        await prisma.googleAccount.upsert({
          where: { userId: user.id },
          update: { ...data, providerAccountId: account.providerAccountId },
          create: { ...data, userId: user.id, providerAccountId: account.providerAccountId },
        });
        await prisma.settings.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = (token.uid as string) ?? undefined;
      return session;
    },
  },
};

export class UnauthorizedError extends Error {}

/** Resolve the current user id. In demo mode everything runs as a fixed demo user. */
export async function getUserId(): Promise<string> {
  if (env.demo) return DEMO_USER_ID;
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new UnauthorizedError();
  return id;
}
