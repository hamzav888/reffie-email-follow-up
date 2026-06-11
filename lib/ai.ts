// Server-side only — never import this from client components or API responses

import OpenAI from "openai";

export interface ClassificationResult {
  type: "discovery" | "demo";
  unitCount: number | null;
}

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

export async function classifyMeeting(summary: string): Promise<ClassificationResult> {
  if (process.env.TEST_MODE === "true") {
    return { type: "discovery", unitCount: 120 };
  }

  const client = getClient();

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "user",
        content:
          `Based on this meeting summary, classify the call and extract unit count. ` +
          `A discovery call is an early conversation exploring the prospect situation and pain points. ` +
          `A demo is a call where the Reffie product was shown. ` +
          `Return only valid JSON with no other text: { "type": "discovery" | "demo", "unit_count": number | null }\n\n` +
          summary,
      },
    ],
    max_tokens: 200,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const text = stripCodeFences(raw);

  let parsed: { type: string; unit_count: number | null };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse classification response");
  }

  if (parsed.type !== "discovery" && parsed.type !== "demo") {
    throw new Error(`Invalid classification type: ${parsed.type}`);
  }

  return {
    type: parsed.type,
    unitCount: parsed.unit_count ?? null,
  };
}
