# Shop Layout Principles

These principles capture the approved shop direction from the Pitcher Shop Layout Lab arrangement on 2026-09-13. They apply equally to the batter and pitcher shops.

## Wide desktop composition

- Use a compact, top-aligned three-zone composition: `376px` controls, `408px` Projected Build, and a `560px` item matrix.
- Keep `16px` gutters between the three zones. The full working composition is `1376px`, centered inside the shop's `1400px` maximum width.
- Put Projected Build beside the controls instead of below the equipment. This uses desktop width and avoids a long empty lower page.
- Build the item area as a two-column matrix with a `16px` gutter. At `560px`, each card is `272px` wide.
- Treat Shopping List as the first cell of that matrix, followed by Helmet, Jersey, Gloves, Boots, and Charm in reading order.
- Align the top edge of Controls, Projected Build, Shopping List, and Helmet. Within the item matrix, each left/right pair must share both its top and bottom edge; the taller card defines that row's height.

## Card information design

- Use the same internal four-column grid for headings and data: Stat, Has, Ideal, Diff.
- Give all four columns equal width. Preserve a consistent visual rhythm instead of leaving a large flexible gap between the stat name and numeric columns.
- Left-align every cell inside its equal-width track so each value has a predictable reading edge. Keep numeric values tabular.
- Give Shopping List three left-aligned tracks for stat plus gap, ideal gain, and matching item slots. Use a `1.15fr / 0.85fr / 1fr` balance so the longer stat group gets enough room and the short gain column sits visually midway between it and the item icons.
- Give each Projected Build section four short, fixed numeric headings—Now, Goal, Flat, and Pct—and keep every row on those same tracks.
- Use one centralized abbreviation for genuinely long attribute names; keep ordinary names written out when they fit. The same stat must use the same label rule on every item card.
- Keep Shopping List and Projected Build as single reading sequences. Do not split either into multiple newspaper-style columns.

## Responsive behavior

- Reflow rather than squeeze. Below the wide-desktop breakpoint, stack the control and result zones in reading order.
- On narrower screens, keep Shopping List on its own full-width row so its labels and item icons remain legible.
- Keep item cards in two columns on mobile when they remain readable, and use the shared mobile abbreviations consistently.
- Match heights only inside each left/right card pair. Do not impose one global height across every card or add placeholder rows.

## Shared implementation

- Batter and pitcher shops use the same layout components and spacing rules. Role-specific stats may change the content, but not the visual structure.
- Any future shop-only layout change should be checked in both `/shop` and `/pitcher-shop` at mobile and wide-desktop widths.
