# DRAFT: Ikuyo WebMCP Challenge submission playbook

> DO NOT SUBMIT AS-IS, MUST REVISE
> Working draft — revise the copy, example trip, and recording timings before
> submitting.

## Submission identity

**Project name:** Ikuyo — plan the trip together

**Tagline:** A WebMCP-native travel workspace where people and agents turn
evolving travel intent into a living, shared itinerary.

**Core claim:** An agent should be a capable trip-planning collaborator, not
an opaque autopilot. Ikuyo gives the agent structured, permission-aware ways to
work with the same itinerary a person sees, while the traveller retains control
over consequential actions.

## Use case

### The person

Maya is organising a four-day Kyoto trip for herself and a friend. She has a
rough plan, one fixed museum booking, a budget, and several places she wants to
consider. Her friend can view and comment, but cannot make itinerary changes.

### The problem

Planning is continuous coordination rather than one answer to one prompt.
People need to preserve commitments, explore uncertain options, keep tasks and
costs in one place, and revise the schedule when plans change. A chat response
does not stay synchronized with the actual trip, while conventional agents have
to guess their way through an app's UI.

### What collaboration looks like

Maya asks the agent to create a realistic first pass around the fixed booking,
add a few unresolved ideas without scheduling them, create the practical
checklist and shared costs, and then explain the remaining decisions. The agent
uses Ikuyo's declared WebMCP tools to read live trip state and make structured
updates. Maya sees the changes in the same itinerary, makes the final choices,
and shares it with her friend.

### Why WebMCP is essential

WebMCP lets Ikuyo expose the product actions an agent needs as typed tools,
instead of relying on brittle screen automation. The agent can discover the
current trip, create and update itinerary objects, and read comments and costs
from the live source of truth. Tool availability follows the user's role:
viewers can read, editors can plan, and owners manage sharing. Destructive
operations remain deliberate, human-confirmed UI actions.

## Devpost description draft

### Inspiration

Travel planning is a living conversation: plans change, bookings constrain the
day, friends contribute ideas, and a useful itinerary must preserve all of that
context. We wanted an agent to help with the work without replacing the person
who owns the trip.

### What it does

Ikuyo is a collaborative itinerary workspace where a traveller and an agent
plan together. Through WebMCP, an agent can read the active trip and safely
create or update activities, accommodation, day plans, tasks, expenses, and
comments. The result is not a one-off generated itinerary; it is a shared plan
that remains editable, visible, and understandable to the people travelling.

### Why this is a strong fit for WebMCP

The real value is structured collaboration with state that already lives on the
web. Rather than clicking through an interface or maintaining a separate chat
summary, the agent uses explicit, typed tools backed by the same data and
mutation layer as Ikuyo's UI. This makes the interaction more reliable and
keeps the human and agent aligned on one source of truth.

Ikuyo dynamically exposes tools according to the signed-in user, the open
trip, and that user's role. Read-only tools are identified as safe to inspect;
editing and sharing capabilities are limited by role; deletion and member
removal stay behind existing human confirmation flows.

### What people and agents can do together now

A traveller can provide intent and judgment — priorities, compromises, and the
final say — while an agent turns that intent into a structured itinerary,
updates it when constraints change, tracks the practical details, and reports
what still needs a human decision. This is difficult with a conventional chat
assistant because the trip's live state, permissions, and product operations
are not available as dependable web-native actions.

### How we built it

Ikuyo registers WebMCP tools with `document.modelContext.registerTool`. Tool
schemas are typed and validated, reads use the live client store, and writes
go through the same existing API and optimistic-update layer used by the UI.
Registration is feature-detected and context-scoped, then cleaned up with an
`AbortSignal` when the page context changes. Unsupported browsers retain the
normal Ikuyo experience.

## Demo recording plan

### Before recording

- Deploy a stable HTTPS build and test it in ChatGPT's in-app browser.
- Prepare one dedicated demo account and one disposable trip: `Kyoto together`.
- Set the trip to four days and pre-create exactly one fixed event: `Kyoto
  National Museum — Sat 10:00`.
- Keep the timetable otherwise sparse; this makes the agent's work visible.
- Add a second account as a viewer so role-aware safety can be demonstrated.
- Have two browser windows ready: the ChatGPT in-app browser for the agent and
  Ikuyo's itinerary/timetable view for the visible result.
- Use the exact prompts below, but do one full dry run first. Remove all
  disposable data and reset to the starting state before filming.

### Recording target

Aim for 2 minutes 40 seconds. The hard limit is three minutes, so leave margin
for pauses and UI latency.

| Time | Visual | Narration / action |
| --- | --- | --- |
| 0:00–0:15 | Empty-ish Kyoto timetable and fixed museum booking | “Planning a trip is not one prompt. It is a living plan with bookings, ideas, budgets, and other people.” |
| 0:15–0:30 | ChatGPT in-app browser on Ikuyo | “Ikuyo uses WebMCP so an agent works with the actual itinerary through structured tools — not fragile UI clicking.” |
| 0:30–1:15 | Agent prompt and visible updates | Run Prompt 1. Let the viewer see activities appear in the timetable and unresolved options stay out of it. |
| 1:15–1:45 | Tasks, expense, accommodation shown in Ikuyo | Run Prompt 2. “The agent handles the organising work, but every result lands in the same shared workspace the travellers use.” |
| 1:45–2:10 | Constraint change, then agent response | Run Prompt 3. Show one deliberate reschedule and the agent's explanation of the trade-off. |
| 2:10–2:30 | Viewer role / unavailable mutation tools or app sharing UI | “WebMCP capabilities follow real permissions. Viewers can inspect the plan; only editors can change it. Destructive actions still require a person in the UI.” |
| 2:30–2:40 | Completed timetable | “Ikuyo gives agents hands, while keeping people at the steering wheel.” |

### Prompts to use in the recording

**Prompt 1 — build the first pass**

> We are planning a relaxed four-day Kyoto trip. Keep the Kyoto National Museum
> booking on Saturday at 10:00 unchanged. Add a sensible first-pass itinerary
> with no more than two scheduled activities per day. Put `Fushimi Inari at
> sunrise` and `day trip to Nara` in the idea backlog, not the timetable.
> Describe any assumptions you made.

**Prompt 2 — add practical coordination**

> Add our accommodation for all four nights, a packing task list with three
> tasks, and a shared expense for the museum tickets. Then tell me what remains
> undecided in this trip.

**Prompt 3 — show revision and judgment**

> We now prefer a slower Sunday morning. Move one flexible Sunday activity to
> another suitable day without changing the museum booking. Explain what you
> moved and why, and flag any decision you still need from me.

## Evidence to show or link

- Live URL, accessible to judges in ChatGPT's in-app browser.
- Public repository with an obvious open-source license and complete setup
  instructions.
- A short `WebMCP implementation` section in the README linking to
  `docs/webmcp-plan.md`.
- Dated commits showing the WebMCP extension made during the challenge period.
- A brief testing note: tested in ChatGPT's in-app browser, including an
  account or clear credentials if authentication is enabled.

## Final submission checklist

- [ ] Live URL works in a clean browser session.
- [ ] Judges can access a test account or test data without contacting us.
- [ ] Public repository URL and visible open-source license are correct.
- [ ] Video is public on YouTube, has clear audio, and is under 3 minutes.
- [ ] Devpost text explicitly answers: WebMCP fit, improved experience,
      new human-agent collaboration, and implementation.
- [ ] Screenshots show the finished itinerary and the agent in context.
- [ ] Pre-existing versus challenge-period WebMCP work is documented with
      dated commit evidence.
