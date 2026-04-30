"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewToyForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/toys", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { toy?: { id: string }; error?: string };
    setLoading(false);

    if (!response.ok || !data.toy) {
      setError(data.error ?? "Не удалось загрузить игрушку.");
      return;
    }

    router.push(`/toys/${data.toy.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block rounded-2xl border-2 border-dashed border-toy-ink/20 bg-white p-6 text-center">
        <span className="block text-lg font-bold">Фото игрушки</span>
        <span className="mt-1 block text-sm text-toy-ink/65">
          JPG, PNG, WebP или GIF. Лучше один герой крупно и при хорошем свете.
        </span>
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          className="mt-4 w-full rounded-xl border border-toy-ink/15 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Кто это?</span>
          <input
            name="speciesHint"
            className="w-full rounded-xl border border-toy-ink/15 bg-white px-4 py-3 outline-none focus:border-toy-accent"
            placeholder="кот, лев, динозавр"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold">Цвет или деталь</span>
          <input
            name="colorHint"
            className="w-full rounded-xl border border-toy-ink/15 bg-white px-4 py-3 outline-none focus:border-toy-accent"
            placeholder="рыжий, в синем шарфе"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold">Пожелания к характеру</span>
        <textarea
          name="childDescription"
          rows={4}
          className="w-full resize-none rounded-xl border border-toy-ink/15 bg-white px-4 py-3 outline-none focus:border-toy-accent"
          placeholder="например: любит космос, печенье и смешные истории"
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        disabled={loading}
        className="w-full rounded-full bg-toy-accent px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Загружаем и ставим в очередь..." : "Создать игрушку"}
      </button>
    </form>
  );
}
