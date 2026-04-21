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
