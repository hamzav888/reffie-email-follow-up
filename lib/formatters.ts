export function formatMeetingTime(startTime: string): string {
  if (!startTime) return "Unknown time";
  const date = new Date(
    startTime.includes("T") ? startTime : Number(startTime)
  );
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const DEAL_STAGE_MAP: Record<string, string> = {
  appointmentscheduled: "Appointment Scheduled",
  qualifiedtobuy: "Qualified to Buy",
  presentationscheduled: "Presentation Scheduled",
  decisionmakerboughtin: "Decision Maker Bought In",
  contractsent: "Contract Sent",
  closedwon: "Closed Won",
  closedlost: "Closed Lost",
};

export function formatDealStage(stage: string): string {
  if (DEAL_STAGE_MAP[stage]) return DEAL_STAGE_MAP[stage];
  return stage
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
