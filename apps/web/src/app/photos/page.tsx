import Link from "next/link";
import { listFeedForUser, listToysForUser } from "@toyverse/core";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Photo = { url: string; href: string; alt: string };

export default async function PhotosPage() {
  const session = await requirePageSession();
  const [toys, feed] = await Promise.all([
    listToysForUser(session.user.id),
    listFeedForUser(session.user.id, { limit: 50 }),
  ]);

  const photos: Photo[] = [];
  const seen = new Set<string>();

  function add(url: string | null | undefined, href: string, alt: string) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    photos.push({ url, href, alt });
  }

  for (const toy of toys) {
    add(toy.processedImageUrl ?? toy.originalPhotoUrl, `/toys/${toy.id}`, toy.fullName);
  }
  for (const post of feed.items) {
    for (const url of post.mediaUrls) {
      add(url, `/toys/${post.authorToy.id}`, post.authorToy.fullName);
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Фотографии</h1>
        <p className="text-sm text-toy-ink/70">Все снимки игрушек вашей семьи.</p>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-toy-ink/20 bg-white p-6 text-sm text-toy-ink/70">
          Пока нет фотографий. Добавьте игрушку, чтобы они здесь появились.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <Link
              key={photo.url}
              href={photo.href}
              className="group overflow-hidden rounded-xl border border-toy-ink/10 bg-white"
            >
              <img
                src={photo.url}
                alt={photo.alt}
                className="aspect-square w-full object-cover transition group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
