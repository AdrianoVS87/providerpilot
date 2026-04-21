const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://82.25.76.54:4000";

export async function submitIntake(data: IntakeFormData) {
  const res = await fetch(`${API_URL}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ onboardingId: string; status: string }>;
}

export async function getStatus(id: string) {
  const res = await fetch(`${API_URL}/api/status/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OnboardingStatus>;
}

export async function getAgents() {
  const res = await fetch(`${API_URL}/api/agents`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${API_URL}/api/metrics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Metrics>;
}

export async function getReviewQueue() {
  const res = await fetch(`${API_URL}/api/review/queue`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitReview(onboardingId: string, action: string, notes?: string) {
  const res = await fetch(`${API_URL}/api/review/${onboardingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function streamStatus(id: string, onEvent: (data: unknown) => void): () => void {
  const es = new EventSource(`${API_URL}/api/status/${id}/stream`);
  es.onmessage = (e) => onEvent(JSON.parse(e.data));
  es.onerror = () => es.close();
  return () => es.close();
}

// Types
export interface IntakeFormData {
  providerName: string;
  businessName?: string;
  state: string;
  address?: string;
  phone?: string;
  email?: string;
  facilityType?: string;
  ageGroups?: string[];
  maxCapacity?: number;
}

export interface OnboardingStep {
  id: string;
  agent: string;
  action: string;
  status: string;
  confidence: number | null;
  tokens: number;
  output: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
}

export interface OnboardingStatus {
  onboardingId: string;
  status: string;
  providerName: string;
  state: string;
  confidence: number | null;
  cost: { totalTokens: number; totalUsd: number };
  steps: OnboardingStep[];
  createdAt: string;
  updatedAt: string;
}

export interface Metrics {
  totalOnboardings: number;
  completed: number;
  inProgress: number;
  reviewNeeded: number;
  errors: number;
  avgTokens: number;
  avgCostUsd: number;
  avgConfidence: number;
  totalTokens: number;
  totalCostUsd: number;
  reviewQueueSize: number;
  byState: Array<{ state: string; count: number; avgConfidence: number | null }>;
}
