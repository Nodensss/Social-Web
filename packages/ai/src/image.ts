import type { ImageStylizer } from "./types";
import { createReplicateStylizer } from "./providers/replicate-image";

const mockStylizer: ImageStylizer = {
  async stylize({ sourceUrl }) {
    return { stylizedUrl: sourceUrl };
  },
};

export function getImageStylizer(): ImageStylizer {
  const provider = process.env.IMAGE_PROVIDER ?? "mock";
  switch (provider) {
    case "replicate":
      return createReplicateStylizer();
    case "mock":
    default:
      return mockStylizer;
  }
}
