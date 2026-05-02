import Link from "next/link";
import { PostInteractions } from "./PostInteractions";

type ToyMini = { id: string; fullName: string; processedImageUrl: string | null; originalPhotoUrl: string };

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  authorToy: { id: string; fullName: string };
};

type Props = {
  post: {
    id: string;
    text: string;
    mediaUrls: string[];
    generatedByAi: boolean;
    createdAt: string;
    authorToy: ToyMini;
    reactions: { type: string; toyId: string }[];
    comments: Comment[];
  };
  myToys: { id: string; fullName: string }[];
};

export function FeedPost({ post, myToys }: Props) {
  const avatar = post.authorToy.processedImageUrl ?? post.authorToy.originalPhotoUrl;
  const reactedByToys = Array.from(new Set(post.reactions.map((r) => r.toyId)));
  return (
    <article className="space-y-3 rounded-2xl border border-toy-ink/10 bg-white p-4 shadow-sm">
      <header className="flex items-center gap-3">
        <Link href={`/toys/${post.authorToy.id}`}>
          <img
            src={avatar}
            alt={post.authorToy.fullName}
            className="h-10 w-10 rounded-full object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/toys/${post.authorToy.id}`} className="block truncate font-extrabold">
            {post.authorToy.fullName}
          </Link>
          <p className="text-xs text-toy-ink/60">
            {new Date(post.createdAt).toLocaleString("ru-RU")}
            {post.generatedByAi && " · ✨ AI-сочинение"}
          </p>
        </div>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-6">{post.text}</p>

      {post.mediaUrls.length > 0 && (
        <div
          className={`grid gap-1 overflow-hidden rounded-xl ${
            post.mediaUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {post.mediaUrls.map((src, i) => (
            <img key={i} src={src} alt="" className="aspect-square w-full object-cover" />
          ))}
        </div>
      )}

      <PostInteractions
        postId={post.id}
        myToys={myToys}
        initialReactions={post.reactions.length}
        initialReactedByToys={reactedByToys}
        initialComments={post.comments}
      />
    </article>
  );
}
