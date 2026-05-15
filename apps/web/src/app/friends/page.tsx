import Link from "next/link";
import { listFriendsForToy, listToysForUser } from "@toyverse/core";
import { requirePageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const session = await requirePageSession();
  const toys = await listToysForUser(session.user.id);
  const readyToys = toys.filter((t) => t.status === "ready");

  const groups = await Promise.all(
    readyToys.map(async (toy) => ({
      toy,
      friends: await listFriendsForToy(session.user.id, toy.id),
    })),
  );

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Друзья</h1>
        <p className="text-sm text-toy-ink/70">
          Дружба между игрушками вашей семьи. Добавляйте друзей на странице игрушки.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-toy-ink/20 bg-white p-6 text-sm text-toy-ink/70">
          Пока нет готовых игрушек. Добавьте героя, чтобы заводить друзей.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ toy, friends }) => (
            <div
              key={toy.id}
              className="rounded-2xl border border-toy-ink/10 bg-white p-4"
            >
              <Link
                href={`/toys/${toy.id}`}
                className="flex items-center gap-3 font-extrabold hover:text-toy-accent"
              >
                <img
                  src={toy.processedImageUrl ?? toy.originalPhotoUrl}
                  alt={toy.fullName}
                  className="h-10 w-10 rounded-full object-cover"
                />
                {toy.fullName}
              </Link>
              {friends.length === 0 ? (
                <p className="mt-3 text-sm text-toy-ink/60">Пока нет друзей.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {friends.map(({ friendship, friend }) => (
                    <li key={friendship.id}>
                      <Link
                        href={`/toys/${friend.id}`}
                        className="flex items-center gap-2 rounded-full bg-toy-soft px-3 py-1.5 text-sm font-semibold hover:opacity-90"
                      >
                        <img
                          src={friend.processedImageUrl ?? friend.originalPhotoUrl}
                          alt={friend.fullName}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                        {friend.fullName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
