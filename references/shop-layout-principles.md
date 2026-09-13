# Shop Layout Principles

These principles capture the approved shop direction from the Pitcher Shop Layout Lab arrangement on 2026-09-13. They apply equally to the batter and pitcher shops.

## Wide desktop composition

- Use a compact, top-aligned three-zone composition: `376px` controls, `408px` Projected Build, and a `560px` item matrix.
- Keep `16px` gutters between the three zones. The full working composition is `1376px`, centered inside the shop's `1400px` maximum width.
- Put Projected Build beside the controls instead of below the equipment. This uses desktop width and avoids a long empty lower page.
- Build the item area as a two-column matrix with a `16px` gutter. At `560px`, each card is `272px` wide.
- Treat Shopping List as the first cell of that matrix, followed by Helmet, Jersey, Gloves, Boots, and Charm in reading order.
- Align the top edge of Controls, Projected Build, Shopping List, and Helmet. Let card heights follow their content; do not stretch short cards merely to fill a row.

## Card information design

- Use the same internal four-column grid for headings and data: Stat, Has, Ideal, Diff.
- Give all four columns equal width. Preserve a consistent visual rhythm instead of leaving a large flexible gap between the stat name and numeric columns.
- Left-align the stat label and right-align tabular numeric values so comparisons remain quick.
- Use one centralized abbreviation for genuinely long attribute names; keep ordinary names written out when they fit. The same stat must use the same label rule on every item card.
- Keep Shopping List and Projected Build as single reading sequences. Do not split either into multiple newspaper-style columns.

## Responsive behavior

- Reflow rather than squeeze. Below the wide-desktop breakpoint, stack the control and result zones in reading order.
- On narrower screens, keep Shopping List on its own full-width row so its labels and item icons remain legible.
- Keep item cards in two columns on mobile when they remain readable, and use the shared mobile abbreviations consistently.
- Avoid equal-height stretching and placeholder space at every breakpoint; compact cards should end with their content.

## Shared implementation

- Batter and pitcher shops use the same layout components and spacing rules. Role-specific stats may change the content, but not the visual structure.
- Any future shop-only layout change should be checked in both `/shop` and `/pitcher-shop` at mobile and wide-desktop widths.
