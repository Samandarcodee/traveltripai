import OpenAI from "openai";

const apiKey =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  "dev-placeholder-key";

const baseURL =
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ||
  "https://api.openai.com/v1";

if (
  !process.env.AI_INTEGRATIONS_OPENAI_API_KEY &&
  !process.env.OPENAI_API_KEY
) {
  console.warn(
    "[openai] Neither AI_INTEGRATIONS_OPENAI_API_KEY nor OPENAI_API_KEY is set. " +
      "AI features (chat, call analysis) will fail at runtime. " +
      "Set OPENAI_API_KEY in your .env file to enable them.",
  );
}

export const openai = new OpenAI({ apiKey, baseURL });
