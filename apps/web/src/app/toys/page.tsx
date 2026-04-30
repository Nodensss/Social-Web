import Link from "next/link";
import { listToysForUser } from "@toyverse/core";
import { requirePageSession } from "@/lib/session";

function statusLabel(status: string) {
  if (status === "ready") return "готова";
  if (status === "failed") return "ошибка";
  return "в обработке";
}

export default async function ToysPage() {
  const session = await requirePageSession();
  const toys = await listToysForUser(session.user.id);

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Игрушки семьи</h1>
          <p className="text-sm text-toy-ink/70">
            Здесь живут герои, которых уже добавили в ToyVerse.
          </p>
        </div>
        <Link
          href="/toys/new"
          className="shrink-0 rounded-full bg-toy-accent px-4 py-2 text-sm font-bold text-white"
        >
          Добавить
        </Link>
      </div>

      {toys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-toy-ink/20 bg-white p-6 text-sm text-toy-ink/70">
          Пока нет игрушек. Загрузите первое фото, и очередь соберёт карточку героя.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {toys.map((toy) => (
            <Link
              key={toy.id}
              href={`/toys/${toy.id}`}
              className="overflow-hidden rounded-2xl border border-toy-ink/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <img
                src={toy.processedImageUrl ?? toy.originalPhotoUrl}
                alt={toy.fullName}
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-1 p-4">
                <h2 className="font-extrabold">{toy.fullName}</h2>
                <p className="text-xs font-semibold uppercase tracking-wide text-toy-ink/50">
                  {statusLabel(toy.status)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
