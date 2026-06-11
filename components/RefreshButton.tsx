"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface RefreshButtonProps {
  label?: string;
}

export default function RefreshButton({ label = "Refresh" }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="rounded-[100px] border border-[#10BD91] text-[#10BD91] px-4 py-1.5 text-sm font-medium hover:bg-[#10BD91] hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
    >
      {isPending ? `${label === "Retry" ? "Retrying" : "Refreshing"}...` : label}
    </button>
  );
}
