import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      hubspotOwnerId: string | null;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    hubspotOwnerId: string | null;
    isAdmin: boolean;
  }
}
