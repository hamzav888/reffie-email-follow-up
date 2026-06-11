import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HubSpotMeeting } from "@/lib/hubspot";
import { formatMeetingTime, formatDealStage } from "@/lib/formatters";
import SignOutButton from "@/components/SignOutButton";
import OutcomeSelector from "@/components/OutcomeSelector";
import DraftControls from "@/components/DraftControls";

interface PageProps {
  params: { id: string };
  searchParams: { data?: string };
}

export default async function MeetingDetailPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  let meeting: HubSpotMeeting | null = null;
  if (searchParams.data) {
    try {
      meeting = JSON.parse(
        Buffer.from(searchParams.data, "base64url").toString()
      ) as HubSpotMeeting;
    } catch {
      // malformed data — fall through to redirect
    }
  }

  if (!meeting) redirect("/meetings");

  const contactName = meeting.contact
    ? `${meeting.contact.firstName} ${meeting.contact.lastName}`.trim() ||
      meeting.contact.email
    : "Unknown Contact";

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-8 py-5">
        <div className="flex items-center justify-between max-w-[1360px] mx-auto">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
              Sales Tools
            </span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-xl font-bold text-gray-900">Reffie</span>
              <h1 className="text-xl font-bold text-gray-900">
                Follow-Up Writer
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B6B6B]">{session.user?.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="px-8 py-6 max-w-[1360px] mx-auto">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-gray-900 transition-colors mb-6"
        >
          ← Back to meetings
        </Link>

        {/* Two-panel layout — min 1100px total, fits 1280px laptop with no horizontal scroll */}
        <div className="flex gap-6 items-start min-w-[1100px]">
          {/* Left panel — 30%, min 320px */}
          <div className="w-[30%] min-w-[320px] flex-shrink-0 bg-white rounded-[12px] border border-[rgba(0,0,0,0.08)] px-6 py-6 flex flex-col gap-5">
            {/* Contact */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
                Contact
              </span>
              <p className="font-semibold text-gray-900 mt-1">{contactName}</p>
              {meeting.company?.name && (
                <p className="text-sm text-[#6B6B6B]">{meeting.company.name}</p>
              )}
              {meeting.contact?.email && (
                <p className="text-sm text-[#6B6B6B]">{meeting.contact.email}</p>
              )}
            </div>

            <div className="border-t border-[rgba(0,0,0,0.06)]" />

            {/* Meeting details */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
                Meeting
              </span>
              <p className="text-sm text-gray-700 mt-1">
                {formatMeetingTime(meeting.startTime)}
              </p>
              {meeting.deal?.dealStage && (
                <p className="text-sm text-[#6B6B6B] mt-0.5">
                  {formatDealStage(meeting.deal.dealStage)}
                </p>
              )}
            </div>

            <div className="border-t border-[rgba(0,0,0,0.06)]" />

            {/* Outcome */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91] block mb-2">
                Outcome
              </span>
              <OutcomeSelector
                meetingId={meeting.id}
                initialOutcome={meeting.outcome}
              />
            </div>

            <div className="border-t border-[rgba(0,0,0,0.06)]" />

            <DraftControls
              meetingId={meeting.id}
              prospectEmail={meeting.contact?.email ?? undefined}
              meetingStartTime={meeting.startTime}
            />
          </div>

          {/* Right panel — flex-1, min 640px */}
          <div className="flex-1 min-w-[640px] bg-white rounded-[12px] border border-[rgba(0,0,0,0.08)] px-6 py-6 flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
              Email Draft
            </span>

            <div className="min-h-[400px] bg-gray-100 rounded-[8px] flex items-center justify-center">
              <span className="text-sm text-[#6B6B6B]">
                Email draft will appear here
              </span>
            </div>

            {/* TODO Ticket 8: wire up clipboard copy */}
            <div className="flex gap-3">
              <button
                disabled
                className="rounded-[100px] border border-[#10BD91] text-[#10BD91] px-5 py-2 text-sm font-medium opacity-40 cursor-not-allowed"
              >
                Copy Subject
              </button>
              <button
                disabled
                className="rounded-[100px] border border-[#10BD91] text-[#10BD91] px-5 py-2 text-sm font-medium opacity-40 cursor-not-allowed"
              >
                Copy Body
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
