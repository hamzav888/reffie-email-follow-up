# Reffie Follow-Up Writer — Project Context

Internal sales tool for Reffie AEs (Ross Barton, Preston Bryan, Connie Lee) to generate follow-up emails after discovery calls and demos. AE signs in with Google, picks a recent meeting from HubSpot, and gets a Claude-generated draft they copy into Gmail.

---

## Build Status

| Ticket | Description | Status |
|---|---|---|
| 1 | Scaffold + Google OAuth | Done |
| 2 | HubSpot Meeting List | Done |
| 3 | HubSpot Outcome Write-back | Done |
| 4 | Day.ai MCP Integration | Done |
| 5 | Email Type Detection + Unit Count | Done |
| 6 | Discovery Draft Generation | Not started |
| 7 | Demo Draft Generation | Not started |
| 8 | Copy Buttons + UI Polish | Not started |
| 9 | QA with AEs | Not started |

---

## Architecture Decisions

**Server Components first.** Data fetching (HubSpot, Day.ai, Claude) happens in Next.js Server Components — never in client components. Client components are used only for interactivity (buttons, forms). This keeps secrets server-side and avoids API proxy routes.

**Refresh pattern.** The meetings page uses `router.refresh()` from `next/navigation` inside a `useTransition` hook (`RefreshButton.tsx`). This re-runs the server component's data fetch without a full page navigation. `isPending` provides the loading state for free.

**HubSpot API call chain.** Three sequential rounds, parallelized within each round:
1. `POST /crm/v3/objects/meetings/search` — filter by owner + date range
2. `POST /crm/v4/associations/meetings/{contacts,companies,deals}/batch/read` — get associated IDs (parallel)
3. `POST /crm/v3/objects/{contacts,companies,deals}/batch/read` — get properties (parallel)

Association and property calls fail silently (return empty Map/array) so a partial result is returned rather than crashing the page.

**JWT session.** `hubspotOwnerId` is embedded in the NextAuth JWT at sign-in time using the hardcoded `OWNER_IDS` map in `lib/auth.ts`. It flows through to `session.user.hubspotOwnerId` in every server component.

**HubSpot v4 associations.** The v3 search endpoint does not embed associations in search results. You must use the v4 batch associations endpoint (`/crm/v4/associations/...`) to get associated object IDs, then batch-read their properties. The `toObjectId` field in v4 association results is a number — cast with `String()`.

---

## Environment Variables

| Variable | Purpose | Where used |
|---|---|---|
| `NEXTAUTH_URL` | Base URL for NextAuth callbacks | NextAuth internals |
| `NEXTAUTH_SECRET` | JWT signing key | NextAuth + middleware |
| `GOOGLE_CLIENT_ID` | Google OAuth app ID | `lib/auth.ts` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret | `lib/auth.ts` |
| `HUBSPOT_PRIVATE_TOKEN` | HubSpot private app token | `lib/hubspot.ts` only |
| `DEEPSEEK_API_KEY` | DeepSeek API key for call classification | `lib/ai.ts` only |
| `DAY_AI_CLIENT_ID` | Day.ai OAuth client ID | `lib/dayai.ts` only |
| `DAY_AI_CLIENT_SECRET` | Day.ai OAuth client secret | `lib/dayai.ts` only |
| `DAY_AI_REFRESH_TOKEN` | Day.ai OAuth refresh token | `lib/dayai.ts` only |
| `TEST_MODE` | Set to `true` to bypass all API calls and use mock data | `lib/hubspot.ts`, `lib/dayai.ts`, `lib/ai.ts`, outcome route |

All keys except `NEXTAUTH_URL` are server-only. They must never appear in `"use client"` components or be forwarded to API responses. Set `TEST_MODE=true` in `.env.local` to develop without real credentials.

---

## HubSpot Owner IDs

| AE | Email | HubSpot Owner ID |
|---|---|---|
| Ross Barton | ross@reffie.me | 164512018 |
| Preston Bryan | preston@reffie.me | 162714273 |
| Connie Lee | connie@reffie.me | 75767826 |
| Hamza (admin) | hamza@reffie.me | ALL |

`ALL` is a special sentinel value. When `hubspotOwnerId === "ALL"`, `fetchMeetings` fetches all three AE owner IDs in parallel via `Promise.all`, combines the results, and sorts by start time descending. This gives Hamza a combined view of every AE's meetings.

To add a new AE: update `OWNER_IDS` in `lib/auth.ts`. The user must sign out and back in for the new owner ID to appear in their session.

---

## Key Files

```
lib/auth.ts              NextAuth config, OWNER_IDS map, @reffie.me restriction
lib/hubspot.ts           HubSpot API client (fetchMeetings + helpers)
middleware.ts            Protects /meetings route with next-auth/middleware
components/
  GoogleSignInButton.tsx  "use client" — signIn('google')
  SignOutButton.tsx        "use client" — signOut({ callbackUrl: '/login' })
  RefreshButton.tsx        "use client" — router.refresh() with useTransition
  MeetingCard.tsx          Presentational card for one meeting
app/
  login/page.tsx          Login screen, reads ?error= searchParam
  meetings/page.tsx       Protected meeting list (server component)
  api/auth/[...nextauth]/route.ts  NextAuth GET + POST handler
types/next-auth.d.ts     Augments Session and JWT with hubspotOwnerId
```

---

## Lessons Learned

**npm name collision with spaces.** `create-next-app .` in a directory named "Email Follow Up Tool" fails because npm package names cannot have spaces or capital letters. Workaround: scaffold in a sibling directory (`reffie-follow-up`), read the config files, write them into the target directory manually, run `npm install` fresh.

**HubSpot `hs_meeting_start_time` format.** HubSpot returns this as an ISO 8601 datetime string (e.g., `"2025-06-08T14:30:00.000Z"`), not a raw millisecond integer. The search filter value, however, must be passed as epoch milliseconds (as a string). Handle both formats in parsing: `startTime.includes("T") ? new Date(startTime) : new Date(Number(startTime))`.

**NextAuth route handler.** In Next.js 14 App Router, the NextAuth handler must export named `GET` and `POST` constants — not a default export. Pattern: `const handler = NextAuth(authOptions); export { handler as GET, handler as POST }`.

**`router.refresh()` has no promise return.** You cannot `await router.refresh()`. Use `useTransition` — the `isPending` state from `startTransition` correctly tracks whether the server is still re-rendering after the refresh is triggered.

**HubSpot v4 association `toObjectId` is a number.** Cast explicitly: `String(t.toObjectId)`. Treating it as a string without casting causes silent ID mismatches when building the lookup Map.
