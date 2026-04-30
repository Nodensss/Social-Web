import type { ThreeDProvider } from "./types";

const offProvider: ThreeDProvider = {
  async generate() {
    throw new Error("3D provider disabled (THREE_D_PROVIDER=off)");
  },
};

const mockProvider: ThreeDProvider = {
  async generate() {
    return { glbUrl: "" };
  },
};

export function getThreeD(): ThreeDProvider {
  const provider = process.env.THREE_D_PROVIDER ?? "off";
  switch (provider) {
    case "meshy":
    case "tripo":
      // TODO(codex): реализовать через соответствующий API.
      return mockProvider;
    case "mock":
      return mockProvider;
    case "off":
    default:
      return offProvider;
  }
}
