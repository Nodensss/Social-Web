import { getToyForUser } from "@toyverse/core";
import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/session";
import { NewPostForm } from "@/components/NewPostForm";
import { ToyEditor } from "./ToyEditor";

type PageProps = { params: Promise<{ id: string }> };

export default async function ToyPage({ params }: PageProps) {
  const session = await requirePageSession();
  const { id } = await params;
  const toy = await getToyForUser(session.user.id, id).catch(() => null);
  if (!toy) notFound();

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
    </section>
  );
}
