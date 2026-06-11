# Reffie Follow-Up Email Generator — Product Spec
**Version:** 1.2 (Phase 1)
**Author:** Connie Lee
**For:** Hamza (implementation)
**Status:** Ready to build

---

## 1. Overview

A standalone internal web app that lets Reffie AEs generate a first-draft follow-up email immediately after a discovery call or demo. The AE selects a recent meeting from a list, reviews the generated draft, and copies it into Gmail. No email is sent from the tool itself in Phase 1.

**Primary users:** Ross Barton, Preston Bryan, Connie Lee
**Out of scope (Phase 1):** Sending email, ROI calculator integration, mobile layout

---

## 2. Authentication

The tool uses **Google OAuth 2.0** login. Access is restricted to `@reffie.me` Google accounts only. Non-Reffie Google accounts are rejected at the auth step.

On first load, the AE clicks "Sign in with Google." Once authenticated, their identity is used to:
- Match them to their HubSpot owner ID (see Section 8)
- Populate the correct AE signature block in generated emails
- Filter the meeting list to only their meetings

Session persists via a cookie or localStorage token until they sign out or the token expires.

---

## 3. Data Sources & Integrations

| Source | What it provides | How |
|---|---|---|
| **HubSpot** | Meeting list, contact name + email, company name, deal stage, AE owner, quote sent | HubSpot REST API (private app token) |
| **Day.ai** | Meeting summary, call notes, unit count | Day.ai MCP server |
| **Claude API** | Email type classification + draft generation | Anthropic API (claude-sonnet-4-6) |

### How the meeting list is populated
HubSpot syncs meetings from Google Calendar automatically when the prospect's email matches a HubSpot contact. Meetings created via HubSpot scheduling links, GCal invites with the prospect as attendee, and manually logged meetings are all captured as Activity records on the Contact/Deal object.

The tool queries HubSpot for meetings logged in the past **7 days**, filtered by the AE's HubSpot owner ID, sorted by most recent first.

### How the Day.ai summary is fetched
The tool calls the Day.ai MCP server directly to retrieve the meeting summary for the selected meeting, matched by contact name, company, or meeting time. This returns structured data cleanly with no dependency on email delivery timing.

If the Day.ai MCP returns no summary for a meeting, the tool shows a warning and allows the AE to paste the summary manually into a text field.

> **Note for Hamza:** Review Day.ai MCP documentation to confirm the available query methods — specifically whether summaries can be fetched by contact name, company name, or meeting timestamp. Have Connie connect the Day.ai MCP server and confirm credentials before starting this ticket. Also confirm whether Day.ai's MCP server has any per-call usage cost.

---

## 4. User Flow

```
1. AE opens the tool
2. AE signs in with Google (@reffie.me account required)
3. Tool displays a list of their recent meetings (past 7 days) from HubSpot
4. AE clicks a meeting
5. Tool fetches:
     - Contact + deal details from HubSpot
     - Meeting summary + unit count from Day.ai MCP
6. Tool auto-detects email type (discovery vs. demo) from summary content
7. AE confirms or overrides the email type
8. AE sets meeting outcome (Completed / No Show / Rescheduled)
9. AE clicks "Generate Draft"
10. Draft appears in an editable text area
11. AE reviews, makes any edits
12. AE copies subject and body separately into Gmail
```

---

## 5. UI Screens

### 5.1 Login Screen
- Reffie wordmark + "Follow-Up Writer" title
- "Sign in with Google" button
- Restricts to @reffie.me accounts — shows error if another Google account is used

### 5.2 Meeting List (Home Screen)

- **Header:** "Follow-Up Writer" with Reffie wordmark + signed-in AE name
- **Subhead:** "Your meetings from the last 7 days"
- **Meeting cards** (one per meeting), each showing:
  - Contact name + company
  - Meeting date and time
  - Deal stage
  - Tag: `Discovery Call` or `Demo` (auto-detected, can be overridden on next screen)
  - Outcome badge if already set: `Completed` / `No Show` / `Rescheduled`
- **Empty state:** "No meetings found in the last 7 days. Check that your HubSpot calendar sync is active."
- **Refresh button** to re-fetch from HubSpot

### 5.3 Meeting Detail + Draft Screen

Two-panel layout. Minimum page width: 1100px. Both panels must be fully visible on a standard 1280px+ laptop screen with no horizontal scrolling.

**Left panel (30% width, min-width 320px):**
- Contact name, company, email
- Meeting date/time
- Deal stage + unit count (pulled from Day.ai summary)
- **Meeting outcome selector:** Dropdown — `Completed` / `No Show` / `Rescheduled`. Selecting an option writes back to HubSpot immediately via the `hs_meeting_outcome` field on the Activity record. Shows a subtle `✓ Saved` confirmation on success.
- **Email type selector:** Toggle between `Discovery Call` and `Demo` (pre-selected based on auto-detection)
- Day.ai summary (collapsed by default, expandable so AE can review what was fed to Claude)
- "Generate Draft" button (primary CTA)
- Regenerate button (after first draft is shown)

