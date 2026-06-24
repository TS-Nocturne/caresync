import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { genericOAuth, line } from "better-auth/plugins/generic-oauth";
import { prisma } from "./prisma";

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);
const lineEnabled = Boolean(
  process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET
);

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be at least 32 characters.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret,
  trustedOrigins: process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(",") : undefined,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      termsAccepted: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "line"],
    },
  },
  plugins: [
    organization(),
    ...(lineEnabled
      ? [
          genericOAuth({
            config: [
              line({
                clientId: process.env.LINE_CLIENT_ID!,
                clientSecret: process.env.LINE_CLIENT_SECRET!,
              }),
            ],
          }),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
