---
name: Koelakan
description: Group restocking for warungs, measured against the real market price.
colors:
  ground: "#f4f4ef"
  surface: "#ffffff"
  line: "#ebebe4"
  line-strong: "#dcdcd3"
  control: "#8a8a96"
  ink: "#1f1f2e"
  muted: "#686874"
  night: "#1f1f2e"
  night-raised: "#2c2c3e"
  night-muted: "#a3a3b5"
  brand: "#d6f26b"
  brand-hover: "#cae85a"
  brand-soft: "#eef9c4"
  brand-ink: "#435a00"
  rice: "#ffebdd"
  rice-ink: "#9a4a12"
  sugar: "#fde6ee"
  sugar-ink: "#9b2c55"
  eggs: "#fff6d6"
  eggs-ink: "#8a6a00"
  oil: "#e2f1fb"
  oil-ink: "#1b5e8c"
  warn: "#8a5a00"
  warn-soft: "#fff1d6"
  danger: "#b42318"
  danger-soft: "#fde8e8"
  info: "#4b3fa0"
  info-soft: "#ece8ff"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.488rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.728rem"
    fontWeight: 700
    lineHeight: "2.1rem"
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.488rem"
    fontWeight: 800
    lineHeight: "2.8rem"
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  title:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: "1.7rem"
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.6rem"
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.35rem"
  label:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1.1rem"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  card: "20px"
  3xl: "24px"
  rail: "28px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.ground}"
  button-soft:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  button-on-dark:
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "44px"
  chip-neutral:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-good:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-bad:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-dark:
    backgroundColor: "{colors.night}"
    textColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-dark-inset:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  sidebar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.surface}"
    rounded: "{rounded.rail}"
    padding: "16px"
    width: "240px"
  nav-item:
    textColor: "{colors.night-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  nav-item-hover:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.surface}"
  nav-item-active:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
  demo-card:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "16px"
  filter-tabs:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.full}"
    padding: "4px"
  filter-tab:
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  filter-tab-active:
    backgroundColor: "{colors.night}"
    textColor: "{colors.surface}"
  chart-tooltip:
    backgroundColor: "{colors.night}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
---

# Design System: Koelakan

## Overview

**Creative North Star: "The Navy Desk with a Lime Pen"**

Koelakan reads as a modern operations dashboard in the Eduplex manner: a warm off-white canvas, white borderless cards, a navy floating sidebar that holds the whole app together, and a single lime accent that marks the one thing that is current, done or worth pressing. Navy is the structure; lime is the highlighter laid on top of it. Money is still the hero of every screen, shown as large tabular figures and as navy bars and rings measured against the PIHPS market price.

Density is calm and phone-first. Cards are generous (20-24px inside), tap targets never drop under 44px (40px inside the segmented filter), and the layout is one column on a phone that opens into a main column plus a 22rem side column on wide screens. Everything is flat colour: no gradients, no glow, no radial washes. The four staple pastels from the earlier world survive only on the item tiles, so food still reads as food.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1. Quiet surfaces, a steady repeated card rhythm, and motion limited to a short settle-in and state colour transitions.

**Key Characteristics:**
- Warm off-white canvas with white 20px-radius cards and no card border.
- Navy for structure: sidebar, phone tab bar, dark focal cards, chart bars, progress rings, selected filter tabs.
- One lime accent, used only as a fill with navy ink on it.
- Plus Jakarta Sans throughout, tabular numerals for every amount, quantity and time.
- Four food pastels, each with a darker same-hue text tint, kept for the staple tiles.
- State colours carry fixed meanings: lavender in progress, lime done, amber waiting, red failed.

## Colors

Warm paper, deep navy and one bright lime, with four food pastels that only ever describe an item.

### Primary
- **Highlighter Lime** (brand): primary buttons, the active sidebar pill and tab bar pill, the sidebar demo card, the newest bar in the savings chart, the "% below PIHPS" pill on the result card, done step markers, text selection, and the focus ring on dark surfaces. Navy ink sits on it at 13:1.
- **Pressed Lime** (brand-hover): hover state of lime fills.
- **Lime Wash** (brand-soft): the "good" chip and notice, soft buttons, empty-state icon discs.
- **Olive Ink** (brand-ink): the text form of the accent, 7.8:1 on white. Savings figures, "% below PIHPS" text, chip text, sender labels in chat.

### Secondary (structure)
- **Desk Navy** (night, and ink as text): the sidebar, the phone tab bar, dark focal cards (promo, auction result, "Needs you" when it has items), chart bars, progress ring arcs, the active filter tab, the chart tooltip, the default focus ring on light surfaces, checkbox accent and caret.
- **Raised Navy** (night-raised): insets inside dark cards and the sidebar hover fill.
- **Dusk Grey** (night-muted): secondary text on navy, 6.5:1 on night and 5.5:1 on night-raised.

