// Same-origin API (nginx proxies /api to backend)
const API_URL = "";

const API_KEY = "pp-demo-key-2026";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(options.headers || {});
    if (!headers.has("X-API-Key")) headers.set("X-API-Key", API_KEY);
    return await fetch(url, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function submitIntake(data: IntakeFormData) {
  const res = await fetchWithTimeout(`${API_URL}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify(data),
  }, 12000);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ onboardingId: string; status: string }>;
}

export async function getStatus(id: string) {
  const res = await fetchWithTimeout(`${API_URL}/api/status/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<OnboardingStatus>;
}

export async function getAgents() {
  const res = await fetchWithTimeout(`${API_URL}/api/agents`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMetrics() {
  const res = await fetchWithTimeout(`${API_URL}/api/metrics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Metrics>;
}

export async function getReviewQueue() {
  const res = await fetchWithTimeout(`${API_URL}/api/review/queue`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReviewHistory() {
  const res = await fetchWithTimeout(`${API_URL}/api/review/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitReview(onboardingId: string, action: string, notes?: string, stepId?: string) {
  const res = await fetchWithTimeout(`${API_URL}/api/review/${onboardingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ action, notes, stepId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function reopenReviewItem(reviewId: string) {
  const res = await fetchWithTimeout(`${API_URL}/api/review/reopen/${reviewId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteReviewHistoryItem(reviewId: string) {
  const res = await fetchWithTimeout(`${API_URL}/api/review/history/${reviewId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
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

export interface ArtifactMeta {
  id: string;
  step_id: string;
  onboarding_id: string;
  artifact_type: string;
  artifact_url: string;
  sha256: string;
  bytes: number;
  created_at: string;
  metadata?: { state?: string; template_version?: string };
}

export interface OnboardingStep {
  id: string;
  agent: string;
  action: string;
  status: string;
  confidence: number | null;
  tokens: number;
  output: Record<string, unknown>;
  artifacts?: ArtifactMeta[];
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
  costMode: "estimated" | "billed";
  costAccuracy: "relative" | "reconciled";
  costNote: string;
  costViews: {
    estimated: { totalUsd: number; avgUsd: number; source: string };
    billed: { totalUsd: number | null; avgUsd: number | null; source: string; coveragePct: number };
    deltaPct: number | null;
  };
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
  estimateConfidence: {
    modelTagCoveragePct: number;
    billedCoveragePct: number;
    note: string;
  };
  costByModel: Array<{
    model: string;
    tokens: number;
    ratePer1kUsd: number;
    estimatedUsd: number;
  }>;
}
