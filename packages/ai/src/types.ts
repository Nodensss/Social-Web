import { z } from "zod";

export const ToyBioSchema = z.object({
  fullName: z.string().min(3),
  species: z.string().min(2),
  personalityTraits: z.array(z.string()).min(1).max(8),
  catchphrases: z.array(z.string()).min(1).max(6),
  bio: z.string().min(10),
});
export type ToyBio = z.infer<typeof ToyBioSchema>;

export type GenerateBioInput = {
  speciesHint?: string;
  colorHint?: string;
  childDescription?: string;
};

export type GeneratePostInput = {
  bio: string;
  personalityTraits: string[];
  catchphrases: string[];
  topic?: "daily" | "story" | "question";
};

export type LLM = {
  generateBio(input: GenerateBioInput): Promise<ToyBio>;
  generatePost(input: GeneratePostInput): Promise<{ text: string }>;
  moderateText(text: string): Promise<{ safe: boolean; reason?: string }>;
};

export type StylizeInput = { sourceUrl: string; species?: string };
export type StylizeResult = { stylizedUrl: string; providerJobId?: string };
export type ImageStylizer = { stylize(input: StylizeInput): Promise<StylizeResult> };

export type ThreeDInput = { sourceUrl: string };
export type ThreeDResult = { glbUrl: string; providerJobId?: string };
export type ThreeDProvider = { generate(input: ThreeDInput): Promise<ThreeDResult> };
