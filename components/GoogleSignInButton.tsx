"use client";

import { signIn } from "next-auth/react";

export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/meetings" })}
      className="w-full rounded-[100px] bg-[#10BD91] text-white px-8 py-3 text-sm font-semibold hover:bg-[#0C8E6D] transition-colors cursor-pointer"
    >
      Sign in with Google
    </button>
  );
}
