import { google } from "googleapis";
import { decrypt, encrypt } from "./crypto";
import { prisma } from "./prisma";
import { env } from "./env";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/** Returns an authenticated OAuth2 client for the user, refreshing + re-encrypting tokens transparently. */
export async function getGoogleClient(userId: string): Promise<OAuth2Client | null> {
  if (env.demo || !env.hasGoogle) return null;
  const acct = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!acct) return null;

  const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({
    access_token: decrypt(acct.accessTokenEnc),
    refresh_token: acct.refreshTokenEnc ? decrypt(acct.refreshTokenEnc) : undefined,
    expiry_date: acct.expiresAt?.getTime(),
  });
  oauth.on("tokens", (tokens) => {
    void prisma.googleAccount
      .update({
        where: { userId },
        data: {
          ...(tokens.access_token ? { accessTokenEnc: encrypt(tokens.access_token) } : {}),
          ...(tokens.refresh_token ? { refreshTokenEnc: encrypt(tokens.refresh_token) } : {}),
          ...(tokens.expiry_date ? { expiresAt: new Date(tokens.expiry_date) } : {}),
        },
      })
      .catch((e) => console.error("[google] failed to persist refreshed token", e));
  });
  return oauth;
}

export function calendarApi(auth: OAuth2Client) {
  return google.calendar({ version: "v3", auth });
}

export function gmailApi(auth: OAuth2Client) {
  return google.gmail({ version: "v1", auth });
}
