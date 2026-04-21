import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
});

const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

export async function heartbeatCheck(agentName: string, agentTitle: string, context: string): Promise<string> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are ${agentName}, a ${agentTitle} in an autonomous childcare provider onboarding system called ProviderPilot. You are performing a heartbeat check. Report your status concisely in 1-2 sentences. Be professional and specific to your role.`,
      },
      {
        role: "user",
        content: `Heartbeat check. Current context: ${context}. Report your operational status.`,
      },
    ],
    max_tokens: 100,
    temperature: 0.3,
  });
  return res.choices[0]?.message?.content || "Status: operational";
}

export async function agentThink(
  agentName: string,
  agentTitle: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 500,
  options?: { temperature?: number; model?: string }
): Promise<{ content: string; tokens: number; model: string }> {
  const temp = options?.temperature ?? 0.4;
  const modelUsed = options?.model || MODEL;
  try {
    const res = await client.chat.completions.create({
      model: modelUsed,
      messages: [
        { role: "system", content: `You are ${agentName}, a ${agentTitle}. ${systemPrompt}` },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: temp,
    });
    return {
      content: res.choices[0]?.message?.content || "",
      tokens: res.usage?.total_tokens || 0,
      model: modelUsed,
    };
  } catch (err) {
    // Circuit breaker: if primary model fails, log and rethrow
    console.error(`[minimax] ${agentName} failed on ${modelUsed}:`, err);
    throw err;
  }
}
