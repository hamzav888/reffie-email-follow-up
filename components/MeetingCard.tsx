import Link from "next/link";
import { HubSpotMeeting } from "@/lib/hubspot";
import { formatMeetingTime, formatDealStage } from "@/lib/formatters";

const OUTCOME_STYLES: Record<
  "COMPLETED" | "NO_SHOW" | "RESCHEDULED",
  { label: string; className: string }
> = {
  COMPLETED: {
    label: "Completed",
    className: "bg-[#10BD91]/10 text-[#0C8E6D]",
  },
  NO_SHOW: {
    label: "No Show",
    className: "bg-red-100 text-red-700",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    className: "bg-amber-100 text-amber-700",
  },
};

interface MeetingCardProps {
  meeting: HubSpotMeeting;
}

export default function MeetingCard({ meeting }: MeetingCardProps) {
  const { contact, company, deal, startTime, outcome } = meeting;

  const contactName =
    contact
      ? `${contact.firstName} ${contact.lastName}`.trim() || contact.email
      : "Unknown Contact";

  const companyName = company?.name ?? "";
  const outcomeStyle = outcome ? OUTCOME_STYLES[outcome] : null;
  const encoded = Buffer.from(JSON.stringify(meeting)).toString("base64url");

  return (
    <Link
      href={`/meetings/${meeting.id}?data=${encoded}`}
      className="block hover:shadow-md transition-shadow rounded-[12px]"
    >
      <div className="bg-white rounded-[12px] border border-[rgba(0,0,0,0.08)] px-6 py-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 leading-tight">
              {contactName}
              {companyName && (
                <span className="text-[#6B6B6B] font-normal"> · {companyName}</span>
              )}
            </p>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              {formatMeetingTime(startTime)}
            </p>
          </div>

          {outcomeStyle && (
            <span
              className={`shrink-0 rounded-[100px] px-3 py-1 text-xs font-semibold ${outcomeStyle.className}`}
            >
              {outcomeStyle.label}
            </span>
          )}
        </div>

        {deal?.dealStage && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
              Stage
            </span>
            <span className="text-sm text-gray-700">
              {formatDealStage(deal.dealStage)}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
