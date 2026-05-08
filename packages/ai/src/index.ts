import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import Replicate from 'replicate';

const getAnthropic = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

const getReplicate = () => {
  if (!process.env.REPLICATE_API_TOKEN) return null;
  return new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
};

export const bioSchema = z.object({
  fullName: z.string(),
  species: z.enum(['cat', 'lion', 'lizard', 'bear', 'capybara', 'other']),
  personalityTraits: z.array(z.string()).min(2).max(5),
  catchphrases: z.array(z.string()).min(1).max(3),
  bio: z.string().min(50).max(300)
});

export type GeneratedBio = z.infer<typeof bioSchema>;

export async function moderateText(text: string): Promise<{ safe: boolean; reason?: string; filteredText: string }> {
  // Simple check for MVP. In a real scenario, this would use a fast classification model or moderation API.
  const badWords = ['убить', 'смерть', 'кровь', 'насилие', 'страх'];
  const lowerText = text.toLowerCase();
  
  for (const word of badWords) {
    if (lowerText.includes(word)) {
      return {
        safe: false,
        reason: `Contains inappropriate word: ${word}`,
        // basic redaction for the mock
        filteredText: text.replace(new RegExp(word, 'gi'), '***')
      };
    }
  }

  // If Anthropic is available, we could use it for advanced moderation here
  return { safe: true, filteredText: text };
}

export async function generateToyBio(params: { species: string; color?: string; childDescription?: string }): Promise<GeneratedBio> {
  const anthropic = getAnthropic();

  if (!anthropic) {
    console.log(`[mock] LLM bio generated for species=${params.species}`);
    // Return mock data
    return {
      fullName: 'Котманов Черныш Диегович',
      species: 'cat',
      personalityTraits: ['игривый', 'любит спать', 'мурчит'],
      catchphrases: ['Мяу-мяу!', 'Почеши мне пузико.'],
      bio: `Черныш - самый ленивый и пушистый кот в мире. Он любит лежать на солнышке и охотиться за игрушечными мышами.`
    };
  }

  const prompt = `
Ты - детский креативный писатель. Твоя задача - создать личность для игрушки.
Стиль ФИО: "Фамилия от вида + Имя + Отчество-каламбур" (например: "Львов Симба Муфассович").
Аудитория: дети 4-10 лет. Тон: добрый, безопасный, без страха и насилия. Язык: русский.

Вид игрушки: ${params.species}
Цвет: ${params.color || 'не указан'}
Дополнительно: ${params.childDescription || 'нет'}
  `;

  const { object } = await generateObject({
    model: anthropic('claude-3-haiku-20240307'),
    schema: bioSchema,
    system: 'Вы генерируете JSON строго по схеме. Никакого текста вне JSON.',
    prompt,
  });

  // Run through our own moderateText just to be sure (as per requirements)
  const moderation = await moderateText(object.bio);
  if (!moderation.safe) {
    object.bio = moderation.filteredText;
  }

  return object;
}

export async function stylizeImage(imageUrl: string): Promise<string> {
  const replicate = getReplicate();

  if (!replicate) {
    console.log(`[mock] Image stylized for URL=${imageUrl}`);
    return imageUrl; // In mock mode, just return the original photo as "processed"
  }

  // Example: using a SDXL LoRA for cartoon style (just a placeholder model ID for MVP)
  // Real implementation would use the actual replicate model
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: "A 3D cartoon style render, cute, colorful, high quality, pixar style",
        image: imageUrl
      }
    }
  );

  return Array.isArray(output) ? output[0] : (output as string);
}
