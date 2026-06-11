# Testing Guide — Reffie Follow-Up Writer

## Running in Test Mode

Test mode lets you verify every screen without real credentials. All API calls (HubSpot, Day.ai, DeepSeek) are bypassed and replaced with mock data.

**To enable test mode:**
```
TEST_MODE=true   # already set in .env.local
```

**To disable test mode (use real APIs):**
Change `TEST_MODE=true` to `TEST_MODE=` in `.env.local`, then restart the dev server.

**Start the dev server:**
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A yellow `TEST MODE — No real API calls are being made` banner appears at the top of every page when test mode is active.

---

## Mock Meetings

Three fake meetings are returned instead of calling HubSpot:

| ID | Title | Prospect | Company | Deal Stage | Outcome | Day.ai Summary |
|---|---|---|---|---|---|---|
| mock-001 | Discovery Call - Oakbrook Apartments | Sarah Chen (sarah.chen@oakbrookapts.com) | Oakbrook Apartments | Appointment Scheduled | COMPLETED | Returns fake discovery call summary |
| mock-002 | Intro Call - Silverstone Properties | Marcus Rivera (m.rivera@silverstoneprops.com) | Silverstone Properties | Qualified to Buy | None | Returns null (no summary found) |
| mock-003 | Demo - Lakeview Residential | Jordan Patel (jordan@lakeviewres.com) | Lakeview Residential | Presentation Scheduled | None | Returns null (no summary found) |

**Classification:** All meetings classify as `{ type: "discovery", unitCount: 120 }` regardless of summary content.

**Outcome write-back:** Selecting an outcome logs to the server console instead of calling HubSpot. Look for `[TEST MODE] Would PATCH HubSpot meeting ...` in your terminal.

---

## What to Check on Each Screen

### Login page (`/login`)
- [ ] Reffie logo and "Sales Tools" eyebrow label display correctly
- [ ] Google Sign-In button is present and styled correctly
- [ ] Note: clicking Google Sign-In will fail in test mode if `GOOGLE_CLIENT_ID` is a placeholder — this is expected. Full auth testing requires real Google OAuth credentials.

### Meeting list (`/meetings`)
- [ ] Yellow TEST MODE banner appears at the top
- [ ] Three mock meetings appear in the list
- [ ] Each card shows: contact name, company, meeting date, deal stage, outcome badge (mock-001 has COMPLETED, others show no badge)
- [ ] Refresh button works (re-renders the list)
- [ ] Error state: temporarily break `HUBSPOT_PRIVATE_TOKEN` in .env.local, reload — should show red error card with a Retry button. Restore the token afterward.
- [ ] Empty state: not directly testable with TEST_MODE — mock data always returns 3 meetings.

### Meeting detail (`/meetings/mock-001?data=...`)
Click **mock-001 (Discovery Call - Oakbrook Apartments)**:
- [ ] Left panel shows: Sarah Chen, Oakbrook Apartments, sarah.chen@oakbrookapts.com, meeting date, deal stage
- [ ] Outcome dropdown shows COMPLETED (pre-filled)
- [ ] Changing the outcome logs `[TEST MODE] Would PATCH...` to the terminal — no 500 error
- [ ] Day.ai spinner appears briefly then the summary text auto-fills in the textarea
- [ ] Classification fires automatically on Generate Draft click (DeepSeek returns mock `discovery / 120 units`)
- [ ] Unit count `120` appears in the left panel after classification
- [ ] Email type toggle shows "Discovery Call" (pre-selected from classification result)

Click **mock-002 (Intro Call - Silverstone Properties)**:
- [ ] Day.ai returns null — yellow "No Day.ai summary found" banner appears
- [ ] Textarea is empty and editable — paste any text to enable Generate Draft
- [ ] Outcome dropdown is blank (no pre-filled value)

Click **mock-003 (Demo - Lakeview Residential)**:
- [ ] Same behavior as mock-002 (no Day.ai summary)
- [ ] Outcome dropdown is blank

### Generate Draft button behavior
- [ ] Button is disabled when textarea is empty
- [ ] Button label changes to "Detecting call type..." during classification
- [ ] After classification, browser console shows `Generate draft: { type: "discovery", unitCount: 120, summary: "..." }` (stub — email is not generated yet)
- [ ] If classification fails: "Could not detect call type. Please select manually." error appears, button re-enables, second click uses current toggle state and logs `Generate draft (skipped classification): ...`

---

## Switching to Real Credentials

1. Set `TEST_MODE=` (empty) in `.env.local`
2. Fill in real values for:
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
   - `DEEPSEEK_API_KEY` — from platform.deepseek.com
3. Restart the dev server
4. Sign in with a `@reffie.me` Google account
5. Real HubSpot meetings, Day.ai summaries, and DeepSeek classification will be used

The `HUBSPOT_PRIVATE_TOKEN`, `DAY_AI_*` credentials are already real values in `.env.local` and will work immediately once test mode is off.