**Right panel (70% width, min-width 640px):**
- **Subject line field** (editable, single line)
- **Email body** (editable text area, pre-populated after generation — tall enough to show the full email without internal scrolling)
- **"Copy subject"** button — copies subject line only
- **"Copy body"** button — copies body only
- Both buttons briefly change to `✓ Copied!` for 2 seconds after clicking
- Status indicator: `Generating...` / `Ready` / `No Day.ai summary found`

### 5.4 Missing Summary State
If the Day.ai MCP returns no summary for a meeting:
- Yellow warning banner: "No Day.ai summary found for this meeting. Paste it below to generate a draft."
- Text area for manual paste
- Generate button activates once content is pasted

---

## 6. Email Type Auto-Detection

Claude determines the email type from the Day.ai summary before draft generation. Pass this as a pre-classification call:

**Prompt for classification:**
```
Based on this meeting summary, classify the call as either a "discovery" or "demo".

A discovery call is a first or early conversation where the prospect's situation, 
pain points, and current tools are being explored. A demo is a call where the 
Reffie product was shown or walked through in detail.

Reply with only one word: "discovery" or "demo".

Summary:
{day_ai_summary}
```

The result pre-selects the toggle. The AE can override it before generating.

---

## 7. Email Generation Prompts

### 7.1 System Prompt (both types)
```
You are a sales assistant for Reffie, a leasing communication platform for 
property management companies. You write follow-up emails on behalf of Reffie 
AEs after sales calls.

Reffie's core value proposition:
- Centralizes all inbound rental leads (Zillow, Apartments.com, Facebook, etc.) 
  into one inbox
- Sends humanized, automated follow-up sequences via email, text, and phone
- Provides analytics dashboards showing lead volume, response rates, and 
  drop-off by listing
- Works alongside existing tools (AppFolio, Rent Engine, Showdigs, etc.) — 
  it is not a replacement
- Priced at $1/door/month with a 6-month money-back guarantee

Tone guidelines:
- Warm but professional. Conversational, not corporate.
- Open with a specific, personal callback to something said on the call — 
  never a generic opener like "Hope this finds you well" or "Great speaking with you"
- Frame the prospect's pain as systemic/structural, never personal 
  ("not because you're not working hard, but because the tools aren't set up to catch them")
- Position Reffie as additive, not a rip-and-replace
- Use the prospect's exact language when restating their situation if possible
- Bullet points for situation/pain/features. Prose for opener and next steps.
- Sign off with the AE's name, title, and phone number

Writing rules — strictly follow these:
- No em dashes (—). Use a comma, period, or rewrite the sentence instead.
- No constructions like "It's not X. It's Y." or "This isn't about X, it's about Y."
- No "game-changer", "seamlessly", "synergy", "leverage", "holistic", "streamline", 
  "robust", "cutting-edge", "unlock", "empower", or "dive into"
- No filler openers ("Certainly!", "Absolutely!", "Great question!")
- No hedging phrases ("It's worth noting that...", "It's important to remember...")
- No rhetorical questions used as transitions ("So what does that mean for you?")
- Write like a sharp human, not a language model

Do not include subject line in the body. Output subject line separately, 
clearly labeled "Subject:" on the first line, then a blank line, 
then the email body.
```

### 7.2 Discovery Call Draft Prompt
```
Write a post-discovery call follow-up email using the information below.

The email must include these sections in this order:
1. Personal opener — one or two sentences referencing something specific 
   from the call
2. Current Situation — 3-5 bullets restating their portfolio size, team 
   structure, current tools, and vacancy context
3. Pain Points — 2-4 bullets naming the specific problems surfaced on the 
   call, in plain language
4. How Reffie Helps — 2-4 bullets mapping Reffie features directly to 
   their stated pain points. Do not list features that were not relevant 
   to their situation.
5. Next Steps — 1-3 sentences stating what happens next (scheduled meeting, 
   follow-up timeline, or action item)

If the meeting summary mentions a mystery shop was conducted or discussed, 
add a brief "What the Mystery Shop Found" section between Pain Points and 
How Reffie Helps. Summarize the key findings in 2-3 bullets. 
If no mystery shop is mentioned, omit this section entirely.

---
AE name: {ae_name}
AE title: {ae_title}
AE phone: {ae_phone}
Prospect name: {prospect_first_name}
Company: {company_name}
Unit count: {unit_count}
Deal stage: {deal_stage}
Meeting date: {meeting_date}

Day.ai meeting summary:
{day_ai_summary}
---
```

