import type { LLM, ToyBio } from "../types";

const SPECIES_SURNAMES: Record<string, string> = {
  lion: "Львов",
  cat: "Котманов",
  capybara: "Капибаров",
  lizard: "Варанович",
  bear: "Медведев",
  dog: "Пёсиков",
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export const mockLLM: LLM = {
  async generateBio({ speciesHint }): Promise<ToyBio> {
    const species = (speciesHint ?? "toy").toLowerCase();
    const surname = SPECIES_SURNAMES[species] ?? "Игрушкин";
    const firstName = pick(["Симба", "Черныш", "Вараша", "Оля", "Тиша", "Боня"]);
    const patronymic = pick(["Муфассович", "Диегович", "Вариниович", "Капибаровна", "Тигрович"]);
    return {
      fullName: `${surname} ${firstName} ${patronymic}`,
      species,
      personalityTraits: ["добрый", "храбрый", "любопытный"],
      catchphrases: ["Привет, друзья!", "Пойдём играть!"],
      bio: "Маленький герой с большим сердцем. Любит чай с печеньем и истории на ночь.",
    };
  },
  async generatePost({ catchphrases }) {
    const phrase = catchphrases[0] ?? "Привет!";
    return {
      text: `${phrase} Сегодня у меня был чудесный день: я подружился с подушкой и нашёл новый уютный угол.`,
    };
  },
  async moderateText(text) {
    const banned = ["убить", "кровь", "ненавижу"];
    const lower = text.toLowerCase();
    const hit = banned.find((w) => lower.includes(w));
    return hit ? { safe: false, reason: `запрещённое слово: ${hit}` } : { safe: true };
  },
};
