"use client";

import { useState, useEffect } from "react";
import EmailTypeToggle from "@/components/EmailTypeToggle";
import SummaryAndGenerate from "@/components/SummaryAndGenerate";
import type { ClassificationResult } from "@/lib/ai";

type SummaryFetchStatus = "idle" | "loading" | "success" | "not_found" | "error";

interface DraftControlsProps {
  meetingId: string;
  prospectEmail?: string;
  meetingStartTime: string;
}

export default function DraftControls({
  meetingId,
  prospectEmail,
  meetingStartTime,
}: DraftControlsProps) {
  const [emailType, setEmailType] = useState<"discovery" | "demo">("discovery");
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<SummaryFetchStatus>("idle");
  const [fetchedSummary, setFetchedSummary] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!prospectEmail) {
        setSummaryStatus("not_found");
        return;
      }

      setSummaryStatus("loading");
      try {
        const params = new URLSearchParams({ prospectEmail, meetingStartTime });
        const res = await fetch(`/api/meetings/${meetingId}/summary?${params}`);
        if (cancelled) return;
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { summary: string | null };
        if (cancelled) return;
        if (data.summary) {
          setFetchedSummary(data.summary);
          setSummaryStatus("success");
        } else {
          setSummaryStatus("not_found");
        }
      } catch {
        if (!cancelled) setSummaryStatus("error");
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [meetingId, prospectEmail, meetingStartTime]);

  function handleClassified(result: ClassificationResult) {
    setEmailType(result.type);
    if (result.unitCount !== null) setUnitCount(result.unitCount);
  }

  return (
    <>
      {/* Email type */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91] block mb-2">
          Email Type
        </span>
        <EmailTypeToggle externalType={emailType} onTypeChange={setEmailType} />
      </div>

      <div className="border-t border-[rgba(0,0,0,0.06)]" />

      {/* Unit count — shown only after successful classification */}
      {unitCount !== null && (
        <>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91] block mb-1">
              Unit Count
            </span>
            <p className="text-sm text-gray-700">{unitCount.toLocaleString()}</p>
          </div>
          <div className="border-t border-[rgba(0,0,0,0.06)]" />
        </>
      )}

      {/* Meeting Summary */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91] block mb-2">
          Meeting Summary
        </span>

        {summaryStatus === "loading" && (
          <div className="flex items-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-[#10BD91] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-sm text-[#6B6B6B]">
              Fetching meeting summary from Day.ai...
            </span>
          </div>
        )}

        {summaryStatus === "not_found" && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-[8px] px-4 py-3 text-sm text-amber-700 mb-3">
              No Day.ai summary found for this meeting. Paste it below to
              generate a draft.
            </div>
            <SummaryAndGenerate
              meetingId={meetingId}
              emailType={emailType}
              onClassified={handleClassified}
              initialSummary=""
            />
          </>
        )}

        {summaryStatus === "error" && (
          <>
            <p className="text-sm text-[#6B6B6B] mb-3">
              Day.ai summary unavailable. Paste your meeting notes below.
            </p>
            <SummaryAndGenerate
              meetingId={meetingId}
              emailType={emailType}
              onClassified={handleClassified}
              initialSummary=""
            />
          </>
        )}

        {summaryStatus === "success" && (
          <SummaryAndGenerate
            meetingId={meetingId}
            emailType={emailType}
            onClassified={handleClassified}
            initialSummary={fetchedSummary}
          />
        )}

        {/* idle: nothing — useEffect fires immediately so this flicker is imperceptible */}
      </div>
    </>
  );
}
