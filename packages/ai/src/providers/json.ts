import { z } from "zod";
import { ToyBioSchema } from "../types";

export const ModerationResultSchema = z.object({
  safe: z.boolean(),
  reason: z.string().optional(),
});

export const ToyBioJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fullName", "species", "personalityTraits", "catchphrases", "bio"],
  properties: {
    fullName: { type: "string", minLength: 3 },
    species: { type: "string", minLength: 2 },
    personalityTraits: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" },
    },
    catchphrases: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" },
    },
    bio: { type: "string", minLength: 10 },
  },
} as const;

export const ModerationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["safe", "reason"],
  properties: {
    safe: { type: "boolean" },
    reason: { type: "string" },
  },
} as const;

export function parseJsonFromText(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI вернул не JSON");
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function parseToyBio(text: string) {
  return ToyBioSchema.parse(parseJsonFromText(text));
}

export function parseModeration(text: string) {
  return ModerationResultSchema.parse(parseJsonFromText(text));
}
