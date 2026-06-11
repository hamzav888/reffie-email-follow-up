import { NextRequest, NextResponse } from "next/server";
import { patchMeetingOutcome } from "@/lib/hubspot";

const VALID_OUTCOMES = ["COMPLETED", "NO_SHOW", "RESCHEDULED"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: { outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const outcome = body.outcome;
  if (!outcome || !VALID_OUTCOMES.includes(outcome as Outcome)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  if (process.env.TEST_MODE === "true") {
    console.log(`[TEST MODE] Would PATCH HubSpot meeting ${params.id} outcome → ${outcome}`);
    return NextResponse.json({ ok: true });
  }

  try {
    await patchMeetingOutcome(params.id, outcome as Outcome);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save outcome" },
      { status: 500 }
    );
  }
}
