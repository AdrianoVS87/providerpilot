import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://82.25.76.54:4001";

// Vercel serverless function config
export const maxDuration = 60; // seconds
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = path.join("/");
  const url = `${BACKEND_URL}/${apiPath}`;

  try {
    // SSE stream
    if (apiPath.includes("/stream")) {
      const backendRes = await fetch(url, {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(55000),
      });
      return new Response(backendRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[proxy] GET ${url} failed:`, err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err), url },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = path.join("/");
  const url = `${BACKEND_URL}/${apiPath}`;

  try {
    const body = await request.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[proxy] POST ${url} failed:`, err);
    return NextResponse.json(
      { error: "Backend unreachable", detail: String(err), url },
      { status: 502 }
    );
  }
}