### Tertiary (staples and state)
- **Rice Peach / Sugar Rose / Egg Butter / Oil Sky** (rice, sugar, eggs, oil) with their inks (rice-ink, sugar-ink, eggs-ink, oil-ink): the produce disc behind each staple image, the warung item cards, and item-specific notes such as "PIHPS is above HET".
- **Lavender** (info, info-soft): in progress. Live auction rows, "Next up" and "Ready" step chips, info notices.
- **Amber** (warn, warn-soft): waiting. Awaiting settlement, warnings.
- **Brick** (danger, danger-soft): failed, refunded, destructive actions and errors.

### Neutral
- **Warm Canvas** (ground): the page background, the filter track, neutral chips, hover fill of list rows and secondary buttons.
- **Card White** (surface): every card, input and the testnet note in the header.
- **Hairline** (line) and **Firm Hairline** (line-strong): dividers inside cards, ring and chart tracks, the secondary button outline, skeleton fill.
- **Control Grey** (control): input borders, 3.4:1 on white for non-text contrast.
- **Navy Ink** (ink): body text and headings.
- **Slate Muted** (muted): secondary text, 5.5:1 on white and 4.98:1 on the canvas.

### Named Rules
**The Highlighter Rule.** Lime is a fill, never text and never a ring or stroke on white (1.25:1). Whatever sits on lime is navy ink. When the accent has to be text on a light surface, use Olive Ink. Lime may be text or a ring only on navy, where it reads at 13:1.

**The Navy Spine Rule.** Navy carries structure and selection: the sidebar, dark cards, chart bars, rings and the selected state. Every navy surface carries the `on-dark` class so its focus ring turns lime.

**The Fixed Meaning Rule.** Lavender means in progress, lime means done, amber means waiting, red means failed. Colour always comes with a word, number or icon.

## Typography

**Display Font:** Plus Jakarta Sans (with ui-sans-serif, system-ui)
**Label/Mono Font:** ui-monospace stack, for account ids and hashes only

**Character:** One geometric sans drawn for Jakarta, the city this product is about. Heavy weights (700-800) with slight negative tracking for headings and figures; regular weight for reading text. Every amount, quantity and time uses tabular numerals.

### Hierarchy
- **Display** (800, 2.074rem rising to 2.488rem, line-height 1.1): the overview h1. Route headers use the same size at 700.
- **Headline** (700, 1.728rem): titles inside dark focal cards.
- **Figure** (800, 1.44rem to 2.488rem, tabular): savings, countdowns, prices. The auction result's winning price goes larger (3rem to 3.75rem, 800, -0.03em) as the single focal number on a round page.
- **Title** (700, 1.2rem, -0.01em): card section titles.
- **Body** (400, 0.875rem): the workhorse for card content, list rows and nav labels.
- **Body large** (400, 1rem): page leads under headings and input text, so phones do not zoom.
- **Label** (600, 0.75rem): chips, captions, hints. Chart axis labels drop to 11px in muted.

### Named Rules
**The Tabular Money Rule.** Any rupiah amount, quantity, percentage, round number or clock time is set with tabular numerals so columns align and live figures do not jitter.

**The Sentence Case Rule.** Headings and labels are sentence case at their natural tracking. The system has no uppercase tracked labels above headings.

## Layout

On screens 1024px and up, the navy sidebar (240px wide) floats 16px in from the top, left and bottom of the viewport, and the content column starts after it (16.5rem). Content sits in a container up to 84rem wide with 16px side padding, 32px from 640px. Below 1024px the sidebar disappears, the brand moves into the top bar, and a full-width navy tab bar with six labelled items sits at the bottom with the safe-area inset.

The overview uses a main column plus a 22rem side column from 1280px; below that, a single column whose order is set so the promo card comes right after the header on phones. Staple cards form a two-up grid from 640px. Card grids use 16px gaps; sections stack at 24-32px. Spacing follows a 4px base (4, 8, 12, 16, 20, 24, 32).

## Elevation & Depth

Depth comes from tone, not shadow: white cards on a warm canvas, navy cards on top of that. Cards carry a shadow so faint it reads as a soft edge rather than lift. One stronger shadow exists, for the confirm dialog only.

### Shadow Vocabulary
- **Card edge** (`box-shadow: 0 1px 2px rgba(31,31,46,0.04), 0 6px 18px rgba(31,31,46,0.04)`): every white card, the header account button and testnet note, agent chat bubbles.
- **Dialog lift** (`box-shadow: 0 2px 4px rgba(31,31,46,0.06), 0 14px 32px rgba(31,31,46,0.1)`): the confirm dialog, over a 40% navy backdrop.

### Named Rules
**The Flat Colour Rule.** No gradients, glows or radial washes on any surface. Contrast between canvas, white and navy does the work.

## Shapes

Everything is rounded and soft. Cards are 20px, the sidebar 28px, the demo card 24px, list rows and dark insets 16px, inputs and notices 12px, tooltips 8px. Every button, chip, nav item, filter tab, icon disc and chart bar is a full pill or circle. Cards have no border; inputs have a 1px control-grey border; notices have a faint inset ring in their own hue.

## Components

