import type { LLM } from "./types";
import { mockLLM } from "./providers/mock-llm";

export function getLLM(): LLM {
  const provider = process.env.LLM_PROVIDER ?? "mock";
  switch (provider) {
    case "anthropic":
      // TODO(codex): реализовать через @anthropic-ai/sdk, модель из ANTHROPIC_MODEL.
      return mockLLM;
    case "openai":
      // TODO(codex): реализовать через openai sdk.
      return mockLLM;
    case "mock":
    default:
      return mockLLM;
  }
}
