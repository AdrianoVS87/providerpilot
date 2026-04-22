"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatus, streamStatus, type OnboardingStatus, type OnboardingStep, type ArtifactMeta } from "@/lib/api";

function statusColor(status: string) {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "in_progress": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "review_needed": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function agentIcon(agent: string) {
  if (agent.startsWith("CEO")) return "👔";
  if (agent.startsWith("COO")) return "📊";
  if (agent.includes("VP-Licensing")) return "📋";
  if (agent.includes("VP-Compliance")) return "⚖️";
  if (agent.includes("VP-Comm")) return "📧";
  if (agent.includes("VP-Quality")) return "🎯";
  if (agent.startsWith("Director")) return "🏛️";
  if (agent.includes("DocExtractor")) return "📄";
  if (agent.includes("ComplianceChecker")) return "✅";
  if (agent.includes("FormFiller")) return "📝";
  if (agent.includes("CoachWriter")) return "💬";
  if (agent.includes("ConfidenceGate")) return "🔒";
  if (agent.includes("CostMonitor")) return "💰";
  if (agent.includes("SafetyAuditor")) return "🛡️";
  if (agent.includes("RegressionTester")) return "🧪";
  return "🤖";
}

function agentPhase(agent: string): string {
  if (agent.startsWith("CEO")) return "Intake";
  if (agent.includes("VP-")) return "Routing";
  if (agent.startsWith("Director")) return "Dispatch";
  if (agent.includes("DocExtractor") || agent.includes("ComplianceChecker") || agent.includes("FormFiller") || agent.includes("CoachWriter")) return "Specialist";
  if (agent.includes("ConfidenceGate")) return "Validation";
  if (agent.includes("CostMonitor")) return "Budget";
  return "Processing";
}

function StepCard({ step }: { step: OnboardingStep }) {
  const [expanded, setExpanded] = useState(false);
  const phase = agentPhase(step.agent);
  const isFormFiller = step.agent.includes("FormFiller");
  const artifact = step.artifacts?.[0] as ArtifactMeta | undefined;

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          step.status === "completed" ? "bg-green-900/50 border border-green-500/30" :
          step.status === "in_progress" ? "bg-blue-900/50 border border-blue-500/30 animate-pulse" :
          "bg-slate-800 border border-slate-700"
        }`}>
          {agentIcon(step.agent)}
        </div>
        {<div className="w-px h-full bg-slate-800 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div
        className="flex-1 border border-slate-800 rounded-lg p-4 bg-slate-900/30 cursor-pointer hover:border-slate-700 transition mb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{step.agent}</span>
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">{phase}</Badge>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{step.action.replace(/_/g, " ")}</div>
          </div>
          <div className="flex items-center gap-3">
            {step.confidence !== null && (
              <div className="text-right">
                <span className={`text-sm font-mono font-bold ${step.confidence >= 0.9 ? "text-green-400" : step.confidence >= 0.8 ? "text-yellow-400" : "text-red-400"}`}>
                  {(step.confidence * 100).toFixed(1)}%
                </span>
                <div className="text-[10px] text-slate-600">confidence</div>
              </div>
            )}
            {step.tokens > 0 && (
              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono">{step.tokens}</span>
                <div className="text-[10px] text-slate-600">tokens</div>
              </div>
            )}
            <Badge className={statusColor(step.status)}>
              {step.status === "in_progress" && <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse mr-1.5" />}
              {step.status}
            </Badge>
          </div>
        </div>

        {/* Duration */}
        {step.startedAt && step.completedAt && (
          <div className="text-[10px] text-slate-600 mt-1">
            Duration: {((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1)}s
          </div>
        )}

        {/* Artifact download (FormFiller only) */}
        {isFormFiller && (
          <div className="mt-3">
            {artifact ? (
              <a
                href={artifact.artifact_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
              >
                Download Filled Application ({Math.max(1, Math.round((artifact.bytes || 0) / 1024))} KB)
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-[44px] items-center rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs text-slate-400"
              >
                Generating…
              </button>
            )}
          </div>
        )}

        {expanded && step.output && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <pre className="text-xs text-slate-400 overflow-auto max-h-60 whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setRefreshCount] = useState(0);

  const fetchData = useCallback(() => {
    getStatus(id).then(setData).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    fetchData();
    const unsub = streamStatus(id, () => {
      setRefreshCount((c) => c + 1);
      fetchData();
    });
    const interval = setInterval(fetchData, 3000);
    return () => { unsub(); clearInterval(interval); };
  }, [id, fetchData]);

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-slate-400">Loading onboarding status...</div>
        </div>
      </div>
    );
  }

  const completedSteps = data.steps.filter((s) => s.status === "completed").length;
  const totalSteps = data.steps.length;
  const progressPct = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const duration = data.steps.length > 0 && data.steps[0].startedAt
    ? ((new Date(data.updatedAt).getTime() - new Date(data.steps[0].startedAt).getTime()) / 1000).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">PP</div>
              <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            </a>
          </div>
          <nav className="hidden md:flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">New Intake</a>
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
            <a href="/review" className="text-slate-400 hover:text-white transition">Review</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Summary Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-white">{data.providerName}</h2>
            <Badge className={`${statusColor(data.status)} text-sm`}>
              {data.status === "in_progress" && <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2" />}
              {data.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm">
            State: <span className="text-white font-medium">{data.state}</span> · ID: <code className="text-xs text-slate-500">{data.onboardingId.slice(0, 8)}...</code>
          </p>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{completedSteps}/{totalSteps} steps complete</span>
              {duration && <span>Total: {duration}s</span>}
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.status === "completed" ? "bg-green-500" :
                  data.status === "review_needed" ? "bg-yellow-500" :
                  "bg-blue-500"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
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
              <div className={`text-2xl font-bold ${
                data.confidence && data.confidence >= 0.9 ? "text-green-400" :
                data.confidence && data.confidence >= 0.8 ? "text-yellow-400" : "text-white"
              }`}>
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

        {/* Agent Execution Timeline */}
        <Card className="bg-slate-900/50 border-slate-800 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                Agent Execution Timeline
                {data.status === "in_progress" && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </CardTitle>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 text-xs" onClick={fetchData}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              {data.steps.map((step) => (
                <StepCard key={step.id} step={step} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
