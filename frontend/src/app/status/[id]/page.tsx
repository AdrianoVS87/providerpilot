"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStatus, streamStatus, type OnboardingStatus, type OnboardingStep } from "@/lib/api";

function statusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "in_progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse";
    case "review_needed": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function agentIcon(agent: string) {
  if (agent.startsWith("CEO")) return "👔";
  if (agent.startsWith("VP")) return "📋";
  if (agent.startsWith("Director")) return "🏛️";
  if (agent.includes("DocExtractor")) return "📄";
  if (agent.includes("ComplianceChecker")) return "✅";
  if (agent.includes("FormFiller")) return "📝";
  if (agent.includes("CoachWriter")) return "💬";
  if (agent.includes("ConfidenceGate")) return "🔒";
  if (agent.includes("CostMonitor")) return "💰";
  return "🤖";
}

function StepCard({ step }: { step: OnboardingStep }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="border border-slate-800 rounded-lg p-4 bg-slate-900/30 cursor-pointer hover:border-slate-700 transition"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{agentIcon(step.agent)}</span>
          <div>
            <div className="font-medium text-white text-sm">{step.agent}</div>
            <div className="text-xs text-slate-500">{step.action.replace(/_/g, " ")}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step.confidence !== null && (
            <span className={`text-xs font-mono ${step.confidence >= 0.9 ? "text-green-400" : "text-yellow-400"}`}>
              {(step.confidence * 100).toFixed(1)}%
            </span>
          )}
          {step.tokens > 0 && (
            <span className="text-xs text-slate-600">{step.tokens} tok</span>
          )}
          <Badge className={statusColor(step.status)}>{step.status}</Badge>
        </div>
      </div>
      {expanded && step.output && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <pre className="text-xs text-slate-400 overflow-auto max-h-60 whitespace-pre-wrap">
            {JSON.stringify(step.output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<OnboardingStatus | null>(null);
  const [liveSteps, setLiveSteps] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStatus(id).then(setData).catch((e) => setError(e.message));

    const unsub = streamStatus(id, (event) => {
      setLiveSteps((prev) => [...prev, event]);
      // Refresh full status every 5 events
      getStatus(id).then(setData).catch(() => {});
    });

    // Poll every 5s for updates
    const interval = setInterval(() => {
      getStatus(id).then(setData).catch(() => {});
    }, 5000);

    return () => { unsub(); clearInterval(interval); };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900 border-red-900/50 max-w-md">
          <CardContent className="pt-6 text-red-400">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading onboarding status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">PP</div>
              <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            </a>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">New Intake</a>
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Summary */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-white">{data.providerName}</h2>
            <Badge className={statusColor(data.status)}>{data.status}</Badge>
          </div>
          <p className="text-slate-400">State: {data.state} · Onboarding ID: <code className="text-xs text-slate-500">{data.onboardingId}</code></p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-white">{data.steps.length}</div>
              <div className="text-xs text-slate-500">Steps</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-white">
                {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : "—"}
              </div>
              <div className="text-xs text-slate-500">Confidence</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-white">{data.cost.totalTokens.toLocaleString()}</div>
              <div className="text-xs text-slate-500">Tokens</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-bold text-green-400">${data.cost.totalUsd.toFixed(4)}</div>
              <div className="text-xs text-slate-500">Cost USD</div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Timeline */}
        <Card className="bg-slate-900/50 border-slate-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Agent Execution Timeline
              {data.status === "in_progress" && (
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Events */}
        {liveSteps.length > 0 && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Live Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-40 overflow-auto">
                {liveSteps.map((e, i) => (
                  <div key={i} className="text-xs text-slate-500 font-mono">
                    {JSON.stringify(e)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
