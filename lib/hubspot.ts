const HUBSPOT_BASE = "https://api.hubapi.com";

const MOCK_MEETINGS: HubSpotMeeting[] = [
  {
    id: "mock-001",
    title: "Discovery Call - Oakbrook Apartments",
    startTime: "2026-06-09T14:00:00.000Z",
    outcome: "COMPLETED",
    contact: { id: "c1", firstName: "Sarah", lastName: "Chen", email: "sarah.chen@oakbrookapts.com" },
    company: { id: "co1", name: "Oakbrook Apartments" },
    deal: { id: "d1", dealName: "Oakbrook - 240 Units", dealStage: "appointmentscheduled" },
  },
  {
    id: "mock-002",
    title: "Intro Call - Silverstone Properties",
    startTime: "2026-06-10T16:30:00.000Z",
    outcome: null,
    contact: { id: "c2", firstName: "Marcus", lastName: "Rivera", email: "m.rivera@silverstoneprops.com" },
    company: { id: "co2", name: "Silverstone Properties" },
    deal: { id: "d2", dealName: "Silverstone Portfolio", dealStage: "qualifiedtobuy" },
  },
  {
    id: "mock-003",
    title: "Demo - Lakeview Residential",
    startTime: "2026-06-11T10:00:00.000Z",
    outcome: null,
    contact: { id: "c3", firstName: "Jordan", lastName: "Patel", email: "jordan@lakeviewres.com" },
    company: { id: "co3", name: "Lakeview Residential" },
    deal: { id: "d3", dealName: "Lakeview - 80 Units", dealStage: "presentationscheduled" },
  },
];

function hubspotHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export interface HubSpotMeeting {
  id: string;
  title: string | null;
  startTime: string;
  outcome: "COMPLETED" | "NO_SHOW" | "RESCHEDULED" | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
  deal: {
    id: string;
    dealName: string | null;
    dealStage: string | null;
  } | null;
  aeName?: string;
}

const AE_OWNERS = [
  { id: "164512018", name: "Ross Barton" },
  { id: "162714273", name: "Preston Bryan" },
  { id: "75767826", name: "Connie Lee" },
];

type RawObject = { id: string; properties: Record<string, string | null> };

