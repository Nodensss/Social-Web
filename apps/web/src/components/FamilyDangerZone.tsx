"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FamilyDangerZone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAll() {
    const ok = confirm("Удалить всех игрушек, посты и данные семьи? Это действие необратимо.");
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/family", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось удалить.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-toy-ink/10 bg-white p-4">
        <h2 className="text-lg font-extrabold">Экспорт данных</h2>
        <p className="mt-1 text-sm text-toy-ink/60">
          Все данные семьи в JSON: игрушки, посты, реакции, комментарии, дружба.
          Медиа доступны по ссылкам внутри файла.
        </p>
        <a
          href="/api/family/export"
          className="mt-3 inline-block rounded-full bg-toy-accent px-4 py-2 text-sm font-bold text-white"
        >
          Скачать JSON
        </a>
      </div>

      <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
        <h2 className="text-lg font-extrabold text-red-700">Удалить семью</h2>
        <p className="mt-1 text-sm text-red-700/80">
          Удаляются все дети, игрушки, посты, комментарии, реакции и дружба. Аккаунт остаётся.
        </p>
        <button
          type="button"
          onClick={deleteAll}
          disabled={busy}
          className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Удаляем…" : "Удалить безвозвратно"}
        </button>
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
