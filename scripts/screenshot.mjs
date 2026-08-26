// Visual-verification step for `npm run verify`.
// Starts the built app, screenshots the home page with headless Chromium, and
// exits non-zero if anything fails. Run after `next build`.
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { chromium } from "playwright";

const PORT = process.env.VERIFY_PORT || "3100";
const BASE = `http://localhost:${PORT}`;
// App is served under next.config basePath; the home page lives there, not at /.
const BASE_PATH = process.env.VERIFY_PATH ?? "/pop";
const TARGET = `${BASE}${BASE_PATH}`;
const OUT = process.env.VERIFY_SHOT || "verify-screenshot.png";
const NEXT_BIN = path.join("node_modules", "next", "dist", "bin", "next");

function startServer() {
  // Spawn node + the Next bin directly (no shell/.cmd — avoids Windows EINVAL).
  const child = spawn(process.execPath, [NEXT_BIN, "start", "-p", PORT], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return child;
}

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(TARGET);
      if (res.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  return false;
}

function stopServer(child) {
  if (!child || child.pid == null) return;
  // Synchronous kill so the Next worker child is gone before process.exit().
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

let server;
let exitCode = 1;
try {
  server = startServer();
  if (!(await waitForServer())) throw new Error(`server never became ready at ${TARGET}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const res = await page.goto(TARGET, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1500); // let hydration/render settle
  await page.screenshot({ path: OUT, fullPage: true });
  await browser.close();

  // Authoritative gate: a 4xx/5xx means the target didn't render (404 / basePath drift
  // / crash). Visual correctness is left to the screenshot for the agent to eyeball.
  const status = res ? res.status() : 0;
  if (status < 200 || status >= 400) {
    throw new Error(`home did not render at ${TARGET} (HTTP ${status}) — see ${OUT}`);
  }

  console.log(`✓ home rendered at ${TARGET} (HTTP ${status}); screenshot -> ${OUT}`);
  exitCode = 0;
} catch (err) {
  console.error(`✗ screenshot step failed: ${err.message}`);
} finally {
  stopServer(server);
}
process.exit(exitCode);
