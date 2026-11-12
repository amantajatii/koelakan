---
name: Koelakan
description: Group restocking for warungs, measured against the real market price.
colors:
  ground: "#eef6f2"
  surface: "#ffffff"
  line: "#e3ece8"
  line-strong: "#c9d8d1"
  ink: "#0f2a22"
  muted: "#55665f"
  brand: "#0a7f61"
  brand-hover: "#087458"
  brand-deep: "#08694f"
  brand-soft: "#e3f4ee"
  brand-ink: "#066049"
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
  info: "#1b5e8c"
  info-soft: "#e2f1fb"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.488rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.074rem"
    fontWeight: 800
    lineHeight: "2.4rem"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: "1.7rem"
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.44rem"
    fontWeight: 800
    lineHeight: "1.9rem"
    letterSpacing: "-0.005em"
    fontFeature: "tnum"
  body-lg:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.6rem"
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.35rem"
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
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
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-primary-active:
    backgroundColor: "{colors.brand-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.brand-soft}"
  button-soft:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
  button-on-brand:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  button-on-brand-hover:
    backgroundColor: "{colors.brand-soft}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "44px"
  chip-good:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-neutral:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-bad:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  chip-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.info}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  item-card-rice:
    backgroundColor: "{colors.rice}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "20px"
  item-card-sugar:
    backgroundColor: "{colors.sugar}"
    rounded: "{rounded.card}"
    padding: "20px"
  item-card-eggs:
    backgroundColor: "{colors.eggs}"
    rounded: "{rounded.card}"
    padding: "20px"
  item-card-oil:
    backgroundColor: "{colors.oil}"
    rounded: "{rounded.card}"
    padding: "20px"
  hero-banner:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.display}"
    rounded: "{rounded.card}"
    padding: "36px"
  notice:
    rounded: "{rounded.xl}"
    padding: "12px 14px"
  nav-rail-item-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.2xl}"
    padding: "10px 4px"
  nav-rail-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.2xl}"
    padding: "10px 4px"
  filter-tabs:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.xl}"
    padding: "4px"
  filter-tab-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.lg}"
    height: "40px"
  chat-bubble-agent:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "10px 14px"
  chat-bubble-owner:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "10px 14px"
---

# Design System: Koelakan

## Overview

**Creative North Star: "The Fresh Grocery Counter"**

Koelakan reads as a fresh, modern grocery app for warung owners: soft white cards resting on a pale mint ground, one emerald colour that means "act" or "this is live", and a pastel tint for each of the four staples with cut-out produce imagery on it. Money is the hero of every screen. The signature is the savings strip: the PIHPS market price struck through, the price actually paid in emerald, and a thin bar showing how far below the market it landed.

Density is calm and phone-first. Cards are generous (20-24px inside), tap targets never drop under 44px, and the structure is one column on a phone that opens into a main column plus a 20-22rem side column on a laptop. The ground carries a faint emerald wash in the top-right corner and a faint sky wash in the bottom-left; everything else is flat colour.

The world was chosen against two looks it replaces: the dark crypto dashboard and the kraft-paper, nostalgic ledger. Chain detail is present but tucked away under disclosures, so the surface stays a shop tool, not a block explorer.

