import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const ADMIN_EMAILS = ["hamza@reffie.me", "connie@reffie.me"];

export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

const OWNER_IDS: Record<string, string> = {
  "ross@reffie.me": "164512018",
  "preston@reffie.me": "162714273",
  "connie@reffie.me": "75767826",
  // hamza@reffie.me is intentionally absent — no real HubSpot owner ID
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
        token.isAdmin = isAdmin(user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.hubspotOwnerId = token.hubspotOwnerId;
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // url is not a valid absolute URL
      }
      return `${baseUrl}/meetings`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // No custom cookies block — NextAuth reads NEXTAUTH_URL and sets secure cookies
  // automatically: http:// → secure: false (dev), https:// → secure: true + __Secure- prefix (prod)
};
