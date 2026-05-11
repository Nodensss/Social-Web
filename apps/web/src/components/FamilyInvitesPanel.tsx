"use client";

import { useState } from "react";
import { Button } from "@toyverse/ui";

export function FamilyInvitesPanel({ initialInvites }: { initialInvites: Array<{ code: string; url: string }> }) {
  const [invites, setInvites] = useState(initialInvites);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/family/invites", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      setInvites((prev) => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Ссылка скопирована!");
    } catch (e) {
      alert("Не удалось скопировать");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">Пригласить близких</h2>
      <p className="text-sm text-toy-ink/70">
        Создайте ссылку-приглашение для бабушек и дедушек, чтобы они могли видеть вашу семью.
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <Button onClick={handleCreate} disabled={loading} variant="primary">
        Создать новое приглашение
      </Button>

      {invites.length > 0 && (
        <ul className="mt-4 space-y-2">
          {invites.map((invite) => (
            <li key={invite.code} className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="truncate text-sm mr-4" title={invite.url}>{invite.url}</span>
              <Button onClick={() => handleCopy(invite.url)} variant="ghost">
                Скопировать
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
