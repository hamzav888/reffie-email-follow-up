"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-[100px] bg-[#10BD91] text-white px-5 py-2 text-sm font-medium hover:bg-[#0C8E6D] transition-colors cursor-pointer"
    >
      Sign out
    </button>
  );
}
