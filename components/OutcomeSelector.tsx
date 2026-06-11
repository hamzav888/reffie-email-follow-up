"use client";

import { useState } from "react";

type Outcome = "COMPLETED" | "NO_SHOW" | "RESCHEDULED";
type Status = "idle" | "saving" | "saved" | "error";

const OUTCOME_OPTIONS: { value: Outcome; label: string }[] = [
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No Show" },
  { value: "RESCHEDULED", label: "Rescheduled" },
];

interface OutcomeSelectorProps {
  meetingId: string;
  initialOutcome: Outcome | null;
}

export default function OutcomeSelector({
  meetingId,
  initialOutcome,
}: OutcomeSelectorProps) {
  const [outcome, setOutcome] = useState<Outcome | "">(initialOutcome ?? "");
  const [status, setStatus] = useState<Status>("idle");

  async function save(value: Outcome) {
    setStatus("saving");
    try {
      const res = await fetch(`/api/meetings/${meetingId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: value }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as Outcome;
    setOutcome(value);
    save(value);
  }

  function handleRetry() {
    if (outcome) save(outcome as Outcome);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={outcome}
        onChange={handleChange}
        disabled={status === "saving"}
        className="bg-[#FAF8F5] border border-[rgba(0,0,0,0.14)] rounded-[8px] px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#10BD91] disabled:opacity-50"
      >
        <option value="" disabled>
          Select outcome
        </option>
        {OUTCOME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {status === "saving" && (
        <span className="text-sm text-[#6B6B6B]">Saving...</span>
      )}
      {status === "saved" && (
        <span className="text-sm font-medium text-[#10BD91]">&#10003; Saved</span>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600">Failed to save.</span>
          <button
            onClick={handleRetry}
            className="text-sm text-[#10BD91] underline hover:text-[#0C8E6D] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
