"use client";

import { useState } from "react";
import type { ClassificationResult } from "@/lib/ai";

type ClassifyStatus = "idle" | "classifying" | "error";

interface SummaryAndGenerateProps {
  meetingId: string;
  emailType: "discovery" | "demo";
  onClassified?: (result: ClassificationResult) => void;
  initialSummary?: string;
}

export default function SummaryAndGenerate({
  meetingId,
  emailType,
  onClassified,
  initialSummary,
}: SummaryAndGenerateProps) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [classifyStatus, setClassifyStatus] = useState<ClassifyStatus>("idle");

  async function handleGenerate() {
    if (summary.trim() === "") return;

    // If a previous classification failed, skip re-classifying and proceed
    // using whatever emailType the toggle is currently set to.
    if (classifyStatus === "error") {
      // TODO Ticket 6/7: replace console.log with actual draft generation call
      console.log("Generate draft (skipped classification):", { emailType, summary });
      return;
    }

    setClassifyStatus("classifying");

    try {
      const res = await fetch(`/api/meetings/${meetingId}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      if (!res.ok) throw new Error();

      const result = (await res.json()) as ClassificationResult;
      onClassified?.(result);
      setClassifyStatus("idle");

      // TODO Ticket 6/7: replace console.log with actual draft generation call
      console.log("Generate draft:", {
        type: result.type,
        unitCount: result.unitCount,
        summary,
      });
    } catch {
      setClassifyStatus("error");
    }
  }

  const isClassifying = classifyStatus === "classifying";
  const buttonDisabled = summary.trim() === "" || isClassifying;

  return (
    <div className="flex flex-col gap-3">
      {/* DAY.AI INTEGRATION POINT (Ticket 4)
          initialSummary is auto-filled from Day.ai when available.
          The textarea remains editable so AEs can correct or supplement. */}
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Paste your meeting notes here..."
        rows={6}
        className="bg-[#FAF8F5] border border-[rgba(0,0,0,0.14)] rounded-[8px] px-3 py-2 text-sm text-gray-900 placeholder-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#10BD91] resize-none w-full"
      />

      {classifyStatus === "error" && (
        <p className="text-sm text-red-600">
          Could not detect call type. Please select manually.
        </p>
      )}

      <button
        onClick={handleGenerate}
        disabled={buttonDisabled}
        className="rounded-[100px] bg-[#10BD91] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#0C8E6D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-full cursor-pointer"
      >
        {isClassifying ? "Detecting call type..." : "Generate Draft"}
      </button>
    </div>
  );
}
