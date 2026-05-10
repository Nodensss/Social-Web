import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToyVerse — соцсеть для игрушек",
  description: "Семейная соцсеть, где главные герои — ваши игрушки.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="sticky top-0 z-10 border-b border-toy-ink/10 bg-white/70 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              🧸 ToyVerse
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-toy-accent">
                Лента
              </Link>
              <Link href="/toys" className="hover:text-toy-accent">
                Игрушки
              </Link>
              <Link href="/family" className="hover:text-toy-accent">
                Семья
              </Link>
              <Link
                href="/toys/new"
                className="rounded-full bg-toy-accent px-3 py-1.5 text-white hover:opacity-90"
              >
                + Добавить
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
