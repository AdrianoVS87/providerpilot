"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getReviewQueue, submitReview } from "@/lib/api";

interface ArtifactMeta {
  id: string;
  artifact_url: string;
  bytes: number;
  artifact_type: string;
}

interface ReviewItem {
  id: string;
  onboarding_id: string;
  step_id: string;
  agent_name: string;
  reason: string;
  original_output: Record<string, unknown> | string | null;
  reviewer_action: string | null;
  provider_name: string;
  state: string;
  created_at: string;
  artifacts?: ArtifactMeta[];
}

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadQueue = () => {
    getReviewQueue().then((data) => { setItems(data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadQueue(); }, []);

  const handleAction = async (item: ReviewItem, action: string) => {
    setActing(item.id);
    try {
      await submitReview(item.onboarding_id, action, `Reviewed via dashboard`);
      loadQueue();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">PP</div>
              <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            </a>
            <Badge variant="secondary" className="text-xs">Human Review</Badge>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">Intake</a>
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Human Review Queue</h2>
          <p className="text-slate-400">
            Items flagged by the ConfidenceGate (score &lt; 0.9). Review, approve, or reject specialist outputs.
          </p>
        </div>

        {loading ? (
          <div className="text-slate-400 animate-pulse">Loading review queue...</div>
        ) : items.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-lg text-white font-medium">Queue Empty</div>
              <div className="text-sm text-slate-400">All specialist outputs passed the confidence threshold.</div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{item.provider_name} — {item.state}</CardTitle>
                      <div className="text-sm text-slate-400 mt-1">
                        Agent: <span className="text-white">{item.agent_name}</span> · {item.reason}
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Review</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.original_output && (
                    <pre className="text-xs text-slate-400 bg-slate-800/50 rounded p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
                      {typeof item.original_output === "string" ? item.original_output : JSON.stringify(item.original_output, null, 2)}
                    </pre>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 min-h-[44px]"
                      disabled={acting === item.id} onClick={() => handleAction(item, "approve")}>
                      ✅ Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="min-h-[44px]"
                      disabled={acting === item.id} onClick={() => handleAction(item, "reject")}>
                      ❌ Reject
                    </Button>
                    <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 min-h-[44px]"
                      disabled={acting === item.id} onClick={() => handleAction(item, "edit")}>
                      ✏️ Edit & Approve
                    </Button>
                  </div>

                  <div className="mt-3">
                    {item.artifacts?.[0] ? (
                      <a
                        href={item.artifacts[0].artifact_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                      >
                        Download Filled Application ({Math.max(1, Math.round((item.artifacts[0].bytes || 0) / 1024))} KB)
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
