import dotenv from "dotenv";
dotenv.config();

const PAPERCLIP_URL = process.env.PAPERCLIP_URL || "http://127.0.0.1:3100";

export async function paperclipGet(path: string) {
  const res = await fetch(`${PAPERCLIP_URL}${path}`);
  if (!res.ok) throw new Error(`Paperclip GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function paperclipPost(path: string, body: unknown) {
  const res = await fetch(`${PAPERCLIP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Paperclip POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getAgents(companyId: string) {
  return paperclipGet(`/api/companies/${companyId}/agents`);
}

export async function getAgent(companyId: string, agentId: string) {
  return paperclipGet(`/api/companies/${companyId}/agents/${agentId}`);
}

export async function createIssue(companyId: string, data: {
  title: string;
  description: string;
  projectId: string;
  assigneeId: string;
  parentId?: string;
  status?: string;
}) {
  return paperclipPost(`/api/companies/${companyId}/issues`, {
    ...data,
    status: data.status || "backlog",
  });
}

export async function updateIssue(_companyId: string, _issueId: string, _data: Record<string, unknown>) {
  // Paperclip V1 doesn't expose PATCH/PUT for issues yet — tracked as enhancement
  // Issues are created and visible in dashboard; status updates are manual for now
  return;
}

export async function addComment(_companyId: string, _issueId: string, _content: string, _agentId?: string) {
  // Paperclip V1 comments API not yet available — tracked as enhancement
  return;
}