### 7.3 Demo Draft Prompt
```
Write a post-demo follow-up email using the information below.

The email must include these sections in this order:
1. Personal opener — one or two sentences with a specific callback to the 
   demo conversation, referencing a question asked, objection raised, 
   or moment from the call
2. The Gap We're Talking About — 2-4 bullets or short prose summarizing 
   the specific leasing communication gap identified during the demo 
   (mystery shop findings if discussed, or operational gap if not)
3. How Reffie Fits — 2-4 bullets directly addressing the prospect's 
   specific questions or objections from the demo. Lead with what 
   resonated. Address skepticism directly — do not skip objections.
4. Attached / Included — bullet list of anything being sent with this 
   email (quote, case study, testimonials, mystery shop report). 
   Only include if the summary mentions these were promised.
5. Next Steps — 1-3 sentences with the scheduled follow-up, decision 
   timeline, or specific ask

If the summary mentions a mystery shop, include findings in section 2. 
If not, focus section 2 on the operational or process gap discussed.

---
AE name: {ae_name}
AE title: {ae_title}
AE phone: {ae_phone}
Prospect name: {prospect_first_name}
Company: {company_name}
Unit count: {unit_count}
Deal stage: {deal_stage}
Meeting date: {meeting_date}

Day.ai meeting summary:
{day_ai_summary}
---
```

---

## 8. HubSpot Data Fetching & Writing

Uses the **HubSpot REST API** via a private app token (same pattern as the onboarding platform). Not the HubSpot MCP.

### Meetings query (read)
Fetch Activity records of type `MEETING` from the last 7 days where:
- `hubspot_owner_id` matches the logged-in AE
- Associated with at least one Contact and one Deal

Fields to retrieve per meeting:
- `hs_meeting_title`
- `hs_meeting_start_time`
- `hs_meeting_outcome`
- Associated Contact: `firstname`, `lastname`, `email`
- Associated Company: `name`
- Associated Deal: `dealstage`, `dealname`

Note: Unit count is no longer pulled from HubSpot. It is extracted from the Day.ai meeting summary instead (see Section 9).

### Meeting outcome write-back
When the AE selects an outcome in the UI (`Completed` / `No Show` / `Rescheduled`), the app immediately PATCHes the HubSpot Activity record:

```
PATCH /crm/v3/objects/meetings/{meetingId}
{
  "properties": {
    "hs_meeting_outcome": "COMPLETED" | "NO_SHOW" | "RESCHEDULED"
  }
}
```

Show a subtle `✓ Saved` confirmation in the UI on success. Show an inline error if the write fails with a retry option.

### AE identity → HubSpot owner ID mapping
Google Auth provides the signed-in email address. Map it to a HubSpot owner ID server-side:

| Google email | HubSpot owner ID |
|---|---|
| ross@reffie.me | `{ross_hubspot_owner_id}` |
| preston@reffie.me | `{preston_hubspot_owner_id}` |
| connie@reffie.me | `{connie_hubspot_owner_id}` |

> **Note for Connie:** Pull these owner IDs from HubSpot Settings → Users and fill in the table above before handing the spec to Hamza.

---

## 9. Unit Count — Day.ai Extraction + HubSpot Write-back

Unit count is not reliably populated in HubSpot. Instead:

1. **Extract from Day.ai summary** — after fetching the meeting summary, pass it to Claude in the classification call with an additional instruction to extract unit count if mentioned (e.g. "120 units", "manages 400 doors"). Return as a structured field alongside the discovery/demo classification.
2. **Use in email draft** — inject the extracted unit count into the prompt as `{unit_count}`
3. **Write back to HubSpot** — if a unit count is successfully extracted, silently PATCH the associated Company record in HubSpot to update the unit count field. This eliminates manual data entry.

If no unit count is found in the summary, leave `{unit_count}` blank in the prompt and omit it from the email draft. Do not write anything back to HubSpot in that case.

> **Note for Connie:** Confirm the exact HubSpot field name for unit count on the Company object (likely a custom property) so Hamza can target the correct field in the write-back.

---

## 10. Claude API Usage & Guardrails

**Model:** `claude-sonnet-4-6`
**API key:** One Reffie-owned Anthropic API key stored as a server-side environment variable. Never exposed to the client.

**Estimated cost:** ~$0.01 per draft. At 8 drafts/day the monthly cost is approximately $2-3.

**Guardrails — implement all four:**

