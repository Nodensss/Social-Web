import type { LLM } from "./types";
import { createAnthropicLLM } from "./providers/anthropic-llm";
import { mockLLM } from "./providers/mock-llm";
import { createOpenAILLM } from "./providers/openai-llm";

export function getLLM(): LLM {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  switch (provider) {
    case "anthropic":
      return createAnthropicLLM();
    case "openai":
      return createOpenAILLM();
    case "mock":
    default:
      return mockLLM;
  }
}
