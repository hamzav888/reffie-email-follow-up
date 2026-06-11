import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const OWNER_IDS: Record<string, string> = {
  "ross@reffie.me": "164512018",
  "preston@reffie.me": "162714273",
  "connie@reffie.me": "75767826",
  "hamza@reffie.me": "ALL",
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? "";
      return email.endsWith("@reffie.me");
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.hubspotOwnerId = OWNER_IDS[user.email] ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.hubspotOwnerId = token.hubspotOwnerId;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in with no explicit callbackUrl, land on /meetings
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/meetings`;
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/meetings`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
      },
    },
    state: {
      name: "next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false,
        maxAge: 900,
      },
    },
  },
};
