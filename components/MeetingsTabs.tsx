import Link from "next/link";

interface MeetingsTabsProps {
  isAdmin: boolean;
  currentView: "mine" | "admin";
}

export default function MeetingsTabs({ isAdmin, currentView }: MeetingsTabsProps) {
  if (!isAdmin) return null;

  return (
    <div className="flex border-b border-[rgba(0,0,0,0.08)] mb-6">
      <Link
        href="/meetings?view=mine"
        className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          currentView === "mine"
            ? "border-[#10BD91] text-[#10BD91]"
            : "border-transparent text-[#6B6B6B] hover:text-gray-900"
        }`}
      >
        My Meetings
      </Link>
      <Link
        href="/meetings?view=admin"
        className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
          currentView === "admin"
            ? "border-[#10BD91] text-[#10BD91]"
            : "border-transparent text-[#6B6B6B] hover:text-gray-900"
        }`}
      >
        Admin — All Meetings
      </Link>
    </div>
  );
}
