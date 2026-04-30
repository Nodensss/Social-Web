import { BIO_SYSTEM_PROMPT, MODERATION_SYSTEM_PROMPT, POST_SYSTEM_PROMPT } from "../prompts";
import type { GenerateBioInput, GeneratePostInput, LLM } from "../types";
import { parseModeration, parseToyBio } from "./json";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicResponse = { content?: AnthropicTextBlock[] };

function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function extractText(payload: AnthropicResponse): string {
  const text = payload.content
    ?.filter((block): block is AnthropicTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Anthropic не вернул текстовый ответ");
  return text;
}

export function createAnthropicLLM(): LLM {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  async function complete(system: string, user: string, maxTokens = 900): Promise<string> {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY не задан");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.7,
        system: [
          {
            type: "text",
            text: system,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API ${response.status}: ${await response.text()}`);
    }

    return extractText((await response.json()) as AnthropicResponse);
  }

  return {
    async generateBio(input: GenerateBioInput) {
      const text = await complete(
        BIO_SYSTEM_PROMPT,
        ["Верни строго JSON для карточки игрушки.", "Входные подсказки:", compactJson(input)].join(
          "\n\n",
        ),
      );
      return parseToyBio(text);
    },

    async generatePost(input: GeneratePostInput) {
      const text = await complete(
        POST_SYSTEM_PROMPT,
        [
          "Напиши короткий пост от первого лица для семейной ленты.",
          "Верни только текст поста, без JSON и пояснений.",
          compactJson(input),
        ].join("\n\n"),
        280,
      );
      return { text: text.trim() };
    },

    async moderateText(text: string) {
      const result = await complete(MODERATION_SYSTEM_PROMPT, `Проверь текст:\n${text}`, 180);
      return parseModeration(result);
    },
  };
}
