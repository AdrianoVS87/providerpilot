"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAgents } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  role: string;
  title: string;
  status: string;
  capabilities: string;
  reportsTo: string | null;
  lastHeartbeatAt: string | null;
}

function roleColor(role: string) {
  switch (role) {
    case "ceo": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "cto": return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
    case "cmo": return "bg-pink-500/20 text-pink-400 border-pink-500/30";
    case "cfo": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "pm": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "qa": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "engineer": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "designer": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "researcher": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function tierLabel(name: string): string {
  if (name.startsWith("CEO") || name.startsWith("COO")) return "Executive";
  if (name.startsWith("VP")) return "Department Head";
  if (name.startsWith("Director")) return "State Director";
  if (name.includes("Gate") || name.includes("Tester") || name.includes("Monitor") || name.includes("Auditor")) return "Validator";
  return "Specialist";
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgents().then((data) => { setAgents(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const tiers = ["Executive", "Department Head", "State Director", "Specialist", "Validator"];
  const grouped = tiers.map((tier) => ({
    tier,
    agents: agents.filter((a) => tierLabel(a.name) === tier),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">PP</div>
              <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            </a>
            <Badge variant="secondary" className="text-xs">Org Chart</Badge>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-slate-400 hover:text-white transition">Intake</a>
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/review" className="text-slate-400 hover:text-white transition">Review Queue</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">40-Agent Org Chart</h2>
          <p className="text-slate-400">
            Structured as a company: Executives → VPs → State Directors → Specialists → Validators.
            All agents run heartbeats via MiniMax M2.7 (free tier).
          </p>
        </div>

        {loading ? (
          <div className="text-slate-400 animate-pulse">Loading 40 agents...</div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ tier, agents: tierAgents }) => (
              <div key={tier}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-white">{tier}</h3>
                  <Badge variant="outline" className="border-slate-700 text-slate-400">{tierAgents.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {tierAgents.map((agent) => (
                    <Card key={agent.id} className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm text-white">{agent.name}</CardTitle>
                          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Active" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Badge className={`text-xs ${roleColor(agent.role)}`}>{agent.role}</Badge>
                          {agent.title && (
                            <div className="text-xs text-slate-500">{agent.title}</div>
                          )}
                          {agent.capabilities && (
                            <div className="text-xs text-slate-600 line-clamp-2">{agent.capabilities}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
