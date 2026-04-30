import type { ImageStylizer, StylizeResult } from "../types";

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
  urls?: { get?: string };
};

function outputToUrl(output: unknown): string | undefined {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const firstString = output.find((item): item is string => typeof item === "string");
    if (firstString) return firstString;
  }
  if (output && typeof output === "object" && "url" in output) {
    const url = (output as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

async function requestPrediction(path: string, body: object): Promise<Prediction> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN не задан");

  const response = await fetch(`https://api.replicate.com/v1${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "wait=60",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Replicate API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as Prediction;
}

async function pollPrediction(prediction: Prediction): Promise<Prediction> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN не задан");

  let current = prediction;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (
      current.status === "succeeded" ||
      current.status === "failed" ||
      current.status === "canceled"
    ) {
      return current;
    }
    if (!current.urls?.get) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(current.urls.get, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Replicate poll ${response.status}: ${await response.text()}`);
    }
    current = (await response.json()) as Prediction;
  }
  return current;
}

export function createReplicateStylizer(): ImageStylizer {
  return {
    async stylize({ sourceUrl, species }): Promise<StylizeResult> {
      const model = process.env.REPLICATE_MODEL;
      if (!model) throw new Error("REPLICATE_MODEL не задан");

      const prompt =
        process.env.REPLICATE_PROMPT ??
        [
          "warm child-safe cartoon 3D toy avatar",
          "soft studio lighting",
          "rounded friendly shapes",
          species ? `${species} toy` : "plush toy",
        ].join(", ");

      const input = {
        image: sourceUrl,
        prompt,
        negative_prompt: "scary, dark, violence, weapon, horror, adult themes",
      };

      const prediction = model.includes("/") && !model.includes(":")
        ? await requestPrediction(`/models/${model}/predictions`, { input })
        : await requestPrediction("/predictions", { version: model, input });

      const completed = await pollPrediction(prediction);
      if (completed.status !== "succeeded") {
        throw new Error(
          `Replicate завершил задачу со статусом ${completed.status}: ${String(completed.error ?? "")}`,
        );
      }

      const stylizedUrl = outputToUrl(completed.output);
      if (!stylizedUrl) throw new Error("Replicate не вернул URL изображения");

      return { stylizedUrl, providerJobId: completed.id };
    },
  };
}
