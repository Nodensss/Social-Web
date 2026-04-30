import Script from "next/script";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "./MagicLinkForm";
import { getCurrentSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/toys");

  const telegramUsername = process.env.TELEGRAM_BOT_USERNAME;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Вход в ToyVerse</h1>
        <p className="text-sm leading-6 text-toy-ink/70">
          Войдите как родитель, чтобы добавить игрушку и открыть семейную ленту.
        </p>
      </div>

      <div className="rounded-2xl border border-toy-ink/10 bg-white p-5 shadow-sm">
        <MagicLinkForm />
      </div>

      {telegramUsername ? (
        <div className="rounded-2xl border border-toy-ink/10 bg-white p-5 text-center shadow-sm">
          <p className="mb-3 text-sm font-semibold">Или войдите через Telegram</p>
          <Script
            src="https://telegram.org/js/telegram-widget.js?22"
            strategy="afterInteractive"
            data-telegram-login={telegramUsername}
            data-size="large"
            data-auth-url={`${appUrl.replace(/\/$/, "")}/api/auth/telegram`}
            data-request-access="write"
          />
        </div>
      ) : null}
    </section>
  );
}
