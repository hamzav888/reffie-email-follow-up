import { NextRequest, NextResponse } from "next/server";
import { classifyMeeting } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  void params; // meetingId available for logging if needed

  let body: { summary?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const summary = body.summary;
  if (typeof summary !== "string" || summary.trim() === "") {
    return NextResponse.json({ error: "summary must be a non-empty string" }, { status: 400 });
  }

  try {
    const result = await classifyMeeting(summary);
    return NextResponse.json({ type: result.type, unitCount: result.unitCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