1. **Max tokens** — set `max_tokens: 1000` on all API calls. Caps output length and cost per call.
2. **Server-side rate limiting** — max 20 draft generations per user per day. Tracked server-side. Returns a clear error message if exceeded: "You've hit the daily generation limit. Reset at midnight."
3. **Anthropic Console spend cap** — set a hard monthly spend limit in the Anthropic account dashboard before the key goes live. Recommended: $20/month. If the cap is hit, the API stops accepting requests rather than running up an unexpected bill.
4. **Usage monitoring** — Anthropic Console shows per-day token usage. Check it during the first week of use to confirm normal usage patterns.

> **Note for Connie:** Set the monthly spend cap in the Anthropic Console before Hamza puts the API key into production. This is the most important guardrail.

---

## 11. Subject Line Logic

Rather than generating a new subject line each time, rotate through the three observed patterns from real Reffie emails. Pick one at random per generation:

- `{prospect_first_name} - Reffie Recap + Mystery Shop Report`
- `Great Connecting, {prospect_first_name} — Quote, Mystery Shop & Testimonials Inside`
- `{company_name} - Reffie Next Steps + ROI`

Substitute the appropriate name/company from HubSpot data. No Claude call needed for subject line generation.

---

## 12. Styling

Follow the **Reffie brand style guide** (`/mnt/skills/user/reffie-style/SKILL.md`). Key rules:

- **Font:** Inter (Google Fonts), weights 400/500/600/700 only
- **Page background:** `#FAF8F5` (warm off-white)
- **Cards:** White bg, `1px solid rgba(0,0,0,0.08)` border, 12px radius
- **Primary accent:** `#10BD91` (Reffie Green) — buttons, highlights, active states
- **Hover/active:** `#0C8E6D` (Green Dark)
- **Muted text:** `#6B6B6B`
- **Buttons:** Full pill radius (100px), green fill, white text
- **Inputs:** `#FAF8F5` bg, `1px solid rgba(0,0,0,0.14)` border, 8px radius, green focus ring
- **Table headers** (if any): `#10BD91` fill, white Inter 600 text
- **Eyebrow labels:** 11px, Inter 600, uppercase, `#10BD91`, letter-spacing 1.5px

Apply the eyebrow label pattern above the main heading on each screen (e.g. `SALES TOOLS` above "Follow-Up Writer").

---

## 13. Error States

| Situation | Behavior |
|---|---|
| Google account not @reffie.me | "Access restricted to Reffie team members." shown at login |
| No meetings found in last 7 days | Empty state message with link to HubSpot |
| HubSpot API error | "Couldn't load meetings. Check your connection." with retry button |
| HubSpot outcome write-back fails | Inline error next to outcome selector with retry option |
| No Day.ai summary found | Yellow warning banner, manual paste fallback |
| Claude API error | "Draft generation failed. Try again." with retry button |
| Daily generation limit hit | "You've hit the daily generation limit. Reset at midnight." |
| Generation takes >10 seconds | Spinner with "Generating your draft..." message |

---

## 14. What's Explicitly Out of Scope (Phase 1)

- Sending email directly from the tool
- ROI calculator integration
- Saving or logging drafts back to HubSpot
- Mobile layout
- Additional email types beyond discovery and demo
- Editing the AI prompt from the UI

---

## 15. Open Items for Connie to Resolve Before Build

1. **HubSpot owner IDs** — pull Ross, Preston, and Connie's owner IDs from HubSpot Settings → Users and fill into Section 8
2. **Unit count HubSpot field name** — confirm the exact custom property name on the Company object so Hamza can target it in the Day.ai write-back (Section 9)
3. **Day.ai MCP credentials** — connect the Day.ai MCP server and confirm any per-call usage costs
4. **Anthropic API key + spend cap** — create a Reffie-owned API key and set a $20/month hard spend cap in the Anthropic Console before the key goes to Hamza
5. **Hosting** — confirm where this gets deployed alongside other Sales Hub tools

---

## 16. Suggested Linear Tickets

1. **Project scaffold + Google Auth** — Set up repo, Google OAuth restricted to @reffie.me, basic routing, session handling
2. **HubSpot meeting list** — REST API integration, fetch meetings by owner ID, meeting card UI
3. **HubSpot outcome write-back** — PATCH hs_meeting_outcome on outcome selector change, save confirmation
4. **Day.ai MCP integration** — Connect Day.ai MCP, fetch summary for selected meeting, manual paste fallback
5. **Email type auto-detection + unit count extraction** — Combined Claude classification call that returns both email type and unit count, HubSpot Company write-back for unit count
6. **Discovery call draft generation** — Prompt, variable injection, subject line rotation, editable output
7. **Demo draft generation** — Prompt, variable injection, subject line rotation, editable output
8. **Copy buttons + UI polish** — Copy subject / copy body buttons, Reffie brand styling, error states, loading states, layout width QA
9. **QA with AEs** — Ross, Preston, and Connie each test with a real recent meeting and give feedback
