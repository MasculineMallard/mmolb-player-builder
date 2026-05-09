@AGENTS.md

## Layout Rules

**No dead space.** Cards, panels, and UI elements must not have excess padding, empty placeholder rows, or vertical gaps that serve no purpose. Content should fill its container. If a card only has 2 rows of data, it should be 2 rows tall, not padded to match a 5-row card.

## Visual Verification

**Always verify visual changes with Playwright before reporting them as done.** Use headless Chromium to screenshot the affected component and inspect it yourself. Do not tell the user a visual change is ready until you have confirmed it looks correct via screenshot. Use element-level screenshots (`locator.screenshot()`) when possible for detail.
