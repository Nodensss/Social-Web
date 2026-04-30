"use client";

import { FormEvent, useState } from "react";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setDevLink(null);

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as { error?: string; sent?: boolean; devLink?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Не удалось отправить ссылку.");
      return;
    }

    setMessage(
      data.sent
        ? "Ссылка отправлена на почту."
        : "Resend не настроен, ссылка для входа показана ниже.",
    );
    setDevLink(data.devLink ?? null);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold">Email родителя</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-toy-ink/15 bg-white px-4 py-3 outline-none focus:border-toy-accent"
          placeholder="parent@example.com"
        />
      </label>
      <button
        disabled={loading}
        className="w-full rounded-full bg-toy-accent px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Отправляем..." : "Получить ссылку для входа"}
      </button>
      {message ? <p className="text-sm text-toy-ink/70">{message}</p> : null}
      {devLink ? (
        <a href={devLink} className="block break-all text-sm font-semibold text-toy-accent">
          Войти по локальной ссылке
        </a>
      ) : null}
    </form>
  );
}