async function fetchAssociations(
  fromObject: string,
  toObject: string,
  ids: string[]
): Promise<Map<string, string[]>> {
  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v4/associations/${fromObject}/${toObject}/batch/read`,
    {
      method: "POST",
      headers: hubspotHeaders(),
      body: JSON.stringify({ inputs: ids.map((id) => ({ id })) }),
      cache: "no-store",
    }
  );

  if (!res.ok) return new Map();

  const data = await res.json();
  const map = new Map<string, string[]>();

  for (const result of data.results ?? []) {
    const fromId = String(result.from?.id ?? "");
    const toIds: string[] = (result.to ?? []).map(
      (t: { toObjectId: number | string }) => String(t.toObjectId)
    );
    if (fromId && toIds.length > 0) {
      map.set(fromId, toIds);
    }
  }

  return map;
}

async function batchReadObjects(
  objectType: string,
  ids: string[],
  properties: string[]
): Promise<RawObject[]> {
  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/${objectType}/batch/read`,
    {
      method: "POST",
      headers: hubspotHeaders(),
      body: JSON.stringify({ inputs: ids.map((id) => ({ id })), properties }),
      cache: "no-store",
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data.results ?? [];
}

function uniqueIds(map: Map<string, string[]>): string[] {
  const ids = new Set<string>();
  for (const list of Array.from(map.values())) {
    for (const id of list) ids.add(id);
  }
  return Array.from(ids);
}

export async function fetchMeetings(
  hubspotOwnerId: string
): Promise<HubSpotMeeting[]> {
  if (process.env.TEST_MODE === "true") {
    return MOCK_MEETINGS;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const searchRes = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/meetings/search`, {
    method: "POST",
    headers: hubspotHeaders(),
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hubspot_owner_id",
              operator: "EQ",
              value: hubspotOwnerId,
            },
            {
              propertyName: "hs_meeting_start_time",
              operator: "GTE",
              value: String(sevenDaysAgo),
            },
          ],
        },
      ],
      properties: ["hs_meeting_title", "hs_meeting_start_time", "hs_meeting_outcome"],
      sorts: [{ propertyName: "hs_meeting_start_time", direction: "DESCENDING" }],
      limit: 50,
    }),
    cache: "no-store",
  });

  if (!searchRes.ok) {
    throw new Error(`HubSpot search failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const rawMeetings: RawObject[] = searchData.results ?? [];

  if (rawMeetings.length === 0) return [];

  const meetingIds = rawMeetings.map((m) => m.id);

  const [contactAssocs, companyAssocs, dealAssocs] = await Promise.all([
    fetchAssociations("meetings", "contacts", meetingIds),
    fetchAssociations("meetings", "companies", meetingIds),
    fetchAssociations("meetings", "deals", meetingIds),
  ]);

  const contactIds = uniqueIds(contactAssocs);
  const companyIds = uniqueIds(companyAssocs);
  const dealIds = uniqueIds(dealAssocs);

  const [contacts, companies, deals] = await Promise.all([
    contactIds.length > 0
      ? batchReadObjects("contacts", contactIds, ["firstname", "lastname", "email"])
      : Promise.resolve([]),
    companyIds.length > 0
      ? batchReadObjects("companies", companyIds, ["name"])
      : Promise.resolve([]),
    dealIds.length > 0
      ? batchReadObjects("deals", dealIds, ["dealname", "dealstage"])
      : Promise.resolve([]),
  ]);

  const contactMap = new Map(contacts.map((c) => [c.id, c.properties]));
  const companyMap = new Map(companies.map((c) => [c.id, c.properties]));
  const dealMap = new Map(deals.map((d) => [d.id, d.properties]));

  return rawMeetings.map((m) => {
    const contactId = contactAssocs.get(m.id)?.[0] ?? null;
    const companyId = companyAssocs.get(m.id)?.[0] ?? null;
    const dealId = dealAssocs.get(m.id)?.[0] ?? null;

    const contactProps = contactId ? contactMap.get(contactId) : null;
    const companyProps = companyId ? companyMap.get(companyId) : null;
    const dealProps = dealId ? dealMap.get(dealId) : null;

    const rawOutcome = m.properties.hs_meeting_outcome;
    const outcome =
      rawOutcome === "COMPLETED" ||
      rawOutcome === "NO_SHOW" ||
      rawOutcome === "RESCHEDULED"
        ? rawOutcome
        : null;

    return {
      id: m.id,
      title: m.properties.hs_meeting_title ?? null,
      startTime: m.properties.hs_meeting_start_time ?? "",
      outcome,
      contact: contactProps
        ? {
            id: contactId!,
            firstName: contactProps.firstname ?? "",
            lastName: contactProps.lastname ?? "",
            email: contactProps.email ?? "",
          }
        : null,
      company: companyProps
        ? {
            id: companyId!,
            name: companyProps.name ?? "",
          }
        : null,
      deal: dealProps
        ? {
            id: dealId!,
            dealName: dealProps.dealname ?? null,
            dealStage: dealProps.dealstage ?? null,
          }
        : null,
    };
  });
}

function sortByStartTime(meetings: HubSpotMeeting[]): HubSpotMeeting[] {
  return meetings.slice().sort((a, b) => {
    const ta = a.startTime.includes("T") ? new Date(a.startTime).getTime() : Number(a.startTime);
    const tb = b.startTime.includes("T") ? new Date(b.startTime).getTime() : Number(b.startTime);
    return tb - ta;
  });
}

export async function fetchAllMeetings(): Promise<HubSpotMeeting[]> {
  if (process.env.TEST_MODE === "true") {
    return MOCK_MEETINGS.map((m) => ({ ...m, aeName: "Ross Barton" }));
  }

  const results = await Promise.all(
    AE_OWNERS.map(async (ae) => {
      const meetings = await fetchMeetings(ae.id);
      return meetings.map((m) => ({ ...m, aeName: ae.name }));
    })
  );

  return sortByStartTime(results.flat());
}

export async function patchMeetingOutcome(
  meetingId: string,
  outcome: "COMPLETED" | "NO_SHOW" | "RESCHEDULED"
): Promise<void> {
  const res = await fetch(
    `${HUBSPOT_BASE}/crm/v3/objects/meetings/${meetingId}`,
    {
      method: "PATCH",
      headers: hubspotHeaders(),
      body: JSON.stringify({
        properties: { hs_meeting_outcome: outcome },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`HubSpot outcome update failed: ${res.status}`);
  }
}
