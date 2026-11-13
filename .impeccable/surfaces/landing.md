---
version: 1
slug: "landing"
primary_target: "dashboard/src/app/(marketing)/page.tsx"
related_targets: ["dashboard/src/components/landing"]
---

# Surface: Koelakan landing page (/)

Scope: the public landing page at `/`. The dashboard overview moved to `/overview`. Mode: persuade. Audience: warung owners on phones and hackathon judges on laptops. Primary action: Set up my warung (`/warung`); secondary: See a warung in action (the read-only demo). Proof: live on-chain numbers, always labelled testnet, with grosir costs simulated. No testimonials, logos or invented claims.

## Direction contract

THESIS: The page is the agent talking to the owner. A navy phone replays the latest real settled round as a chat, and the rest of the page unfolds what each message meant.

OWN-WORLD: The dashboard's navy desk with a lime pen (DESIGN.md), unchanged: warm canvas, white borderless cards, navy phone and dark cards, lime only as a fill with navy ink, olive as accent text, food pastels on staple discs, and Plus Jakarta Sans with tabular numerals.

STORY: In one viewport a visitor learns what Koelakan does (headline), sees it happen (the chat), and can act (Set up my warung). Scrolling explains the round in its real durations, proves the price against PIHPS for all four staples, and states what the agent key can and cannot do.

FIRST VIEWPORT (desktop): a slim nav (logo, how it works, prices, rounds, for grosir, dashboard, lime Set up my warung). The left column holds the display headline, the lead, the two actions and a one-line live proof sentence. The right column holds a tall navy phone, nearly the viewport's height. Phone: the stack moves to headline, actions, then the phone.

FORM: owner-phone structure chosen from a surface round (seed:677eff9ea1fa1a49); the sketch is at .impeccable/mocks/decision/owner-phone.html.

MOTION THESIS:
- Focal: the round replays inside the phone once it is on screen. A typing indicator precedes each agent message, and bubbles settle in from their speaker's side. The result card is revealed bottom-up with a clip-path while its price counts down from the PIHPS price to the winning price, then the lime "% below PIHPS" pill wipes in. The sequence runs once and offers a Replay control.
- Continuity: the phone screen has a fixed height with messages anchored to the bottom, so arrivals never shift the layout.
- Feedback: button hover and press states only. No section reveals, no parallax.
- Budget: transform, opacity and clip-path only. The sequence starts on intersection and pauses its timers while the tab is hidden.
- Reduced motion: the full chat is shown at once with no count and no wipe.
- No JS: CSS reveals the full chat after 2.5s.

FINISH: unreviewed is unfinished. The build ends with a browser check at 1440 and 390, reduced motion, and the finish review against the sketch.
