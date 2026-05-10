import { getToyForUser, listFriendsForToy, listToysForUser } from "@toyverse/core";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/session";
import { NewPostForm } from "@/components/NewPostForm";
import { FriendshipPanel } from "@/components/FriendshipPanel";
import { ToyEditor } from "./ToyEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function ToyPage({ params }: PageProps) {
  const session = await requirePageSession();
  const { id } = await params;
  const toy = await getToyForUser(session.user.id, id).catch(() => null);
  if (!toy) notFound();

  const [friends, allToys] = await Promise.all([
    listFriendsForToy(session.user.id, toy.id),
    listToysForUser(session.user.id),
  ]);
  const friendIds = new Set(friends.map((f) => f.friend.id));
  const candidates = allToys
    .filter((t) => t.id !== toy.id && t.status === "ready" && !friendIds.has(t.id))
    .map((t) => ({ id: t.id, fullName: t.fullName }));

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Моя игрушка</h1>
        <p className="text-sm leading-6 text-toy-ink/70">
          Проверьте карточку героя, поправьте детали и опубликуйте её в семейную ленту.
        </p>
      </div>
      <ToyEditor toy={toy} />
      {toy.status === "ready" && (
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold">Написать пост от лица героя</h2>
          <NewPostForm toyId={toy.id} />
        </div>
      )}
      {toy.status === "ready" && (
        <FriendshipPanel
          toyId={toy.id}
          friends={friends.map((f) => ({
            friendshipId: f.friendship.id,
            friend: { id: f.friend.id, fullName: f.friend.fullName },
          }))}
          candidates={candidates}
        />
      )}
    </section>
  );
}
