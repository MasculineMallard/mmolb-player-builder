@AGENTS.md

## Visual Verification

**Always verify visual changes with Playwright before reporting them as done.** Use headless Chromium to screenshot the affected component and inspect it yourself. Do not tell the user a visual change is ready until you have confirmed it looks correct via screenshot. Use element-level screenshots (`locator.screenshot()`) when possible for detail.
