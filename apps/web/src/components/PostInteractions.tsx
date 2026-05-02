"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ToyOption = { id: string; fullName: string };

type CommentItem = {
  id: string;
  text: string;
  createdAt: string;
  authorToy: { id: string; fullName: string };
};

type Props = {
  postId: string;
  myToys: ToyOption[];
  initialReactions: number;
  initialReactedByToys: string[];
  initialComments: CommentItem[];
};

export function PostInteractions({
  postId,
  myToys,
  initialReactions,
  initialReactedByToys,
  initialComments,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaultToyId = myToys[0]?.id ?? "";
  const [asToyId, setAsToyId] = useState<string>(defaultToyId);
  const [reactionCount, setReactionCount] = useState(initialReactions);
  const [reactedByToys, setReactedByToys] = useState<string[]>(initialReactedByToys);
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reactedByMe = !!asToyId && reactedByToys.includes(asToyId);

  async function toggleLike() {
    if (!asToyId) return;
    setError(null);
    const res = await fetch(`/api/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ asToyId, type: "heart" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось поставить лайк.");
      return;
    }
    const body = (await res.json()) as { removed: boolean };
    if (body.removed) {
      setReactionCount((n) => Math.max(0, n - 1));
      setReactedByToys((arr) => arr.filter((id) => id !== asToyId));
    } else {
      setReactionCount((n) => n + 1);
      setReactedByToys((arr) => [...arr, asToyId]);
    }
    startTransition(() => router.refresh());
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!asToyId || !text.trim()) return;
    setError(null);
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ asToyId, text: text.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Комментарий не добавлен.");
      return;
    }
    const body = (await res.json()) as { comment: CommentItem };
    setComments((prev) => [...prev, body.comment]);
    setText("");
    startTransition(() => router.refresh());
  }

  if (myToys.length === 0) {
    return (
      <p className="text-xs text-toy-ink/60">
        Чтобы лайкать и комментировать, добавьте свою первую игрушку.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="text-toy-ink/60">От лица:</label>
        <select
          value={asToyId}
          onChange={(e) => setAsToyId(e.target.value)}
          className="rounded-full border border-toy-ink/15 bg-white px-3 py-1"
          disabled={pending}
        >
          {myToys.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={toggleLike}
          className={`rounded-full px-3 py-1 font-semibold transition ${
            reactedByMe ? "bg-toy-accent text-white" : "bg-toy-soft text-toy-ink"
          }`}
          disabled={pending || !asToyId}
        >
          {reactedByMe ? "❤️" : "🤍"} {reactionCount}
        </button>
      </div>

      {comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl bg-toy-bg/60 px-3 py-2 text-sm">
              <span className="font-semibold">{c.authorToy.fullName}: </span>
              {c.text}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submitComment} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сказать что-нибудь от лица игрушки…"
          className="flex-1 rounded-full border border-toy-ink/15 bg-white px-4 py-2 text-sm"
          maxLength={800}
          disabled={pending || !asToyId}
        />
        <button
          type="submit"
          className="rounded-full bg-toy-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending || !asToyId || !text.trim()}
        >
          Отправить
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
