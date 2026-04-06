import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COMING_SOON_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DrakeForge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0e17;
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 3rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }
    .link {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #00e5ff;
      color: #0a0e17;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      transition: opacity 0.2s;
    }
    .link:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="container">
    <h1>DrakeForge</h1>
    <p class="subtitle">Coming soon.</p>
    <a href="/pop" class="link">POP: Player Optimization Planner</a>
  </div>
</body>
</html>`;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return new NextResponse(COMING_SOON_HTML, {
      headers: { "Content-Type": "text/html" },
    });
  }
}

export const config = {
  matcher: "/",
};
