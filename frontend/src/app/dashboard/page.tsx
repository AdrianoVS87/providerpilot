"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMetrics, type Metrics } from "@/lib/api";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [costView, setCostView] = useState<"estimated" | "billed">("estimated");

  useEffect(() => {
    getMetrics().then(setMetrics).catch(console.error);
    const interval = setInterval(() => getMetrics().then(setMetrics).catch(() => {}), 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">PP</div>
              <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            </a>
            <Badge variant="secondary" className="text-xs">Dashboard</Badge>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">Intake</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
            <a href="/review" className="text-slate-400 hover:text-white transition">Review Queue</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h2 className="text-3xl font-bold text-white mb-8">System Dashboard</h2>

        {!metrics ? (
          <div className="text-slate-400 animate-pulse">Loading metrics...</div>
        ) : (
          <>
            {/* Cost disclosure + selector */}
            <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-amber-300 text-sm font-medium">Cost Mode: {metrics.costMode.toUpperCase()} ({metrics.costAccuracy})</div>
                  <div className="text-amber-100/80 text-xs mt-1">{metrics.costNote}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCostView("estimated")}
                    className={`px-3 py-1.5 rounded-md text-xs border transition ${
                      costView === "estimated"
                        ? "bg-amber-400/20 border-amber-300/40 text-amber-200"
                        : "bg-transparent border-amber-500/20 text-amber-100/60"
                    }`}
                  >
                    Estimated
                  </button>
                  <button
                    onClick={() => setCostView("billed")}
                    className={`px-3 py-1.5 rounded-md text-xs border transition ${
                      costView === "billed"
                        ? "bg-amber-400/20 border-amber-300/40 text-amber-200"
                        : "bg-transparent border-amber-500/20 text-amber-100/60"
                    }`}
                  >
                    Billed
                  </button>
                </div>
              </div>
              {costView === "billed" && metrics.costViews.billed.totalUsd === null && (
                <div className="text-amber-200/80 text-xs mt-2">
                  Billed cost is not reconciled yet (coverage {metrics.costViews.billed.coveragePct}%).
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-white">{metrics.totalOnboardings}</div>
                  <div className="text-xs text-slate-500">Total Onboardings</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-green-400">{metrics.completed}</div>
                  <div className="text-xs text-slate-500">Completed</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{metrics.inProgress}</div>
                  <div className="text-xs text-slate-500">In Progress</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{metrics.reviewNeeded}</div>
                  <div className="text-xs text-slate-500">Review Needed</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-white">{metrics.avgConfidence ? `${(metrics.avgConfidence * 100).toFixed(0)}%` : "—"}</div>
                  <div className="text-xs text-slate-500">Avg Confidence</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {costView === "estimated"
                      ? `$${metrics.costViews.estimated.avgUsd.toFixed(4)}`
                      : (metrics.costViews.billed.avgUsd !== null ? `$${metrics.costViews.billed.avgUsd.toFixed(4)}` : "—")}
                  </div>
                  <div className="text-xs text-slate-500">Avg {costView === "estimated" ? "Estimated" : "Billed"} Cost</div>
                </CardContent>
              </Card>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-white">{metrics.totalTokens.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">Total {costView === "estimated" ? "Estimated" : "Billed"} Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-400">
                    {costView === "estimated"
                      ? `$${metrics.costViews.estimated.totalUsd.toFixed(4)}`
                      : (metrics.costViews.billed.totalUsd !== null ? `$${metrics.costViews.billed.totalUsd.toFixed(4)}` : "—")}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-400">Review Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-yellow-400">{metrics.reviewQueueSize}</div>
                </CardContent>
              </Card>
            </div>

            {/* By State */}
            {metrics.byState.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Onboardings by State</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {metrics.byState.map((s) => (
                      <div key={s.state} className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-white">{s.state}</div>
                        <div className="text-sm text-slate-400">{s.count} onboarding{s.count !== 1 ? "s" : ""}</div>
                        {s.avgConfidence && (
                          <div className="text-xs text-slate-500">{(s.avgConfidence * 100).toFixed(0)}% avg confidence</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
