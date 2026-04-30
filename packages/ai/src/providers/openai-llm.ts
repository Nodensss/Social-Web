import { BIO_SYSTEM_PROMPT, MODERATION_SYSTEM_PROMPT, POST_SYSTEM_PROMPT } from "../prompts";
import type { GenerateBioInput, GeneratePostInput, LLM } from "../types";
import { ModerationJsonSchema, parseModeration, parseToyBio, ToyBioJsonSchema } from "./json";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

function extractText(payload: OpenAIResponse): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text)
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .trim();

  if (!text) throw new Error("OpenAI не вернул текстовый ответ");
  return text;
}

export function createOpenAILLM(): LLM {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  async function complete(
    system: string,
    user: string,
    options?: {
      maxOutputTokens?: number;
      jsonSchema?: { name: string; schema: object };
    },
  ): Promise<string> {
    if (!apiKey) throw new Error("OPENAI_API_KEY не задан");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_output_tokens: options?.maxOutputTokens ?? 900,
        temperature: 0.7,
        text: options?.jsonSchema
          ? {
              format: {
                type: "json_schema",
                name: options.jsonSchema.name,
                schema: options.jsonSchema.schema,
                strict: true,
              },
            }
          : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API ${response.status}: ${await response.text()}`);
    }

    return extractText((await response.json()) as OpenAIResponse);
  }

  return {
    async generateBio(input: GenerateBioInput) {
      const text = await complete(
        BIO_SYSTEM_PROMPT,
        [
          "Верни строго JSON для карточки игрушки.",
          "Входные подсказки:",
          JSON.stringify(input, null, 2),
        ].join("\n\n"),
        { jsonSchema: { name: "toy_bio", schema: ToyBioJsonSchema } },
      );
      return parseToyBio(text);
    },

    async generatePost(input: GeneratePostInput) {
      const text = await complete(
        POST_SYSTEM_PROMPT,
        [
          "Напиши короткий пост от первого лица для семейной ленты.",
          "Верни только текст поста, без JSON и пояснений.",
          JSON.stringify(input, null, 2),
        ].join("\n\n"),
        { maxOutputTokens: 280 },
      );
      return { text: text.trim() };
    },

    async moderateText(text: string) {
      const result = await complete(MODERATION_SYSTEM_PROMPT, `Проверь текст:\n${text}`, {
        maxOutputTokens: 180,
        jsonSchema: { name: "moderation_result", schema: ModerationJsonSchema },
      });
      return parseModeration(result);
    },
  };
}
