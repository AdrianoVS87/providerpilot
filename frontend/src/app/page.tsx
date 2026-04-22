"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { submitIntake, type IntakeFormData } from "@/lib/api";

const STATES = [
  { code: "CA", name: "California" }, { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" }, { code: "NY", name: "New York" },
  { code: "MI", name: "Michigan" }, { code: "NV", name: "Nevada" },
  { code: "IN", name: "Indiana" }, { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" }, { code: "IL", name: "Illinois" },
];

const AGE_GROUPS = ["infant", "toddler", "preschool", "school-age"];

// Org chart data for visual
const ORG_TIERS = [
  { label: "Executive", agents: ["CEO", "COO"], color: "from-purple-500 to-violet-600", count: 2 },
  { label: "Department", agents: ["VP-Licensing", "VP-Compliance", "VP-Comms", "VP-Quality"], color: "from-blue-500 to-indigo-600", count: 4 },
  { label: "State Directors", agents: ["CA", "TX", "FL", "NY", "MI", "NV", "IN", "OH", "GA", "IL"], color: "from-emerald-500 to-teal-600", count: 10 },
  { label: "Specialists", agents: ["DocExtractor", "ComplianceChecker", "FormFiller", "CoachWriter"], color: "from-amber-500 to-orange-600", count: 20 },
  { label: "Validators", agents: ["ConfidenceGate", "RegressionTester", "CostMonitor", "SafetyAuditor"], color: "from-red-500 to-rose-600", count: 4 },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const toggleAgeGroup = (group: string) => {
    setSelectedAgeGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data: IntakeFormData = {
      providerName: fd.get("providerName") as string,
      businessName: fd.get("businessName") as string,
      state: fd.get("state") as string,
      address: fd.get("address") as string,
      phone: fd.get("phone") as string,
      email: fd.get("email") as string,
      facilityType: fd.get("facilityType") as string || "home-based",
      ageGroups: selectedAgeGroups,
      maxCapacity: parseInt(fd.get("maxCapacity") as string) || undefined,
    };
    try {
      const result = await submitIntake(data);
      router.push(`/status/${result.onboardingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">PP</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">ProviderPilot</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/agents" className="text-sm text-white/50 hover:text-white transition">Agents</a>
            <a href="/dashboard" className="text-sm text-white/50 hover:text-white transition">Dashboard</a>
            <a href="/review" className="text-sm text-white/50 hover:text-white transition">Review</a>
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
              <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />
              40 agents live
            </Badge>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 mb-6">
            <span className="text-xs text-white/60">Autonomous Multi-Agent System</span>
            <span className="text-xs text-blue-400">Paperclip + OpenClaw</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
            Provider onboarding
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              at machine speed
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            40 AI agents orchestrated as a company — from intake form to
            filled licensing application across 10 US states, with human oversight at every step.
          </p>

          <div className="flex justify-center gap-4 mb-16">
            <Button
              onClick={() => setShowForm(true)}
              className="h-12 px-8 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-all"
            >
              Start Onboarding →
            </Button>
            <a href="/agents">
              <Button variant="outline" className="h-12 px-8 border-white/10 text-white/70 rounded-xl hover:bg-white/5">
                View 40 Agents
              </Button>
            </a>
          </div>

          {/* Live metrics strip */}
          <div className="flex justify-center gap-12 text-sm">
            {[
              { label: "Agents Active", value: "40", color: "text-green-400" },
              { label: "States Covered", value: "10", color: "text-blue-400" },
              { label: "Avg Cost", value: "$0.02", color: "text-emerald-400" },
              { label: "Avg Time", value: "~30s", color: "text-violet-400" },
              { label: "Confidence Gate", value: "0.9", color: "text-amber-400" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-white/30 text-xs mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Org Chart Visual */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Corporate Agent Structure</h2>
          <p className="text-white/30 text-center mb-10 text-sm">Structured as a company, not a flat swarm. Each agent has a role, scope, and budget.</p>

          <div className="space-y-3">
            {ORG_TIERS.map((tier) => (
              <div key={tier.label} className="flex items-center gap-4">
                <div className="w-full md:w-28 text-left md:text-right">
                  <span className="text-xs text-white/40">{tier.label}</span>
                  <div className="text-xs text-white/20">{tier.count} agents</div>
                </div>
                <div className="flex-1 flex gap-1.5 flex-wrap">
                  {tier.agents.map((a) => (
                    <div
                      key={a}
                      className={`px-3 py-1.5 rounded-md bg-gradient-to-r ${tier.color} text-white text-xs font-medium opacity-90 hover:opacity-100 transition-opacity`}
                    >
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Flow */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Onboarding Pipeline</h2>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
            {[
              { icon: "📋", label: "Intake", agent: "Frontend" },
              { icon: "👔", label: "CEO", agent: "Routes" },
              { icon: "📋", label: "VP", agent: "Licensing" },
              { icon: "🏛️", label: "Director", agent: "State" },
              { icon: "📄", label: "DocExt", agent: "Extract" },
              { icon: "✅", label: "Comply", agent: "Check" },
              { icon: "📝", label: "Form", agent: "Fill" },
              { icon: "🔒", label: "Gate", agent: "Score" },
              { icon: "💰", label: "Cost", agent: "Budget" },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-2">
                  {step.icon}
                </div>
                <div className="text-xs text-white/60 font-medium">{step.label}</div>
                <div className="text-[10px] text-white/30">{step.agent}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reliability Patterns */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Reliability Patterns</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: "Independent Confidence Gate", desc: "Separate adversarial judge (temp 0.1) scores all outputs. < 0.9 → human queue.", icon: "🔒" },
              { title: "Multi-Model Cascade", desc: "Opus → Sonnet → MiniMax M2.7 with circuit breakers and exponential backoff.", icon: "🔄" },
              { title: "Knowledge Base RAG", desc: "State-specific regulations (TX Ch.746, CA Title 22, NY OCFS) injected into specialist context.", icon: "📚" },
              { title: "Cost Circuit Breaker", desc: "CostMonitor tracks tokens per onboarding. $2 budget limit, auto-halt on overrun.", icon: "💰" },
              { title: "Rule of Two", desc: "No single agent has PII access + external content + communication capability.", icon: "🛡️" },
              { title: "Retry + Degraded Fallback", desc: "2 attempts with backoff. On failure: degraded result → guaranteed human review.", icon: "♻️" },
            ].map((p) => (
              <Card key={p.title} className="bg-white/[0.02] border-white/5 hover:border-white/10 transition-colors">
                <CardContent className="pt-5">
                  <div className="text-2xl mb-3">{p.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-1">{p.title}</h3>
                  <p className="text-xs text-white/30 leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "Orchestration", value: "Paperclip", sub: "Org chart, budgets, governance" },
              { label: "Runtime", value: "OpenClaw", sub: "Agent lifecycle, MCP, sub-agents" },
              { label: "AI Models", value: "4 models", sub: "Opus · Sonnet · MiniMax · Codex" },
              { label: "Observability", value: "HookWatch", sub: "OTel traces, span tree, cost" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs text-white/30 mb-1">{s.label}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
                <div className="text-[10px] text-white/20 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intake Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <Card className="bg-[#12121A] border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-lg">New Provider Intake</CardTitle>
                  <CardDescription className="text-white/40 text-sm">
                    Submit to trigger the 40-agent onboarding pipeline.
                  </CardDescription>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white text-xl">×</button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">Provider Name *</Label>
                    <Input name="providerName" required placeholder="Maria Rodriguez" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">Business Name</Label>
                    <Input name="businessName" placeholder="Maria's Home Daycare" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">State *</Label>
                    <Select name="state" required>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{STATES.map((s) => (<SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">Facility Type</Label>
                    <Select name="facilityType" defaultValue="home-based">
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home-based">Home-Based</SelectItem>
                        <SelectItem value="center-based">Center-Based</SelectItem>
                        <SelectItem value="group-home">Group Home</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Address</Label>
                  <Input name="address" placeholder="1234 Main St, Austin TX 78701" className="bg-white/5 border-white/10 text-white h-10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">Phone</Label>
                    <Input name="phone" placeholder="512-555-1234" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs">Email</Label>
                    <Input name="email" type="email" placeholder="maria@example.com" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Max Capacity</Label>
                  <Input name="maxCapacity" type="number" placeholder="12" className="bg-white/5 border-white/10 text-white h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs">Age Groups</Label>
                  <div className="flex gap-2">{AGE_GROUPS.map((g) => (
                    <Badge key={g} variant={selectedAgeGroups.includes(g) ? "default" : "outline"}
                      className={`cursor-pointer text-xs transition ${selectedAgeGroups.includes(g) ? "bg-blue-600 hover:bg-blue-700 border-blue-600" : "border-white/10 text-white/40 hover:border-blue-500/50"}`}
                      onClick={() => toggleAgeGroup(g)}>{g}</Badge>
                  ))}</div>
                </div>
                {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</div>}
                <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-blue-500 to-violet-600 hover:opacity-90 text-white font-medium rounded-xl">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching 40 agents...
                    </span>
                  ) : "Start Autonomous Onboarding →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="text-xs text-white/20">
            Built by <a href="https://adrianovs.net" className="text-white/40 hover:text-white/60">Adriano Viera dos Santos</a>
          </div>
          <div className="flex gap-6 text-xs text-white/20">
            <span>40 agents</span>
            <span>10 states</span>
            <span>Paperclip + OpenClaw</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
