# DRAFT: Ikuyo WebMCP Challenge submission playbook

> DO NOT SUBMIT AS-IS, MUST REVISE
> Working draft — revise the copy, example trip, and recording timings before
> submitting.

## Submission identity

**Project name:** Ikuyo: plan your next adventure!

**Elevator pitch:** Full-fledged collaborative travel-planning application for humans and agents.

## Devpost description draft

### Inspiration

Travel planning is a living conversation of ideas, changes, and constraints. A useful itinerary must preserve all of that context. I want to empower people with agents, not replace them in the planning process.

### What it does

Ikuyo is a collaborative itinerary workspace for travellers and their agents. Through WebMCP, agents can read a trip and create or update activities, accommodations, day plans, tasks, expenses, and comments. The result is not a one-off itinerary, but a shared plan that remains editable, visible, and understandable to the people travelling.


#### The problem

Planning a trip with an agent is a back-and-forth process of tuning and refining, not one-shot prompting. People need to feel in control of their plans while staying flexible when they change. Chat apps do not feel flexible enough, while spreadsheets are too rigid.

#### What collaboration looks like

The user asks the agent to draft a realistic travel plan around the fixed bookings, with a few itinerary suggestions. The agent creates it using Ikuyo's WebMCP tools. The user then studies and revises the plan, asking the agent for more suggestions. The agent sees the latest changes through WebMCP and uses them to give further suggestions. This goes back and forth until both parties are happy with the final itinerary.

#### Why Ikuyo does not have an in-app agent

In today's landscape, LLMs evolve very quickly, and everyone's preferred agent changes often. Committing to a specific agent provider requires significant ongoing maintenance for Ikuyo. It also conflicts with my goal of keeping users in control. Instead of providing an agent for users, I expect them to bring their own agent to help with travel planning.

#### Why WebMCP is essential

Because I expect users to bring their own agents, they would otherwise need to copy and paste information between Ikuyo and an agent's chat interface. This is inefficient. Another option is for the agent to control Ikuyo through browser automation. That is not ideal either: Ikuyo is built for people, so an agent must read and guess at HTML elements before performing actions. This makes each operation slow and unreliable. WebMCP solves this by exposing Ikuyo's product actions as tools with typed input and output schemas.

The agent can discover the current trip, create and update itinerary objects,
and read comments and costs from the live source of truth. Tool availability
follows the user's role: viewers can read, editors can plan, and owners manage
sharing. Destructive operations remain deliberate, human-confirmed UI actions.


### How we built it

This project started in 2024, when I had the idea of making a Google Calendar-like web application for travel planning. The application uses React and Radix Themes for the frontend, MapTiler for maps, and PHP/Laravel/MySQL for the backend. It originally used InstantDB, but I migrated away from it in late August after its shutdown announcement. The calendar grid uses CSS Grid, and all frontend time and date calculations use Temporal.

During this hackathon, I extended the application to support WebMCP, with the help of LLM agents (GPT-5.6). I imported Modern Web Guidance's WebMCP skill and used it while building. Afterward, I tested a range of prompts to fine-tune the tool descriptions so future agents can fill them in correctly.

### Challenges we ran into

The main challenge was treating WebMCP as more than another function for calling backend APIs. I had to consider it from the user's point of view and align the UI capabilities with the WebMCP tools, so they could call the existing backend APIs more efficiently. I also adjusted some backend API fields to make them more intuitive for agents to use.

The application initially focused on people, so I naturally built it around adding or editing one object at a time. However, when agents performed operations one by one, they were still slow to reach the desired outcome even when the plan was already synthesised in the context. I then added batch versions of the WebMCP tools so agents could create and edit itinerary activities more efficiently.

### Accomplishments that we're proud of

I'm proud that this travel-planning application now integrates deeply with agentic capabilities. People can bring their preferred agents to interact with the site while remaining in control of their own travel plans.

### What we learned

I learned that building for agents is different from building for people. People receive hints through the visual UI, while agents can access only the tool descriptions. I therefore need to fine-tune the capabilities so agents can operate correctly and efficiently. I also learned that agents work faster than people, so they need ways to batch-create and batch-edit activities.


### What's next for Ikuyo

I have used Ikuyo to plan my own travels, and other people have shared that they completed trips using it. However, it still lacks some human-to-human collaboration capabilities, such as expense splitting and combining. It also needs better support for travel plans that span multiple regions and time zones. Those are the areas I plan to tackle next.





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