**Key Characteristics:**
- Pale mint ground (#eef6f2) with white 20px-radius cards, hairline green-grey border, soft two-layer shadow.
- One emerald (#0a7f61) for actions, selection, the savings figure and the agent's live state.
- Four staple pastels, each paired with a darker same-hue text tint.
- One friendly geometric sans (Figtree) with tabular numerals for every amount, quantity and time.
- Lucide stroke icons only; produce raster cut-outs for the four items and the hero.
- Status always pairs a colour with a word or icon.

## Colors

A cool mint-and-white field, one confident emerald, and four warm-to-cool food pastels that only ever describe an item.

### Primary
- **Market Emerald** (brand): primary buttons, the paid price, the savings bar fill, focus rings, selected states, live dots, checkbox accent and caret.
- **Emerald Hover** (brand-hover) and **Deep Emerald** (brand-deep): hover and pressed primary; Deep Emerald is also the hero banner field so white text sits on it with room to spare.
- **Mint Wash** (brand-soft): the selected-state fill (active rail item, active chat thread, owner bubble), the "good" chip and notice, soft buttons, icon discs, the safety callout.
- **Emerald Ink** (brand-ink): emerald text on light fills (links, chip text, "% below PIHPS", the paid figure).

### Secondary (item pastels)
- **Rice Peach** (rice) with **Rice Clay** text (rice-ink).
- **Sugar Rose** (sugar) with **Sugar Berry** text (sugar-ink).
- **Egg Butter** (eggs) with **Egg Ochre** text (eggs-ink).
- **Oil Sky** (oil) with **Oil Harbour** text (oil-ink).
These fill the staple cards and the round image discs; the ink tint labels the unit, HET and the struck PIHPS price on that card. Unknown items fall back to Mint Wash with Emerald Ink.

### Tertiary (state)
- **Amber Warn** (warn on warn-soft), **Brick Danger** (danger on danger-soft), **Harbour Info** (info on info-soft). Success has no colour of its own; it is the brand emerald.

### Neutral
- **Pale Mint Ground** (ground): page background, table row hover, inactive tab track, neutral chip.
- **Card White** (surface): every panel, input and on-brand button.
- **Hairline** (line) and **Firm Hairline** (line-strong): card borders and dividers; input and secondary-button borders.
- **Forest Ink** (ink): all body text; at 40% it is the modal backdrop; as a fill it backs code blocks.
- **Sage Muted** (muted): secondary text, inactive nav, captions.

### Named Rules
**The One Emerald Rule.** Emerald is the only action colour. It marks what to press, what is selected, what was saved and that the agent is alive; it never decorates.

**The Pastel Belongs To Food Rule.** Rice, sugar, eggs and oil pastels appear only where that item is the subject (its card, its image disc). They are never used for states, sections or generic decoration.

**The Word With Every Colour Rule.** A status colour always ships with text or a drawn icon: chips carry a dot plus a word, notices carry an icon, the savings bar carries "x% below PIHPS".

## Typography

**Display Font:** Figtree (with ui-sans-serif, system-ui)
**Body Font:** Figtree
**Label/Mono Font:** Figtree for labels; ui-monospace only for code and raw contract payloads.

**Character:** One rounded geometric sans across the whole product, warm enough for a shop owner, firm enough for money. Hierarchy comes from weight (400 / 600 / 700 / 800) and a 1.2 ratio scale, never from a second family.

### Hierarchy
- **Display** (800, 2.488rem from sm up, 2.074rem on phones, 1.08 leading, -0.02em): the hero banner h1, usually a sentence stating the saving.
- **Headline** (800, 2.074rem to 2.488rem, -0.02em): page header h1 on routes without a banner.
- **Title** (700, 1.2rem, tight tracking): panel section titles; item card names at 1rem to 1.2rem.
- **Figure** (800, 1.44rem, tabular): the paid price in the savings strip; 2.488rem in its large variant.
- **Body** (400, 0.875rem / 1.35rem): the working size for panels, tables and lists. Lead copy and inputs step up to 1rem / 1.6rem; headers cap lead copy at 42rem.
- **Label** (600, 0.75rem): chips, captions, table heads, field hints. Sentence case, no tracking.

### Named Rules
**The Tabular Money Rule.** Every rupiah amount, quantity, round number and clock time is set with tabular numerals (`.num`: tnum, -0.005em) so columns and before/after prices align.

**The Sentence Case Rule.** Labels, chips and table heads are sentence case at normal tracking. Hierarchy is weight and size, not capitals or letter-spacing.

## Layout

Phone first. Content sits in a centred column capped at 78rem with 16px side padding (32px from 640px). From 1024px a fixed 92px (5.75rem) icon rail with labels occupies the left edge and the content shifts right of it; below 1024px the rail becomes a six-tab bottom bar (56px targets, safe-area inset) and the brand moves into the top bar.

Page structure stacks in 24px (space-y-6) to 32px gaps: banner or page header, then the staple cards, then a two-column band. Two-column bands use a fluid main column with a 20-22rem side column at 1024px, or two equal columns. Staple cards sit two across on phones and four across from 1280px with 12-16px gaps. Inside cards the rhythm is 12px (gap-3) between items, 8px for tight pairs, 16-24px between groups.

Wide tables never push the page sideways: they scroll inside their card on tablet and up, and on phones each row becomes a stacked label/value grid.

## Elevation & Depth

A soft, low hybrid: surfaces are separated by a hairline border plus a diffuse forest-tinted two-layer shadow, and tonal layering (white on mint, mint on white) does the rest. Nothing is lifted far, and nothing uses hard offsets.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(15,42,34,0.04), 0 8px 24px rgba(15,42,34,0.06)`): every panel, item card and the hero banner.
- **Lift** (`0 2px 4px rgba(15,42,34,0.05), 0 14px 32px rgba(15,42,34,0.1)`): modal dialogs only.
- **Press** (`0 1px 2px rgba(8,105,79,0.3)`): under the primary button, and a 0 2px 6px emerald glow under the logo tile.
- **Seat** (`0 1px 3px rgba(15,42,34,0.12)`): the active segment in filter tabs.

### Named Rules
**The Flat Panel Rule.** A panel is never nested inside another panel. Inside a card, group with hairline dividers, a mint inset (ground or brand-soft) or spacing.

**The Glass Only For Chrome Rule.** Backdrop blur appears only on the fixed navigation (rail at 90% white, tab bar at 95% white), never on content.

## Shapes

Soft, rounded and friendly. Containers take a 20px radius (card); buttons, inputs, notices and logo tile take 12px (xl); conversational and navigational items (chat bubbles, rail items, thread rows, error note) take 16px (2xl); segments inside a tab track take 8px. Chips, pills, the account button, image discs, progress bars and status dots are fully round. Chat bubbles cut one corner to 6px on the speaker's side, the only asymmetric shape in the system. Produce always sits in a circle.

## Components

### Buttons
Confident, rounded and tall enough for a thumb.
- **Shape:** gently rounded (12px), min height 44px, 16px side padding, 600 weight at 0.875rem, 8px icon gap.
- **Primary:** Market Emerald with white text and a small emerald press shadow; hover to Emerald Hover, press to Deep Emerald.
- **Secondary:** white with a Firm Hairline border; hover tints Mint Wash with a half-emerald border.
- **Soft:** Mint Wash with Emerald Ink, for secondary actions inside emerald-adjacent content.
- **Ghost:** muted text, Mint Wash on hover.
- **On-brand:** white with Emerald Ink, used on the hero banner and on pastel item cards ("Round #7 →").
- **Danger:** Brick Danger with white text, used only to confirm destructive actions in a dialog.
- **Busy / disabled:** a spinning stroke loader is prepended to the label and the button disables; disabled drops to 50% opacity with a not-allowed cursor.
- **Focus:** global 3px emerald outline, 2px offset.

### Chips
- **Style:** fully round, 2px x 10px, 0.75rem 600, a 1px inset ring of the tone at 20%, and a 6px dot.
- **Tones:** good (Mint Wash / Emerald Ink), neutral (ground / muted), warn, bad, info. The header agent pill is the same form at 36px high and links to Status; its "good" dot pulses (pulse-ring, 1.8s).

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Card White on the mint ground; the safety callout uses Mint Wash with a 15% emerald ring.
- **Shadow Strategy:** Card shadow (see Elevation).
- **Border:** 1px Hairline.
- **Internal Padding:** 20px on phones, 24px from 640px. Section title is Title type with a right-aligned aside, 16px above content.

### Inputs / Fields
- **Style:** white, 1px Firm Hairline, 12px radius, 44px min height, 14px side padding, 1rem tabular text; label above at 0.875rem 600, hint below at 0.75rem muted.
- **Hover / Focus:** border goes half-emerald on hover, full emerald with the emerald outline on focus.
- **Error / Disabled:** `aria-invalid` turns the border Brick Danger; disabled sits on the ground colour at 60% opacity.

### Notices
Inline messages on the soft state fill with a 1px inset ring and a leading stroke icon (check, alert, triangle, info), 12px radius. Chain-load errors use the 16px-radius error note with a retry button.

### Navigation
- **Desktop rail:** 92px white-glass column, logo tile on top, six icon-over-label items (22px stroke icons, 0.72rem 600). Active: Mint Wash fill, Emerald Ink, stroke weight 2.2 versus 1.8.
- **Phone tab bar:** fixed bottom, six columns, 56px targets; active item gets a 28x48px Mint Wash pill behind the icon and Emerald Ink label.
- **Top bar:** testnet note on desktop, brand on phones, agent pill and a round Sign in / account button on the right.

### Filter Tabs
A ground-coloured 12px track with 4px padding holding 40px segments; the active segment turns white with Emerald Ink and a Seat shadow, and carries a Mint Wash count bubble. They filter in place (aria-pressed), they do not navigate.

### Savings Strip (signature)
The proof of the product, on every item card and in large form on round pages: the PIHPS price struck through in the item's ink tint (or muted on white), the paid price in Emerald Ink at Figure weight with a small "/kg", a 6px (10px large) fully round bar whose emerald fill width is the percent below PIHPS (min 2%), and "x% below PIHPS" beneath. With nothing settled it shows the PIHPS price and an empty track with a plain sentence saying the first round will fill it.

### Staple Item Card
A pastel card in the item's tint with a faint inner ring, a round produce disc (44px on phones, 80px from 640px), the item name and a "per kg · HET" line in the item ink, the savings strip, then a divider and the quantity line with an on-brand button to the round behind the numbers.

### Hero Banner
A Deep Emerald 20px card with a white highlight wash top-right and a dark wash bottom-left, Display h1 and pale-mint lead copy on the left half, and the produce hero cut-out anchored bottom-right from 640px. Actions are on-brand primary plus a translucent white secondary. It is each page's h1.

### Chat Bubbles
WhatsApp-style thread on a ground-tinted well. Agent bubbles are white with a hairline border, owner bubbles are Mint Wash; both 16px radius with the speaker-side bottom corner cut to 6px, 0.94rem text, an optional event chip, and a tabular timestamp with a read tick.

### Produce Imagery
Photographic cut-out rasters (rice, sugar, eggs, oil, hero) with embedded provenance, always on a round disc (white 70% on the item pastel, or the pastel itself). A Lucide stroke icon in the item ink stands in until the image decodes.

## Do's and Don'ts

### Do:
- **Do** keep emerald (#0a7f61) for actions, selection, the paid price and live state; use Mint Wash (#e3f4ee) for selected fills.
- **Do** show a saving as the savings strip: PIHPS struck, paid in emerald, bar, "% below PIHPS".
- **Do** set every amount, quantity and time with tabular numerals.
- **Do** keep tap targets at 44px or more (56px in the tab bar) and keep the 3px emerald focus outline.
- **Do** pair every status colour with a word or a drawn stroke icon.
- **Do** turn wide tables into stacked label/value rows on phones.
- **Do** keep motion short and from a visible default: 150-200ms ease-out for state, a 240ms rise for arriving live data, and honour reduced motion.

### Don't:
- **Don't** drift toward the dark crypto dashboard or the kraft-paper, nostalgic ledger look this world replaces.
- **Don't** use the item pastels for anything other than their item.
- **Don't** nest a white panel inside another panel.
- **Don't** introduce a second typeface, uppercase tracked labels, or a second icon library.
- **Don't** use hard offset shadows or heavy lifts; modals are the only Lift.
- **Don't** put raw chain detail (hashes, tx payloads) in the first read; reveal it in a disclosure.
