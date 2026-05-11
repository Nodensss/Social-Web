import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AcceptInviteClient } from "./AcceptInviteClient";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const session = await getCurrentSession();

  if (!session) {
    const nextUrl = `/invite/${code}`;
    redirect(`/login?next=${encodeURIComponent(nextUrl)}`);
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-center mb-8">Приглашение в семью</h1>
      <AcceptInviteClient code={code} />
    </div>
  );
}
