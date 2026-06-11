import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchMeetings, HubSpotMeeting } from "@/lib/hubspot";
import SignOutButton from "@/components/SignOutButton";
import RefreshButton from "@/components/RefreshButton";
import MeetingCard from "@/components/MeetingCard";

export default async function MeetingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const ownerId = session.user.hubspotOwnerId;

  let meetings: HubSpotMeeting[] = [];
  let error: string | null = null;

  if (ownerId) {
    try {
      meetings = await fetchMeetings(ownerId);
    } catch {
      error = "Couldn't load meetings. Check your connection.";
    }
  } else {
    error = "Your account is not mapped to a HubSpot owner. Contact your admin.";
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-white border-b border-[rgba(0,0,0,0.08)] px-8 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#10BD91]">
              Sales Tools
            </span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span className="text-xl font-bold text-gray-900">Reffie</span>
              <h1 className="text-xl font-bold text-gray-900">Follow-Up Writer</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B6B6B]">{session.user?.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#6B6B6B] text-sm">
            Your meetings from the last 7 days
          </p>
          <RefreshButton />
        </div>

        {error && (
          <div className="rounded-[12px] bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4">
            <span className="text-sm text-red-700">{error}</span>
            <RefreshButton label="Retry" />
          </div>
        )}

        {!error && meetings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-900 font-medium">
              No meetings found in the last 7 days.
            </p>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Check that your HubSpot calendar sync is active.{" "}
              <a
                href="https://app.hubspot.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#10BD91] underline hover:text-[#0C8E6D]"
              >
                Open HubSpot
              </a>
            </p>
          </div>
        )}

        {!error && meetings.length > 0 && (
          <div className="flex flex-col gap-3">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
