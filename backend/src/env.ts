import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  PAPERCLIP_URL: z.string().url().default("http://127.0.0.1:3100"),
  MINIMAX_API_KEY: z.string().min(10),
  MINIMAX_BASE_URL: z.string().url().default("https://api.minimax.io/v1"),
  MINIMAX_MODEL: z.string().default("MiniMax-M2.7"),
  PAPERCLIP_PROJECT_ID: z.string().uuid().optional(),
  API_KEY: z.string().default("pp-demo-key-2026"),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Missing or invalid environment variables:");
    for (const [key, errors] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${errors?.join(", ")}`);
    }
    process.exit(1);
  }
  return result.data;
}
