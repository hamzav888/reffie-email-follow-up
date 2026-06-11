// Server-side only — never import this from client components

import { DayAIClient } from "@/lib/dayai-sdk";

const MOCK_DISCOVERY_SUMMARY = `Sarah Chen - VP of Operations at Oakbrook Apartments (240-unit complex, Chicago suburbs).

Pain points: Current resident referral program is informal and paper-based. Leasing team forgets to follow up with residents who refer friends. Estimated 15-20 referrals per year are lost due to no tracking system.

Discovery: Sarah mentioned a 5% vacancy rate last month and pressure from ownership to reduce it. She asked about Reffie's automated follow-up features and integration with their property management software (Entrata). Discussed pricing — she has budget approval up to $500/month without additional sign-off.

Next steps: Send follow-up email with a case study from a comparable property. Schedule a demo with Sarah and her leasing manager next week.`;

function getClient(): DayAIClient {
  const { DAY_AI_CLIENT_ID, DAY_AI_CLIENT_SECRET, DAY_AI_REFRESH_TOKEN } =
    process.env;
  if (!DAY_AI_CLIENT_ID || !DAY_AI_CLIENT_SECRET || !DAY_AI_REFRESH_TOKEN) {
    throw new Error("Day.ai credentials are not configured");
  }
  return new DayAIClient({
    clientId: DAY_AI_CLIENT_ID,
    clientSecret: DAY_AI_CLIENT_SECRET,
    refreshToken: DAY_AI_REFRESH_TOKEN,
  });
}

interface DayAIMeetingRecord {
  objectId: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  properties?: Record<string, unknown>;
}

// Day.ai may store the meeting start time under several property keys.
// Fall back to createdAt (which approximates the recording date) if none found.
function getMeetingTimestamp(m: DayAIMeetingRecord): Date | null {
  const raw =
    (m.properties?.date as string | undefined) ??
    (m.properties?.startTime as string | undefined) ??
    (m.properties?.meeting_date as string | undefined) ??
    m.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function stripVttMetadata(vtt: string): string {
  return vtt
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t === "WEBVTT") return false;
      if (/^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/.test(t))
        return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchMeetingSummary(
  prospectEmail: string,
  meetingStartTime: string
): Promise<string | null> {
  if (process.env.TEST_MODE === "true") {
    if (prospectEmail === "sarah.chen@oakbrookapts.com") {
      return MOCK_DISCOVERY_SUMMARY;
    }
    return null;
  }

  const client = getClient();

  const targetDate = new Date(
    meetingStartTime.includes("T")
      ? meetingStartTime
      : Number(meetingStartTime)
  );

  // Step 1: Search for all recordings where this contact was an attendee
  const searchResult = await client.findMeetingsByAttendee(prospectEmail);

  if (!searchResult.success || !searchResult.data) {
    throw new Error(`Day.ai search failed: ${searchResult.error ?? "unknown"}`);
  }

  let meetings: DayAIMeetingRecord[] = [];
  try {
    const parsed = JSON.parse(
      searchResult.data.content[0]?.text ?? "{}"
    ) as Record<string, unknown>;
    const resultSet = parsed.native_meetingrecording as
      | { results?: DayAIMeetingRecord[] }
      | undefined;
    if (resultSet?.results) {
      meetings = resultSet.results;
    }
  } catch {
    throw new Error("Failed to parse Day.ai meeting search results");
  }

  // Debug: log all candidates so we can verify timestamp matching
  const candidates = meetings.map((m) => ({
    objectId: m.objectId,
    title: m.title ?? "(no title)",
    timestamp: getMeetingTimestamp(m)?.toISOString() ?? "unknown",
    createdAt: m.createdAt ?? "unknown",
  }));
  console.log("[Day.ai] Timestamp match debug:", {
    prospectEmail,
    targetTimestamp: targetDate.toISOString(),
    candidatesFound: candidates.length,
    candidates,
  });

  if (meetings.length === 0) {
    return null;
  }

  // Step 2: Find the recording closest to the HubSpot meeting start time
  const TOLERANCE_MS = 60 * 60 * 1000; // ±60 minutes
  let bestMatch: DayAIMeetingRecord | null = null;
  let bestDiff = Infinity;

  for (const meeting of meetings) {
    const ts = getMeetingTimestamp(meeting);
    if (!ts) continue;
    const diff = Math.abs(ts.getTime() - targetDate.getTime());
    if (diff < TOLERANCE_MS && diff < bestDiff) {
      bestDiff = diff;
      bestMatch = meeting;
    }
  }

  console.log("[Day.ai] Selected:", {
    selected: bestMatch
      ? {
          objectId: bestMatch.objectId,
          title: bestMatch.title ?? "(no title)",
          timestamp: getMeetingTimestamp(bestMatch)?.toISOString() ?? "unknown",
          diffMinutes: Math.round(bestDiff / 60000),
        }
      : null,
  });

  if (!bestMatch) {
    return null;
  }

  // Step 3: Fetch the recording transcript/context
  const contextResult = await client.mcpCallTool(
    "get_meeting_recording_context",
    { objectId: bestMatch.objectId }
  );

  if (!contextResult.success || !contextResult.data) {
    throw new Error(
      `Day.ai context fetch failed: ${contextResult.error ?? "unknown"}`
    );
  }

  if (contextResult.data.isError) {
    throw new Error(
      `Day.ai tool error: ${contextResult.data.content[0]?.text ?? "unknown"}`
    );
  }

  const rawText = contextResult.data.content[0]?.text ?? "";

  // Parse the response — it may be JSON with vttTranscript/sentences, or plain text
  let transcript = "";
  try {
    const parsed = JSON.parse(rawText) as {
      vttTranscript?: string;
      sentences?: Array<{ speaker?: string; utterance?: string }>;
    };

    if (parsed.vttTranscript) {
      transcript = stripVttMetadata(parsed.vttTranscript);
    } else if (Array.isArray(parsed.sentences)) {
      transcript = parsed.sentences
        .map((s) => `${s.speaker ?? "Speaker"}: ${s.utterance ?? ""}`)
        .join("\n");
    } else {
      transcript = rawText;
    }
  } catch {
    transcript = rawText;
  }

  return transcript.trim() || null;
}
