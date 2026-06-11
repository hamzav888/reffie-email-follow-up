import { NextRequest, NextResponse } from "next/server";
import { fetchMeetingSummary } from "@/lib/dayai";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  void params;

  const { searchParams } = request.nextUrl;
  const prospectEmail = searchParams.get("prospectEmail");
  const meetingStartTime = searchParams.get("meetingStartTime");

  if (!prospectEmail || prospectEmail.trim() === "") {
    return NextResponse.json(
      { error: "prospectEmail is required" },
      { status: 400 }
    );
  }
  if (!meetingStartTime || meetingStartTime.trim() === "") {
    return NextResponse.json(
      { error: "meetingStartTime is required" },
      { status: 400 }
    );
  }

  try {
    const summary = await fetchMeetingSummary(prospectEmail, meetingStartTime);
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
