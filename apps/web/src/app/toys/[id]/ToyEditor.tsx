"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Toy = {
  id: string;
  fullName: string;
  birthYear: number | null;
  bio: string;
  personalityTraits: string[];
  catchphrases: string[];
  status: "processing" | "ready" | "failed";
  originalPhotoUrl: string;
  processedImageUrl: string | null;
  model3dUrl: string | null;
};

function statusText(status: Toy["status"]) {
  if (status === "ready") return "Готова";
  if (status === "failed") return "Нужна помощь";
  return "Обрабатывается";
}

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ToyEditor({ toy }: { toy: Toy }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const imageUrl = toy.processedImageUrl ?? toy.originalPhotoUrl;
  const traits = useMemo(() => toy.personalityTraits.join("\n"), [toy.personalityTraits]);
  const catchphrases = useMemo(() => toy.catchphrases.join("\n"), [toy.catchphrases]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/toys/${toy.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: String(formData.get("fullName") ?? ""),
        birthYear: formData.get("birthYear")
          ? Number.parseInt(String(formData.get("birthYear")), 10)
          : null,
        bio: String(formData.get("bio") ?? ""),
        personalityTraits: linesToArray(String(formData.get("personalityTraits") ?? "")),
        catchphrases: linesToArray(String(formData.get("catchphrases") ?? "")),
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? "Не удалось сохранить изменения.");
      return;
    }

    setMessage("Карточка сохранена.");
    router.refresh();
  }

  async function onPublish() {
    setPublishing(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/toys/${toy.id}/publish`, { method: "POST" });
    const data = (await response.json()) as { error?: string };
    setPublishing(false);

    if (!response.ok) {
      setError(data.error ?? "Не удалось опубликовать игрушку.");
      return;
    }

    setMessage("Игрушка опубликована в семейную ленту.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
      <aside className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-toy-ink/10 bg-white">
          <img src={imageUrl} alt={toy.fullName} className="aspect-square w-full object-cover" />
        </div>
        <div className="rounded-2xl border border-toy-ink/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-toy-ink/50">Статус</p>
          <p className="mt-1 text-lg font-extrabold">{statusText(toy.status)}</p>
          {toy.model3dUrl ? (
            <a className="mt-2 block text-sm font-semibold text-toy-accent" href={toy.model3dUrl}>
              Открыть 3D-модель
            </a>
          ) : null}
        </div>
      </aside>

      <section className="space-y-4">
        <form
          onSubmit={onSave}
          className="space-y-4 rounded-2xl border border-toy-ink/10 bg-white p-5"
        >
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Полное имя</span>
            <input
              name="fullName"
              defaultValue={toy.fullName}
              className="w-full rounded-xl border border-toy-ink/15 px-4 py-3 outline-none focus:border-toy-accent"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Год рождения</span>
            <input
              name="birthYear"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2026}
              defaultValue={toy.birthYear ?? ""}
              className="w-full rounded-xl border border-toy-ink/15 px-4 py-3 outline-none focus:border-toy-accent"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold">Био</span>
            <textarea
              name="bio"
              defaultValue={toy.bio}
              rows={6}
              className="w-full resize-none rounded-xl border border-toy-ink/15 px-4 py-3 outline-none focus:border-toy-accent"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Черты характера</span>
              <textarea
                name="personalityTraits"
                defaultValue={traits}
                rows={6}
                className="w-full resize-none rounded-xl border border-toy-ink/15 px-4 py-3 outline-none focus:border-toy-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Фразочки</span>
              <textarea
                name="catchphrases"
                defaultValue={catchphrases}
                rows={6}
                className="w-full resize-none rounded-xl border border-toy-ink/15 px-4 py-3 outline-none focus:border-toy-accent"
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {message ? (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              disabled={saving}
              className="rounded-full bg-toy-accent px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Сохраняем..." : "Сохранить карточку"}
            </button>
            <button
              type="button"
              disabled={publishing || toy.status !== "ready"}
              onClick={onPublish}
              className="rounded-full border border-toy-accent px-5 py-3 font-bold text-toy-accent transition hover:bg-toy-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? "Публикуем..." : "Опубликовать в семейную ленту"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