### Buttons
- **Shape:** full pill (9999px), 44px tall, 20px side padding, 600 weight body text.
- **Primary:** lime fill with navy ink; hover goes to Pressed Lime; press nudges down 1px.
- **Secondary:** white with a Firm Hairline outline and navy ink; hover fills with canvas and darkens the outline.
- **Soft:** Lime Wash fill with Olive Ink.
- **Ghost:** muted text, canvas fill on hover.
- **On dark:** for navy cards: white text on a 10% white fill with a 25% white inset ring. (The code names this variant `onBrand`.)
- **Danger:** brick fill with white text.
- **Disabled:** 50% opacity and a not-allowed cursor.

### Chips
- **Style:** soft fill in the tone's wash with the tone's ink, no border, full pill, 0.75rem semibold, 4px by 12px.
- **State:** neutral, good (lime wash), info (lavender), warn (amber), bad (brick). An optional dot repeats the ink colour; the word always carries the meaning.

### Cards / Containers
- **Panel:** white, 20px radius, no border, card-edge shadow, 20px padding rising to 24px. Panels never nest.
- **Dark card:** navy, 20px radius, white text with Dusk Grey secondary text, carries `on-dark`. Used for the promo card, the auction result, and "Needs you" when actions are waiting. Insets inside use Raised Navy at 16px radius.

### Inputs / Fields
- **Style:** white, 1px control-grey border, 12px radius, 44px tall, 1rem tabular text, label above in 600 body text, hint below in muted label text.
- **Focus:** navy 2px outline and navy border. Hover darkens the border.
- **Error / Disabled:** brick border when invalid; canvas fill at 60% opacity when disabled.

### Navigation
- **Logo:** a lime price tag turned 45 degrees with a navy arrow pointing down (prices below the market), on a navy rounded tile. One SVG source (`components/logo.tsx`, shared with `app/icon.svg` and the OG image); on the navy sidebar the tile lifts to Raised Navy so it still reads.
- **Sidebar:** navy floating card with the logo and wordmark at the top, six pill links with stroke icons, and the demo card at the foot. Inactive links are Dusk Grey at 500 weight; hover fills Raised Navy with white text; the current page is a lime pill with navy 700 text and a slightly heavier icon stroke.
- **Demo card:** a lime card (24px radius) at the sidebar foot with a navy circle holding a lime arrow; the arrow turns 45 degrees and the card lifts 2px on hover.
- **Phone tab bar:** navy, six columns, icon over a short label; the current item puts its icon in a lime pill and turns its label lime.

### Filter Tabs
A canvas-coloured pill track with 4px padding; options are 40px pills in muted text. The selected option is navy with white bold text, and its count badge turns lime with navy ink.

### Savings Chart (signature)
Thin full-round navy bars, one per settled round, on a hairline baseline with round numbers beneath in 11px muted text. The newest bar is lime and carries a navy tooltip with the percentage and round number. Plain markup, no chart library; a visually hidden table carries the data for screen readers.

### Progress Ring
A 48px ring with a 5px stroke: hairline track, navy arc with round caps, the percentage in 11px bold at the centre. Decorative; the row text repeats the number.

### Staple Tiles
Each staple's cut-out image sits on a circular disc in its own pastel. On the overview the card is white with a three-up PIHPS / last price / below-PIHPS readout; on the warung page the whole item card takes the pastel with a faint inset ring and a savings strip (PIHPS struck through, paid price in Olive Ink, a thin navy progress bar).

### Notices and Status Rows
Notices are 12px-radius soft fills in their tone with a drawn icon and a faint inset ring. Round status rows pair a 44px circular icon tile in the tone's wash with a title, a muted sub-line and a count chip.

### Chat Bubbles
Owner messages sit right on a 45% lime fill with navy text; agent messages sit left on white with the card-edge shadow. Both are 16px radius with the corner nearest the speaker tightened.

### Motion
Colour and border transitions run 150-200ms ease-out. Live data settles in once (240ms, 6px rise, expo ease-out). A live dot pulses an olive ring. All motion collapses under reduced-motion.

## Do's and Don'ts

### Do:
- **Do** put navy ink on every lime fill; lime on navy is 13:1.
- **Do** use Olive Ink (#435a00) whenever the accent has to be text on a light surface.
- **Do** add the `on-dark` class to every navy surface so the focus ring turns lime.
- **Do** keep cards white and borderless on the warm canvas, at 20px radius.
- **Do** use navy for chart bars, ring arcs and selected states, and reserve lime for the single newest or current item.
- **Do** keep the four food pastels on staple tiles and item cards only.
- **Do** pair every state colour with a word or icon: lavender in progress, lime done, amber waiting, red failed.
- **Do** keep tap targets at 44px or more.

### Don't:
- **Don't** set lime as text, a ring or a stroke on white or the canvas.
- **Don't** use gradients, glows or radial washes.
- **Don't** add borders to cards or chips.
- **Don't** nest a panel inside a panel.
- **Don't** set muted text on a fill darker than the canvas; it is already down to 4.98:1 there.
- **Don't** use a pastel to mean a state; pastels mean an item.
