"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string };

const ITEMS: NavItem[] = [
  { href: "/toys", label: "Моя страница", icon: "🏠" },
  { href: "/", label: "Лента", icon: "📰" },
  { href: "/friends", label: "Друзья", icon: "👫" },
  { href: "/photos", label: "Фотографии", icon: "🖼" },
  { href: "/family", label: "Семья", icon: "👪" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Десктоп: колонка слева */}
      <aside className="hidden md:block">
        <div className="sticky top-6 space-y-1">
          <Link href="/" className="mb-4 block px-3 text-xl font-extrabold tracking-tight">
            🧸 ToyVerse
          </Link>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive(pathname, item.href)
                  ? "bg-toy-soft text-toy-ink"
                  : "text-toy-ink/70 hover:bg-toy-soft/60"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <Link
            href="/toys/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-toy-accent px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            ➕ Добавить игрушку
          </Link>
        </div>
      </aside>

      {/* Телефон: нижняя панель */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t border-toy-ink/10 bg-white/95 backdrop-blur md:hidden">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
              isActive(pathname, item.href) ? "text-toy-accent" : "text-toy-ink/60"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <Link
          href="/toys/new"
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-toy-accent"
        >
          <span className="text-lg">➕</span>
          Добавить
        </Link>
      </nav>
    </>
  );
}
