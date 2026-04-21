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
  { code: "CA", name: "California" },
  { code: "TX", name: "Texas" },
  { code: "FL", name: "Florida" },
  { code: "NY", name: "New York" },
  { code: "MI", name: "Michigan" },
  { code: "NV", name: "Nevada" },
  { code: "IN", name: "Indiana" },
  { code: "OH", name: "Ohio" },
  { code: "GA", name: "Georgia" },
  { code: "IL", name: "Illinois" },
];

const AGE_GROUPS = ["infant", "toddler", "preschool", "school-age"];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              PP
            </div>
            <h1 className="text-xl font-bold text-white">ProviderPilot</h1>
            <Badge variant="secondary" className="text-xs">40 Agents</Badge>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/dashboard" className="text-slate-400 hover:text-white transition">Dashboard</a>
            <a href="/review" className="text-slate-400 hover:text-white transition">Review Queue</a>
            <a href="/agents" className="text-slate-400 hover:text-white transition">Agents</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-8 text-center">
        <Badge className="mb-4 bg-blue-600/20 text-blue-400 border-blue-600/30">
          Autonomous Multi-Agent System
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Childcare Provider Onboarding
          <br />
          <span className="text-blue-400">in Minutes, Not Months</span>
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
          40 AI agents work together to automate licensing across 10 US states.
          From intake form to filled application — with human oversight at every step.
        </p>
        <div className="flex justify-center gap-6 text-sm text-slate-500 mb-12">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            40 agents active
          </div>
          <div>10 states covered</div>
          <div>~$0.43 per onboarding</div>
          <div>Confidence-gated</div>
        </div>
      </section>

      {/* Intake Form */}
      <section className="container mx-auto px-4 pb-16 max-w-2xl">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Provider Intake Form</CardTitle>
            <CardDescription>
              Submit provider information to begin autonomous onboarding. The system will route to the correct
              state director, run 4 specialist agents in parallel, and score outputs through an independent
              confidence gate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="providerName" className="text-slate-300">Provider Name *</Label>
                  <Input id="providerName" name="providerName" required placeholder="Maria Rodriguez"
                    className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-slate-300">Business Name</Label>
                  <Input id="businessName" name="businessName" placeholder="Maria's Home Daycare"
                    className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">State *</Label>
                  <Select name="state" required>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilityType" className="text-slate-300">Facility Type</Label>
                  <Select name="facilityType" defaultValue="home-based">
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home-based">Home-Based</SelectItem>
                      <SelectItem value="center-based">Center-Based</SelectItem>
                      <SelectItem value="group-home">Group Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-300">Address</Label>
                <Input id="address" name="address" placeholder="1234 Main St, Austin TX 78701"
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-300">Phone</Label>
                  <Input id="phone" name="phone" placeholder="512-555-1234"
                    className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="maria@example.com"
                    className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity" className="text-slate-300">Max Capacity</Label>
                <Input id="maxCapacity" name="maxCapacity" type="number" placeholder="12"
                  className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Age Groups Served</Label>
                <div className="flex gap-2 flex-wrap">
                  {AGE_GROUPS.map((group) => (
                    <Badge
                      key={group}
                      variant={selectedAgeGroups.includes(group) ? "default" : "outline"}
                      className={`cursor-pointer transition ${
                        selectedAgeGroups.includes(group)
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "border-slate-700 text-slate-400 hover:border-blue-600"
                      }`}
                      onClick={() => toggleAgeGroup(group)}
                    >
                      {group}
                    </Badge>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 rounded p-3">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {loading ? "Submitting to 40 agents..." : "Start Autonomous Onboarding →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* Architecture Preview */}
      <section className="container mx-auto px-4 pb-16 max-w-4xl">
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-slate-900/30 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Layer 1: Presentation</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Next.js 14 + shadcn/ui on Vercel. Intake form, status tracking, review queue.
            </CardContent>
          </Card>
          <Card className="bg-slate-900/30 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Layer 2: Orchestration</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              Paperclip — org chart, budgets, heartbeats, governance for 40 agents.
            </CardContent>
          </Card>
          <Card className="bg-slate-900/30 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Layer 3: Runtime</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-500">
              MiniMax M2.7 (idle) + Claude Sonnet/Opus (active work). Multi-model cascade.
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-600">
        Built by Adriano Viera dos Santos · 40 agents · 10 states · Paperclip + OpenClaw
      </footer>
    </div>
  );
}
