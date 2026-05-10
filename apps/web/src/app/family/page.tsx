import { requirePageSession } from "@/lib/session";
import { FamilyDangerZone } from "@/components/FamilyDangerZone";

export const dynamic = "force-dynamic";

export default async function FamilyPage() {
  await requirePageSession();
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Семья</h1>
        <p className="text-sm leading-6 text-toy-ink/70">
          Скачайте все данные семьи или удалите их по требованию.
        </p>
      </div>
      <FamilyDangerZone />
    </section>
  );
}
