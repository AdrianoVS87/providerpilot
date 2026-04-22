"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getReviewQueue, getReviewHistory, submitReview, reopenReviewItem, deleteReviewHistoryItem } from "@/lib/api";

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
  reviewer_notes?: string | null;
  reviewed_at?: string | null;
  provider_name: string;
  state: string;
  created_at: string;
  artifacts?: ArtifactMeta[];
}

export default function ReviewPage() {
  const [pending, setPending] = useState<ReviewItem[]>([]);
  const [history, setHistory] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<Record<string, string>>({});

  const loadAll = () => {
    Promise.all([getReviewQueue(), getReviewHistory()])
      .then(([q, h]) => {
        setPending(q);
        setHistory(h);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const startEditDraft = (item: ReviewItem) => {
    const fallback = typeof item.original_output === "string"
      ? item.original_output
      : JSON.stringify(item.original_output ?? {}, null, 2);
    const initial = item.reviewer_notes && item.reviewer_notes.trim().length > 0 ? item.reviewer_notes : fallback;
    setDraftText((prev) => ({ ...prev, [item.id]: prev[item.id] ?? initial }));
    setEditingId(item.id);
  };

  const saveDraft = async (item: ReviewItem) => {
    setActing(item.id);
    try {
      const note = draftText[item.id] || "Edited draft";
      await submitReview(item.onboarding_id, "edit", note, item.step_id);
      alert("Draft saved. Item remains in Pending until Approve or Reject.");
      setEditingId(null);
      setTimeout(() => loadAll(), 250);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save draft failed";
      alert(msg);
    } finally {
      setActing(null);
    }
  };

  const handleAction = async (item: ReviewItem, action: string) => {
    setActing(item.id);
    try {
      if (action === "reject") {
        const ok = confirm("Are you sure you want to reject this item? It will move to Review History.");
        if (!ok) return;
      }
      if (action === "approve") {
        const ok = confirm("Approve this item and remove it from Pending?");
        if (!ok) return;
      }
      if (action === "edit") {
        startEditDraft(item);
        return;
      }

      await submitReview(item.onboarding_id, action, "Reviewed via dashboard", item.step_id);

      {
        // Approve/Reject: remove from pending and add to history
        setPending((prev) => prev.filter((i) => i.id !== item.id));
        setHistory((prev) => [{ ...item, reviewer_action: action, reviewed_at: new Date().toISOString() }, ...prev]);
        setTimeout(() => loadAll(), 400);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Review action failed";
      alert(`Failed to ${action}: ${msg}`);
    } finally {
      setActing(null);
    }
  };

  const handleReopen = async (item: ReviewItem) => {
    setActing(item.id);
    try {
      const ok = confirm("Move this item back to Pending so you can edit/approve again?");
      if (!ok) return;
      await reopenReviewItem(item.id);
      setHistory((prev) => prev.filter((i) => i.id !== item.id));
      setPending((prev) => [item, ...prev]);
      setTimeout(() => loadAll(), 300);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reopen failed";
      alert(msg);
    } finally {
      setActing(null);
    }
  };

  const handlePermanentDelete = async (item: ReviewItem) => {
    setActing(item.id);
    try {
      const token = prompt("Type DELETE to permanently remove this history item:");
      if (token !== "DELETE") {
        alert("Deletion cancelled. Exact token not provided.");
        return;
      }
      await deleteReviewHistoryItem(item.id);
      setHistory((prev) => prev.filter((i) => i.id !== item.id));
      setTimeout(() => loadAll(), 250);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Permanent delete failed";
      alert(msg);
    } finally {
      setActing(null);
    }
  };

  const items = view === "pending" ? pending : history;

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
          <nav className="hidden md:flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">Intake</a>
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Human Review</h2>
          <p className="text-slate-400">Pending items are actionable. Processed items are kept in history for audit.</p>
        </div>

        {/* View selector */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setView("pending")}
            className={`px-3 py-2 rounded-md text-sm border ${view === "pending" ? "bg-blue-500/20 border-blue-400/50 text-blue-200" : "bg-slate-900/50 border-slate-700 text-slate-400"}`}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-3 py-2 rounded-md text-sm border ${view === "history" ? "bg-blue-500/20 border-blue-400/50 text-blue-200" : "bg-slate-900/50 border-slate-700 text-slate-400"}`}
          >
            Review History ({history.length})
          </button>
        </div>

        {loading ? (
          <div className="text-slate-400 animate-pulse">Loading review data...</div>
        ) : items.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-lg text-white font-medium">{view === "pending" ? "Pending Queue Empty" : "No Review History Yet"}</div>
              <div className="text-sm text-slate-400">
                {view === "pending"
                  ? "All specialist outputs have been actioned."
                  : "Processed review actions will appear here."}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <CardTitle className="text-white text-lg">{item.provider_name} — {item.state}</CardTitle>
                      <div className="text-sm text-slate-400 mt-1">
                        Agent: <span className="text-white">{item.agent_name}</span> · {item.reason}
                      </div>
                    </div>
                    {view === "pending" ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending Review</Badge>
                    ) : item.reviewer_action === "reject" ? (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">REJECTED</Badge>
                    ) : item.reviewer_action === "approve" ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">APPROVED</Badge>
                    ) : (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">EDITED</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {item.original_output && (
                    <pre className="text-xs text-slate-400 bg-slate-800/50 rounded p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
                      {typeof item.original_output === "string" ? item.original_output : JSON.stringify(item.original_output, null, 2)}
                    </pre>
                  )}

                  {item.reviewer_notes && item.reviewer_notes.trim().length > 0 && (
                    <div className="mb-4 rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                      <div className="text-[11px] text-blue-300 mb-1">Saved Draft Notes</div>
                      <pre className="text-xs text-blue-100/90 whitespace-pre-wrap">{item.reviewer_notes}</pre>
                    </div>
                  )}

                  {view === "pending" && editingId === item.id && (
                    <div className="mb-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                      <div className="text-xs text-blue-300 mb-2">Draft Editor (does not approve)</div>
                      <textarea
                        className="w-full min-h-[140px] rounded-md border border-slate-700 bg-slate-900/70 p-2 text-xs text-slate-200"
                        value={draftText[item.id] || ""}
                        onChange={(e) => setDraftText((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 min-h-[44px]" disabled={acting === item.id} onClick={() => saveDraft(item)}>
                          Save Draft
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-[44px] border-slate-700 text-slate-300" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {view === "pending" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 min-h-[44px]"
                        disabled={acting === item.id} onClick={() => handleAction(item, "edit")}>
                        {editingId === item.id ? "✏️ Editing…" : "✏️ Edit Draft"}
                      </Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 min-h-[44px]"
                        disabled={acting === item.id} onClick={() => handleAction(item, "approve")}>
                        ✅ Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="min-h-[44px]"
                        disabled={acting === item.id} onClick={() => handleAction(item, "reject")}>
                        ❌ Reject
                      </Button>
                    </div>
                  ) : (
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-500/40 text-blue-300 min-h-[44px]"
                        disabled={acting === item.id}
                        onClick={() => handleReopen(item)}
                      >
                        {item.reviewer_action === "approve" ? "↩ Undo Approve" : "↩ Reopen to Pending"}
                      </Button>

                      {item.reviewer_action === "reject" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="min-h-[44px]"
                          disabled={acting === item.id}
                          onClick={() => handlePermanentDelete(item)}
                        >
                          🗑 Permanently Remove
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="mt-1">
                    {item.artifacts?.[0] ? (
                      <a
                        href={item.artifacts[0].artifact_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                      >
                        Download Filled Application ({Math.max(1, Math.round((item.artifacts[0].bytes || 0) / 1024))} KB)
                      </a>
                    ) : item.agent_name.includes("FormFiller") ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex min-h-[44px] items-center rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs text-slate-400"
                      >
                        Generating…
                      </button>
                    ) : (
                      <span className="inline-flex min-h-[44px] items-center rounded-md border border-slate-700 bg-slate-800/20 px-3 py-2 text-xs text-slate-500">
                        No filled application artifact for this step
                      </span>
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
