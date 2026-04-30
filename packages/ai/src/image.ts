import type { ImageStylizer } from "./types";

const mockStylizer: ImageStylizer = {
  async stylize({ sourceUrl }) {
    return { stylizedUrl: sourceUrl };
  },
};

export function getImageStylizer(): ImageStylizer {
  const provider = process.env.IMAGE_PROVIDER ?? "mock";
  switch (provider) {
    case "replicate":
      // TODO(codex): реализовать через replicate sdk + REPLICATE_MODEL.
      return mockStylizer;
    case "mock":
    default:
      return mockStylizer;
  }
}
