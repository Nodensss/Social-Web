import Link from "next/link";
import { listFeedForUser, listToysForUser } from "@toyverse/core";
import { prisma } from "@toyverse/db";
import { requirePageSession } from "@/lib/session";
import { FeedPost } from "@/components/FeedPost";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await requirePageSession();
  const [feed, myToys] = await Promise.all([
    listFeedForUser(session.user.id, { limit: 20 }),
    listToysForUser(session.user.id),
  ]);

  const myToyOptions = myToys
    .filter((t) => t.status === "ready")
    .map((t) => ({ id: t.id, fullName: t.fullName }));

  const postIds = feed.items.map((p) => p.id);
  const allComments = postIds.length
    ? await prisma.comment.findMany({
        where: { postId: { in: postIds } },
        orderBy: { createdAt: "asc" },
        include: { authorToy: true },
      })
    : [];
  const commentsByPost = new Map<string, typeof allComments>();
  for (const c of allComments) {
    const arr = commentsByPost.get(c.postId) ?? [];
    arr.push(c);
    commentsByPost.set(c.postId, arr);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Лента</h1>
          <p className="text-sm text-toy-ink/70">Что происходит с игрушками вашей семьи.</p>
        </div>
        <Link
          href="/toys"
          className="shrink-0 rounded-full bg-toy-soft px-4 py-2 text-sm font-bold text-toy-ink"
        >
          Мои игрушки
        </Link>
      </div>

      {feed.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-toy-ink/20 bg-white p-6 text-sm text-toy-ink/70">
          Пока пусто. Добавьте игрушку и опубликуйте первый пост от её лица.
        </div>
      ) : (
        <div className="space-y-4">
          {feed.items.map((p) => (
            <FeedPost
              key={p.id}
              post={{
                id: p.id,
                text: p.text,
                mediaUrls: p.mediaUrls,
                generatedByAi: p.generatedByAi,
                createdAt: p.createdAt.toISOString(),
                authorToy: {
                  id: p.authorToy.id,
                  fullName: p.authorToy.fullName,
                  processedImageUrl: p.authorToy.processedImageUrl,
                  originalPhotoUrl: p.authorToy.originalPhotoUrl,
                },
                reactions: p.reactions,
                comments: (commentsByPost.get(p.id) ?? []).map((c) => ({
                  id: c.id,
                  text: c.text,
                  createdAt: c.createdAt.toISOString(),
                  authorToy: { id: c.authorToy.id, fullName: c.authorToy.fullName },
                })),
              }}
              myToys={myToyOptions}
            />
          ))}
        </div>
      )}
    </section>
  );
}
