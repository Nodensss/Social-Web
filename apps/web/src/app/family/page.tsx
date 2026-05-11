import { requirePageSession } from "@/lib/session";
import { FamilyDangerZone } from "@/components/FamilyDangerZone";
import { FamilyInvitesPanel } from "@/components/FamilyInvitesPanel";
import { listFamilyInvites } from "@toyverse/core";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  const session = await requirePageSession();

  let initialInvites: Array<{ code: string; url: string }> = [];
  if (session.user.role === 'parent') {
    const invites = await listFamilyInvites(session.user.id);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    initialInvites = invites.filter(i => !i.usedAt).map(i => ({
      code: i.code,
      url: `${appUrl.replace(/\/$/, "")}/invite/${i.code}`
    }));
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Семья</h1>
        <p className="text-sm leading-6 text-toy-ink/70">
          Управляйте своей семьей, приглашайте близких или скачивайте данные.
        </p>
      </div>

      {session.user.role === 'parent' && (
        <FamilyInvitesPanel initialInvites={initialInvites} />
      )}

      <FamilyDangerZone />
    </section>
  );
}
