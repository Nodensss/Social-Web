"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = { toyId: string };

export function NewPostForm({ toyId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [topic, setTopic] = useState<"daily" | "story" | "question">("daily");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body =
      mode === "ai"
        ? { generateWithAi: true, topic }
        : { text: text.trim() };
    const res = await fetch(`/api/toys/${toyId}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Не удалось опубликовать пост.");
      return;
    }
    setText("");
    startTransition(() => router.push("/"));
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-toy-ink/10 bg-white p-4">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-full px-3 py-1 font-semibold ${
            mode === "manual" ? "bg-toy-accent text-white" : "bg-toy-soft"
          }`}
        >
          Своими словами
        </button>
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`rounded-full px-3 py-1 font-semibold ${
            mode === "ai" ? "bg-toy-accent text-white" : "bg-toy-soft"
          }`}
        >
          ✨ AI-сочинение
        </button>
      </div>

      {mode === "manual" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={1200}
          placeholder="Что сегодня случилось с героем?"
          className="w-full rounded-xl border border-toy-ink/15 bg-toy-bg/30 p-3 text-sm"
        />
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <label className="text-toy-ink/60">Тема:</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as typeof topic)}
            className="rounded-full border border-toy-ink/15 bg-white px-3 py-1"
          >
            <option value="daily">Что я делаю сегодня</option>
            <option value="story">Случай со мной</option>
            <option value="question">Вопрос друзьям</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-toy-ink/60">
          Текст пройдёт детскую модерацию перед публикацией.
        </p>
        <button
          type="submit"
          disabled={busy || pending || (mode === "manual" && !text.trim())}
          className="rounded-full bg-toy-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Публикуем…" : "Опубликовать"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
