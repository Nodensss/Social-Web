"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ToyMini = { id: string; fullName: string };
type FriendItem = { friendshipId: string; friend: ToyMini };

type Props = {
  toyId: string;
  friends: FriendItem[];
  candidates: ToyMini[];
};

export function FriendshipPanel({ toyId, friends, candidates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string>(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addFriend() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/friendships", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromToyId: toyId, toToyId: target }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось подружить.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3 rounded-2xl border border-toy-ink/10 bg-white p-4">
      <h2 className="text-lg font-extrabold">Друзья</h2>
      {friends.length === 0 ? (
        <p className="text-sm text-toy-ink/60">Пока никого. Подружитесь с другой игрушкой семьи.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {friends.map((f) => (
            <li key={f.friendshipId}>
              <Link
                href={`/toys/${f.friend.id}`}
                className="rounded-full bg-toy-soft px-3 py-1 text-sm font-semibold"
              >
                {f.friend.fullName}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-full border border-toy-ink/15 bg-white px-3 py-1 text-sm"
            disabled={busy || pending}
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addFriend}
            disabled={busy || pending || !target}
            className="rounded-full bg-toy-accent px-3 py-1 text-sm font-bold text-white disabled:opacity-50"
          >
            Подружиться
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
