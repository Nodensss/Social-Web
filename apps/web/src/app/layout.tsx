import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "ToyVerse — соцсеть для игрушек",
  description: "Семейная соцсеть, где главные герои — ваши игрушки.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
          <Sidebar />
          <main className="min-w-0 pb-20 md:pb-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
